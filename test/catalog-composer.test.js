import { describe, expect, test } from "bun:test";
import { catalog } from "../web/catalog.ts";
import { composeRequest } from "../public/catalog.js";

describe("requests prepared for the user's AI", () => {
  for (const skill of catalog) {
    test(`${skill.id}: source, conditions, and complete criteria survive composition`, () => {
      const inputs = skill.inputs.map((input) => ({ label: input.label, value: input.sample }));
      const prompt = composeRequest({ title: skill.title, instructions: skill.instructions, source: "paste", inputs, criteria: "Show unresolved deadlines first." });
      for (const input of inputs) expect(prompt).toContain(input.value);
      for (const item of skill.decisionGuide.questions) {
        expect(prompt).toContain(item.question);
        expect(prompt).toContain(item.criterion);
        expect(prompt).toContain(item.ifUnknown);
      }
      for (const item of skill.decisionGuide.output) expect(prompt).toContain(item);
      expect(prompt).toContain("Show unresolved deadlines first.");
      expect(prompt).not.toContain("references/decision-guide.yaml");
      expect(prompt.indexOf(inputs[1].value)).toBeLessThan(prompt.indexOf("## 작업 자료"));
      expect(prompt.indexOf(inputs[0].value)).toBeGreaterThan(prompt.indexOf("## 작업 자료"));
    });

    test(`${skill.id}: current-page mode excludes hidden pasted content`, () => {
      const prompt = composeRequest({ title: skill.title, instructions: skill.instructions, source: "notion-page", inputs: skill.inputs.map((input, index) => ({ label: input.label, value: index === 0 ? "PRIVATE HIDDEN DRAFT" : input.sample })) });
      expect(prompt).not.toContain("PRIVATE HIDDEN DRAFT");
      expect(prompt).toContain("현재 대화에 연결된 Notion 페이지");
      expect(prompt).toContain(skill.inputs[1].sample);
      expect(prompt).toContain("필요한 내용을 읽을 수 없으면");
    });
  }

  const base = { title: "Review", instructions: "Preserve source evidence.", inputs: [{ label: "Material", value: " " }], source: "paste" };
  test("pasted material is required, but current-page mode can use an empty form", () => {
    expect(() => composeRequest(base)).toThrow("Source material is required");
    expect(composeRequest({ ...base, source: "notion-page" })).toContain("현재 대화에 연결된 Notion 페이지");
    expect(() => composeRequest({ ...base, source: "unknown" })).toThrow("Unknown material source");
    expect(() => composeRequest({ ...base, inputs: [] })).toThrow();
  });

  test("empty optional conditions do not become assertions about missing facts", () => {
    const prompt = composeRequest({ ...base, inputs: [{ label: "Material", value: "source" }, { label: "Deadline", value: "  " }], criteria: "  " });
    expect(prompt).not.toContain("Deadline:");
    expect(prompt).not.toContain("## 이번 작업의 추가 판단 기준");
    expect(prompt).not.toContain("별도 조건 없음");
  });
});
