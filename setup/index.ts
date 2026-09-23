import { runNonInteractive } from "./non-interactive.ts";

export interface SetupOptions {
  notionEnv?: string;
  ci?: boolean;
  /** Deprecated flag; rejected before any resources are created. */
  testRun?: boolean;
  // Non-interactive overrides
  githubRepo?: string;
  dbName?: string;
  parentPageId?: string;
}

/** Default setup is local guidance; it never recreates the retired Action. */
export async function runSetup(opts: SetupOptions = {}): Promise<void> {
  if (opts.testRun) {
    throw new Error("--test-run은 종료된 Actions 설정 마법사의 옵션입니다. 로컬 설정 후 bun run dry-run을 사용하세요.");
  }
  if (opts.ci) {
    await runNonInteractive(opts);
    return;
  }
  console.log(`Notion 스킬 로컬 동기화 설정

1. .env가 없을 때만 .env.example을 .env로 복사하세요.
2. 스킬 데이터베이스를 읽을 수 있는 Read content 권한의 연결 토큰을 NOTION_API_TOKEN에 설정하세요.
3. GITHUB_REPO에 대상 소유자/저장소를 설정하세요. GITHUB_BRANCH의 기본값은 main입니다.
4. 대상 저장소에 쓸 권한이 있는 GITHUB_TOKEN을 설정하거나 gh auth login으로 인증하세요.
5. bun run dry-run으로 변경할 내용을 확인하세요.
6. GitHub에 실제로 게시할 때만 bun run sync를 실행하세요.

이 명령은 데이터베이스 생성, .env 수정, 커밋·푸시, GitHub Actions 설정을 수행하지 않았습니다.
데이터베이스 설정 안내: AGENTS.md
전체 설정 예시: .env.example
Notion 연결 관리: https://app.notion.com/developers/connections

브라우저 기본 스킬은 이 동기화 설정 없이 bun run dev로 사용할 수 있습니다.
고급 통합 테스트인 setup --ci는 실제 Notion·GitHub 리소스를 생성합니다.`);
}
