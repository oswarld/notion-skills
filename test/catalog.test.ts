import { describe, expect, test } from "bun:test";
import { strFromU8, unzipSync } from "fflate";
import { parse } from "yaml";
import { createWebApp } from "../web/app.ts";
import { audiences, catalog, filterSkills } from "../web/catalog.ts";
import { parseDecisionGuide } from "../web/decision-guide.ts";
import { skillPage } from "../web/catalog-views.ts";

const app = createWebApp(null, { fetch: async () => { throw new Error("The public catalog must not call Notion."); } });
const request = (path: string, method = "GET") => app(new Request(`https://skills.example.com${path}`, { method }));

describe("public starter skills", () => {
  test("supports every intended audience with independently usable skills", () => {
    expect(new Set(catalog.map((skill) => skill.id)).size).toBe(catalog.length);
    for (const audience of Object.keys(audiences)) expect(filterSkills("", audience).length).toBeGreaterThanOrEqual(5);
    for (const skill of catalog) {
      const frontmatter = parse(skill.markdown.split("---")[1]!) as { name: string; description: string };
      expect(frontmatter.name).toBe(skill.id);
      expect(frontmatter.description.length).toBeGreaterThan(20);
      expect(frontmatter.description).toMatch(/[가-힣]/);
      expect(skill.markdown).toContain(`# ${skill.title}`);
      expect(skill.instructions).not.toContain("[TODO");
      expect(skill.inputs.every((input) => input.sample.trim() && input.label.trim())).toBe(true);
      expect(skill.markdown).toContain("references/decision-guide.yaml");
      expect(skill.decisionGuide.questions.length).toBeGreaterThan(0);
      expect(skill.standaloneMarkdown).not.toContain("references/decision-guide.yaml");
    }
  });

  test("search combines words, audience, category, and Korean Unicode normalization", () => {
    expect(filterSkills("회의록".normalize("NFD"), "office", "organize").map((skill) => skill.id)).toEqual(["meeting-notes"]);
    expect(filterSkills("콘텐츠 일정", "creator", "plan").map((skill) => skill.id)).toEqual(["content-calendar"]);
    expect(filterSkills("회의", "creator")).toEqual([]);
    expect(filterSkills("", "does-not-exist")).toEqual([]);
  });

  test("discovery and details work without OAuth and escape search input", async () => {
    const landing = await request("/");
    expect(landing.status).toBe(200);
    expect(await landing.text()).toContain('href="/catalog"');
    const search = await request("/catalog?q=" + encodeURIComponent('"><img src=x onerror=alert(1)>'));
    const body = await search.text();
    expect(search.status).toBe(200);
    expect(body).not.toContain("<img src=x");
    expect(body).toContain("&lt;img");
    expect(body).toContain("조건에 맞는 스킬이 없어요");
    for (const skill of catalog) {
      const response = await request(`/catalog/${skill.id}`);
      expect(response.status).toBe(200);
      const detail = await response.text();
      expect(detail).toContain(`href="/catalog/${skill.id}/download"`);
      expect(detail).not.toContain('<form');
      expect(detail).toContain('readonly');
      expect(detail).toContain('id="decision-context"');
      expect(detail).toContain('value="notion-page"');
      expect(detail).toContain('type="module" src="/catalog.js"');
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  test("downloads contain only the selected complete skill with matching frontmatter", async () => {
    for (const skill of catalog) {
      const response = await request(`/catalog/${skill.id}/download`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/zip");
      expect(response.headers.get("content-disposition")).toBe(`attachment; filename="${skill.id}.zip"`);
      const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
      const paths = [`${skill.id}/SKILL.md`, `${skill.id}/references/decision-guide.yaml`];
      expect(Object.keys(files)).toEqual(paths);
      expect(strFromU8(files[`${skill.id}/SKILL.md`]!)).toBe(skill.markdown);
      const reference = strFromU8(files[`${skill.id}/references/decision-guide.yaml`]!);
      expect(parseDecisionGuide(reference)).toEqual(skill.decisionGuide);
      for (const item of skill.decisionGuide.questions) {
        expect(skill.instructions).toContain(item.question);
        expect(skill.instructions).toContain(item.criterion);
        expect(skill.instructions).toContain(item.ifUnknown);
      }
      const standalone = await (await request(`/catalog/${skill.id}/source`)).text();
      expect(standalone).toBe(skill.standaloneMarkdown);
      expect(standalone).not.toContain("references/decision-guide.yaml");
    }
  });

  test("decision criteria remain visible without JavaScript and are escaped as text", async () => {
    const skill = catalog.find((item) => item.id === "meeting-notes")!;
    const detail = await (await request(`/catalog/${skill.id}`)).text();
    expect(detail).toContain('id="decision-context"');
    for (const question of skill.decisionGuide.questions) expect(detail).toContain(question.question);
    const hostile = '<img src=x onerror="alert(1)">';
    const rendered = skillPage({ ...skill, decisionGuide: {
      questions: [{ label: hostile, question: hostile, criterion: hostile, ifUnknown: hostile }],
      output: [hostile],
    } });
    expect(rendered).not.toContain(hostile);
    expect(rendered).toContain("&lt;img");
  });

  test("rejects incomplete decision guides instead of omitting unknown handling", () => {
    for (const source of ["", "null", "[]", "questions: []\noutput: [Summary]", "questions: [{label: Action, question: Is it agreed?, criterion: Explicit agreement}]\noutput: [Summary]", "questions: [{}]\noutput: [1]"]) {
      expect(() => parseDecisionGuide(source)).toThrow();
    }
  });

  test("rejects arbitrary filenames, unknown actions, and write requests", async () => {
    for (const path of ["/catalog/missing", "/catalog/meeting-notes/delete", "/catalog/%2e%2e%2f.env", "/catalog/meeting-notes/download/extra"]) {
      expect((await request(path)).status).toBe(404);
    }
    expect((await request("/catalog/meeting-notes", "POST")).status).toBe(405);
  });

  test("allows only the local composer script on detail pages, retaining OAuth restrictions", async () => {
    const detailPolicy = (await request("/catalog/meeting-notes")).headers.get("content-security-policy")!;
    expect(detailPolicy).toContain("script-src 'self'");
    expect(detailPolicy).toContain("connect-src 'none'");
    expect(detailPolicy).toContain("form-action 'none'");
    expect(detailPolicy).not.toContain("unsafe-inline");
    const authPolicy = (await request("/auth/notion")).headers.get("content-security-policy")!;
    expect(authPolicy).toContain("default-src 'none'");
    expect(authPolicy).not.toContain("script-src");
  });
});
