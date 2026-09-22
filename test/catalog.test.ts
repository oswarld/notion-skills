import { describe, expect, test } from "bun:test";
import { strFromU8, unzipSync } from "fflate";
import { parse } from "yaml";
import { createWebApp } from "../web/app.ts";
import { audiences, catalog, filterSkills } from "../web/catalog.ts";

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
      expect(skill.instructions).not.toContain("[TODO");
      expect(skill.inputs.every((input) => input.sample.trim() && input.label.trim())).toBe(true);
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
      expect(Object.keys(files)).toEqual([`${skill.id}/SKILL.md`]);
      expect(strFromU8(files[`${skill.id}/SKILL.md`]!)).toBe(skill.markdown);
      expect(await (await request(`/catalog/${skill.id}/source`)).text()).toBe(skill.markdown);
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
