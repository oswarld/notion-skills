import { readFileSync } from "node:fs";
import { strToU8, zipSync } from "fflate";
import { skillDefinitions } from "./catalog-data.ts";

export const audiences = { office: "일반 직장인", creator: "1인 사업자·크리에이터", team: "팀 관리자" };
export const categories = { organize: "요약·정리", write: "글쓰기·소통", plan: "기획·실행", analyze: "분석·개선" };

export interface SkillDefinition {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  category: keyof typeof categories;
  audiences: (keyof typeof audiences)[];
  inputs: { label: string; hint: string; sample: string }[];
  example: string;
}

export interface CatalogSkill extends SkillDefinition {
  markdown: string;
  instructions: string;
}

// Only these authored IDs can resolve files; request paths never reach the filesystem.
export const catalog: CatalogSkill[] = skillDefinitions.map((skill) => {
  const markdown = readFileSync(new URL(`../skills/${skill.id}/SKILL.md`, import.meta.url), "utf8");
  return { ...skill, markdown, instructions: markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim() };
});

export function findSkill(id: string): CatalogSkill | undefined {
  return catalog.find((skill) => skill.id === id);
}

export function filterSkills(query = "", audience = "", category = ""): CatalogSkill[] {
  const terms = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return catalog.filter((skill) => {
    const text = [skill.id, skill.title, skill.summary, skill.outcome, categories[skill.category], ...skill.audiences.map((key) => audiences[key])].join(" ").normalize("NFKC").toLocaleLowerCase();
    return (!audience || skill.audiences.some((key) => key === audience)) && (!category || skill.category === category) && terms.every((term) => text.includes(term));
  });
}

export function skillArchive(skill: CatalogSkill): Uint8Array {
  return zipSync({ [`${skill.id}/SKILL.md`]: strToU8(skill.markdown) });
}
