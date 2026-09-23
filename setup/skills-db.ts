import { loggedExec } from "./exec.ts";
import type { SetupLogger } from "./logger.ts";
import { ntnApiArgs } from "./ntn-cli.ts";
import { zipSkillFiles } from "../src/notion/archive.ts";
import { slugify } from "../src/sync/slugify.ts";

/**
 * Shared Notion Skills DB creation: schema + sample skills.
 * Used by both the interactive setup (resources phase) and the non-interactive
 * `--ci` runner so the flows can't drift apart.
 */

export const SKILLS_DB_DEFAULT_NAME = "스킬";

interface SampleSkill {
  name: string;
  description: string;
  body: string;
  /**
   * Extra files bundled with the skill (path at zip root -> content). Zipped
   * and attached to the page's Files property, so the sample set demonstrates
   * the file/zip flow end to end — the sync unpacks them into the skill dir.
   */
  files?: Record<string, string | Uint8Array>;
}

// A 320x80 indigo-gradient PNG banner (generated, 503 bytes) — gives the
// Meeting Notes sample a binary asset so the zip flow demonstrably carries
// more than text.
const NOTES_HEADER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAABQCAIAAADnUzvSAAABvklEQVR42u3TV1IaABgGwP90osaGYAFM78X03quJyTlFREFR8Tnn+GZ2Zq+wtTyzB4SqlZk9IFQ1G3tAqGo2+kCoWm30gVDVavSBUNWe7QOhqj27D4Sqtdl9IFStz+0DoWpjbh8IJTAkB96cGwChqjM/AEJVd34AhBIYkgP35gdAqNq6dACEqsuXDoBQAkNy4CsLB0CourowBELVtYUhEEpgSA58fXEIhKobi0MgVN1cPARC1a2lQyCUwJAc+PbSIRCq7iwdAqHq7vIREEpgSA58b/kICFX3l4+AUPVgZQSEEhiSAz9cGQGh6lFzBISq7eYICFXbzTEQqh43x0CoerI6BkLV09UxEEpgSA78rHUMhKrnrWMgVL1oHQOhBIbkwC/bJ0CoetU+AULV6/YJEEpgSA78Zu0ECFVv1yZAqHq3NgFC1fv1CRBKYEgO/GF9AoSqj+unQKj6tHEKhBIYkgN/3jgFQtWXzTMgVH3dPANCCQzJgb9tngGh6nvnDAhVPzrnQCiBITnwz845EKp+dc+BULXTPQdC1U53CoSq370pEKr+9KZAqNrtTYFQtdu7AELV360LIFT927oAQv0HSjQHyiVQWQAAAAAASUVORK5CYII=",
  "base64",
);

const SAMPLE_SKILLS: SampleSkill[] = [
  {
    name: "회의록 정리",
    description:
      "회의록을 구조화하고 요약하여 핵심 결정사항, 실행 과제, 후속 조치를 포착합니다.",
    body: `# 회의록 정리

사용자가 구조적이고 실행 가능한 회의록을 작성하도록 돕습니다.

## 사용할 때
회의, 짧은 업무 공유, 통화에서 결정이나 할 일이 생겼을 때 사용합니다.

## 정리할 내용
- 참석자 — 회의에 참여한 사람.
- 핵심 결정 — 합의한 내용.
- 할 일 — 누가 무엇을 언제까지 할지.
- 미결 사항 — 후속 확인이 필요한 내용.
- 다음 단계 — 다시 논의할 시점.

## 함께 제공하는 파일
스킬 디렉터리에 다음 보조 파일이 포함됩니다.
- scripts/extract_action_items.py — 저장한 회의록에서 미완료 할 일을 모읍니다. 실행 예시: python3 scripts/extract_action_items.py notes/*.md
- assets/notes-header.png — 팀 외부에 공유할 회의록 맨 위에 넣는 기본 배너입니다.

## 작성 방식
훑어보기 쉽게 문단보다 불릿을 사용합니다. 담당자를 굵게 표시하고 할 일을 Markdown 체크박스("- [ ] **담당자** — 할 일")로 작성하면 함께 제공하는 스크립트가 찾아 모을 수 있습니다. 날짜를 기록합니다.`,
    files: {
      "scripts/extract_action_items.py": `#!/usr/bin/env python3
"""Collect open action items from meeting-notes markdown files.

Usage: python3 extract_action_items.py notes/*.md
Prints every unchecked "- [ ] ..." line with the file it came from, so
follow-ups scattered across many meetings end up in one list.
"""
import re
import sys

OPEN_ITEM = re.compile(r"^\\s*-\\s*\\[ \\]\\s*(.+)$")


def main(paths):
    found = 0
    for path in paths:
        with open(path, encoding="utf-8") as f:
            for line in f:
                match = OPEN_ITEM.match(line)
                if match:
                    print(f"{path}: {match.group(1).strip()}")
                    found += 1
    print(f"\\n{found} open action item(s)", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: extract_action_items.py <notes.md> [notes2.md ...]")
    main(sys.argv[1:])
`,
      "assets/notes-header.png": NOTES_HEADER_PNG,
    },
  },
  {
    name: "문서 검토",
    description:
      "문서의 명확성, 완전성, 일관성을 검토하고 개선안을 제안하며 잠재적 문제를 표시합니다.",
    body: `# 문서 검토

문서를 읽고 명확성, 빠진 정보, 일관성에 대한 의견을 정리합니다.

## 검토 순서
1. 의견을 적기 전에 문서 전체를 읽습니다.
2. 문제를 영향에 따라 나눕니다. 이해를 막는 문제, 혼동을 주는 문제, 표현을 다듬을 부분을 구분합니다.
3. 명확하게 고치라는 막연한 의견 대신 구체적인 수정안을 제시합니다.

## 확인할 항목
- 명확성 — 처음 읽는 사람도 배경 설명 없이 이해할 수 있나요?
- 빠진 정보 — 논리의 빈틈이나 누락된 내용이 있나요?
- 일관성 — 용어, 말투, 형식이 문서 전체에서 일치하나요?
- 실행 가능성 — 독자가 다음에 무엇을 해야 하는지 알 수 있나요?`,
  },
];

/** Convert a markdown-lite skill body into Notion blocks (h1/h2, lists, paragraphs). */
export function bodyToBlocks(body: string): unknown[] {
  const blocks: unknown[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    let type = "paragraph";
    let text = line;
    if (line.startsWith("# ")) {
      type = "heading_1";
      text = line.slice(2);
    } else if (line.startsWith("## ")) {
      type = "heading_2";
      text = line.slice(3);
    } else if (line.startsWith("- ")) {
      type = "bulleted_list_item";
      text = line.slice(2);
    } else if (/^\d+\.\s/.test(line)) {
      type = "numbered_list_item";
      text = line.replace(/^\d+\.\s/, "");
    }

    blocks.push({
      object: "block",
      type,
      [type]: { rich_text: [{ type: "text", text: { content: text } }] },
    });
  }
  return blocks;
}

export interface CreatedSkillsDb {
  dataSourceId: string;
  databaseId: string;
  databaseUrl: string;
}

export type CreateSkillsDbResult =
  | { ok: true; db: CreatedSkillsDb }
  | { ok: false; error: string };

interface NotionApiErrorResponse {
  object?: string;
  status?: number;
  code?: string;
  message?: string;
}

/**
 * `ntn api` intentionally exits zero for a syntactically valid API response,
 * even if that response is a Notion error object. Turn that object into an
 * actionable setup error before attempting to parse it as a successful
 * database creation result.
 */
export function describeDatabaseCreationFailure(
  stdout: string,
  stderr: string,
): string | null {
  if (stderr.trim()) return stderr.trim();

  let error: NotionApiErrorResponse;
  try {
    error = JSON.parse(stdout) as NotionApiErrorResponse;
  } catch {
    return null;
  }

  if (error.object !== "error") return null;

  const summary = [
    error.status ? `Notion returned ${error.status}` : "Notion returned an error",
    error.code,
    error.message,
  ].filter(Boolean).join(" ");

  return summary || stdout.trim();
}

/** Build the normal Public API request for a typed Skills database. */
export function buildCreateSkillsDbRequest(
  opts: { dbName: string; parentPageId?: string },
): Record<string, unknown> {
  return {
    parent: opts.parentPageId
      ? { type: "page_id", page_id: opts.parentPageId }
      : { type: "workspace", workspace: true },
    database_type: "skills",
    title: [{ type: "text", text: { content: opts.dbName } }],
  };
}

/** Parse the structured response from POST /v1/databases. */
export function parseCreatedSkillsDb(
  stdout: string,
): CreatedSkillsDb | null {
  try {
    const db = JSON.parse(stdout) as {
      id?: unknown;
      url?: unknown;
      database_type?: unknown;
      data_sources?: Array<{ id?: unknown }>;
    };
    const dataSourceId = db.data_sources?.[0]?.id;
    if (
      db.database_type !== "skills" ||
      typeof db.id !== "string" ||
      typeof db.url !== "string" ||
      typeof dataSourceId !== "string"
    ) {
      return null;
    }
    return { databaseId: db.id, databaseUrl: db.url, dataSourceId };
  } catch {
    return null;
  }
}

/**
 * Create the Notion Skills DB the sync expects: a typed skills database
 * (`database_type: skills`) carrying Notion's canonical schema (Skill name /
 * Description / Files / Tags / Created by). Parent defaults to the workspace
 * top level; pass parentPageId to nest it.
 *
 * The sync reads skills through Notion's skills API, which projects that typed
 * schema directly — so there are no extra properties to bolt on. (This used to
 * add a `Published` checkbox and a `Plugins` select; both are gone. The API has
 * no per-row publish flag — what syncs is what the Notion connection can read —
 * and it reports a single workspace plugin rather than per-skill grouping.)
 */
export async function createSkillsDb(
  logger: SetupLogger,
  step: string,
  notionEnv: string,
  opts: { dbName: string; parentPageId?: string },
): Promise<CreateSkillsDbResult> {
  const createResult = await loggedExec(
    logger, step, "ntn",
    ntnApiArgs(notionEnv, "POST", "/v1/databases"),
    {
      stdin: JSON.stringify(buildCreateSkillsDbRequest(opts)),
    },
  );

  if (createResult.code !== 0) {
    return { ok: false, error: createResult.stderr || createResult.stdout };
  }

  const apiError = describeDatabaseCreationFailure(
    createResult.stdout,
    createResult.stderr,
  );
  if (apiError) return { ok: false, error: apiError };

  const parsed = parseCreatedSkillsDb(createResult.stdout);
  if (!parsed) {
    return {
      ok: false,
      error: `Could not parse the typed Skills database response: ${createResult.stdout.slice(0, 300)}`,
    };
  }
  return { ok: true, db: parsed };
}

interface SkillsPropertyKeys {
  skillName: string;
  description: string;
  files: string;
}

const DEFAULT_SKILLS_PROPERTY_KEYS: SkillsPropertyKeys = {
  skillName: "Skill name",
  description: "Description",
  files: "Files",
};

/**
 * Resolve typed property IDs from a data source response. Typed schemas use
 * the token owner's locale for their display names, while property IDs are
 * stable and can always be supplied when creating pages.
 */
export function getSkillsPropertyKeys(stdout: string): SkillsPropertyKeys {
  try {
    const dataSource = JSON.parse(stdout) as {
      properties?: Record<string, { id?: unknown; type?: unknown }>;
    };
    const keys = { ...DEFAULT_SKILLS_PROPERTY_KEYS };
    for (const property of Object.values(dataSource.properties ?? {})) {
      if (typeof property.id !== "string") continue;
      if (property.type === "title") keys.skillName = property.id;
      if (property.type === "rich_text") keys.description = property.id;
      if (property.type === "files") keys.files = property.id;
    }
    return keys;
  } catch {
    return { ...DEFAULT_SKILLS_PROPERTY_KEYS };
  }
}

/**
 * Zip a sample skill's bundled files and upload them to Notion. Returns the
 * Files property value referencing the upload, or null if the upload failed
 * (the skill is still usable without its extras).
 */
async function uploadSkillFilesZip(
  logger: SetupLogger,
  step: string,
  notionEnv: string,
  skill: SampleSkill,
): Promise<Record<string, unknown> | null> {
  if (!skill.files) return null;
  const zipName = `${slugify(skill.name) || "skill"}.zip`;
  const uploadResult = await loggedExec(logger, step, "ntn", [
    "--env", notionEnv,
    "files", "create",
    "--filename", zipName,
    "--content-type", "application/zip",
    "--json",
  ], { stdin: zipSkillFiles(skill.files) });
  if (uploadResult.code !== 0) return null;
  try {
    const upload = JSON.parse(uploadResult.stdout) as { id?: string };
    if (!upload.id) return null;
    return {
      files: [{ type: "file_upload", name: zipName, file_upload: { id: upload.id } }],
    };
  } catch {
    return null;
  }
}

/** Populate the DB with sample skills. Returns created/total counts. */
export async function populateSampleSkills(
  logger: SetupLogger,
  step: string,
  notionEnv: string,
  dataSourceId: string,
): Promise<{ created: number; total: number; zipsAttached: number; zipsTotal: number }> {
  let created = 0;
  let zipsAttached = 0;
  const zipsTotal = SAMPLE_SKILLS.filter((s) => s.files).length;
  const dataSourceResult = await loggedExec(
    logger, step, "ntn",
    ntnApiArgs(notionEnv, "GET", `/v1/data_sources/${dataSourceId}`),
  );
  const propertyKeys = getSkillsPropertyKeys(dataSourceResult.stdout);
  for (const skill of SAMPLE_SKILLS) {
    // Upload the bundled files (if any) first, so the page can be created with
    // the zip already attached to its Files property.
    const filesValue = await uploadSkillFilesZip(logger, step, notionEnv, skill);
    const pageResult = await loggedExec(
      logger, step, "ntn",
      ntnApiArgs(notionEnv, "POST", "/v1/pages"),
      {
        stdin: JSON.stringify({
          parent: { data_source_id: dataSourceId },
          properties: {
            [propertyKeys.skillName]: { title: [{ text: { content: skill.name } }] },
            [propertyKeys.description]: {
              rich_text: [{ text: { content: skill.description } }],
            },
            ...(filesValue ? { [propertyKeys.files]: filesValue } : {}),
          },
          children: bodyToBlocks(skill.body),
        }),
      },
    );
    if (pageResult.code === 0) {
      created++;
      if (filesValue) zipsAttached++;
    }
  }
  return { created, total: SAMPLE_SKILLS.length, zipsAttached, zipsTotal };
}

/**
 * Probe whether `token` can read the given data source — used to poll for the
 * "connect the integration to the Notion Skills DB" manual step completing.
 *
 * Deliberately probes the data source rather than the Skills API the sync
 * actually uses: this checks exactly the thing the user was just asked to do
 * (attach the connection). A successful `/v1/ai/plugins` response alone cannot
 * prove access to this particular database: inaccessible skills are omitted.
 * The later dry-run verifies the complete plugin publication flow.
 */
export async function tokenCanReadDataSource(
  logger: SetupLogger,
  step: string,
  notionEnv: string,
  token: string,
  dataSourceId: string,
): Promise<boolean> {
  const result = await loggedExec(
    logger, step, "ntn",
    ntnApiArgs(notionEnv, "GET", `/v1/data_sources/${dataSourceId}`),
    { env: { NOTION_API_TOKEN: token } },
  );
  return result.code === 0;
}
