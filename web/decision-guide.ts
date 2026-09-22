import { parse } from "yaml";

export interface DecisionQuestion {
  label: string;
  question: string;
  criterion: string;
  ifUnknown: string;
}

export interface DecisionGuide {
  questions: DecisionQuestion[];
  output: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Authored reference files feed the UI, composed request, and downloaded skill.
export function parseDecisionGuide(source: string): DecisionGuide {
  const value: unknown = parse(source);
  if (!isRecord(value) || !Array.isArray(value.questions) || !value.questions.length ||
      !Array.isArray(value.output) || !value.output.length || !value.output.every(isText)) {
    throw new Error("A decision guide needs questions and an output format.");
  }
  const questions = value.questions.map((item: unknown): DecisionQuestion => {
    if (!isRecord(item) || !isText(item.label) || !isText(item.question) ||
        !isText(item.criterion) || !isText(item.ifUnknown)) {
      throw new Error("Each decision question needs a label, question, criterion, and unknown handling.");
    }
    return { label: item.label, question: item.question, criterion: item.criterion, ifUnknown: item.ifUnknown };
  });
  return { questions, output: value.output };
}

export function decisionGuideInstructions(guide: DecisionGuide): string {
  return [
    "## 판단 질문과 기준",
    ...guide.questions.map((item) => `### ${item.label}\n질문: ${item.question}\n판단 기준: ${item.criterion}\n정보가 부족할 때: ${item.ifUnknown}`),
    "## Notion에 정리할 결과",
    guide.output.map((item) => `- ${item}`).join("\n"),
  ].join("\n\n");
}
