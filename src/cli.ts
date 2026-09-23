#!/usr/bin/env bun
import { loadConfig } from "./config.ts";
import { runMigrateConfig } from "./migrate-config.ts";
import { runSync } from "./sync/engine.ts";
import { runSetup } from "../setup/index.ts";
import { runUpdate } from "./update.ts";
import { buildSync } from "./wire.ts";

const HELP = `notion-skills-github-sync — Notion 워크스페이스의 스킬을 플러그인 마켓플레이스로 게시

사용법:
  notion-skills-sync setup            로컬 동기화 설정 순서 안내
  notion-skills-sync setup --ci       실제 Notion·GitHub 리소스로 통합 테스트
  notion-skills-sync sync             워크스페이스의 스킬을 대상 저장소에 동기화
  notion-skills-sync sync --dry-run   푸시하지 않고 변경할 내용 확인
  notion-skills-sync update           upstream 원격 저장소의 도구 업데이트 병합
  notion-skills-sync migrate-config   기존 config.json을 .env와 저장소 변수로 이전
  notion-skills-sync help             이 도움말 표시

기본 setup은 로컬 설정만 안내합니다. 파일을 수정하거나 외부 리소스를 만들거나
게시하지 않습니다. 고급 setup --ci 모드는 실제 Notion 스킬 데이터베이스를 만들고
GitHub 테스트 브랜치에 기록합니다.

설정 옵션:
  --ci                    질문 없이 환경변수의 토큰으로 통합 테스트 실행
  --env <env>             Notion 환경 (dev|stg|prod, 기본값: prod)
  --repo <owner/name>     스킬 저장소, CI 모드 전용 (생략하면 Git 원격 저장소에서 확인)
  --db-name <name>        Notion 스킬 데이터베이스 이름 (기본값: "스킬")
  --db-parent-page <id>   데이터베이스의 상위 페이지 ID (CI 모드 필수)

업데이트 옵션:
  --branch <name>         병합할 upstream 브랜치 (기본값: main)

이전 설정 마이그레이션 옵션:
  --repo <owner/name>     Actions 변수를 설정할 동기화 저장소
                          (기본값: origin 원격 저장소에서 확인)
  --env-only              저장소 변수는 건드리지 않고 .env에만 기록

설정은 환경변수에서 읽습니다. 로컬에서는 .env를 사용합니다.
이 저장소에는 예약 실행 워크플로가 없습니다. 전체 설정은 .env.example을 참고하세요.`;

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);

  switch (cmd) {
    case "setup":
    case "wizard": {
      // "wizard" is the legacy name for "setup"; kept as an undocumented alias.
      if (rest.includes("--migrate-config")) {
        // Without this guard the flag would fall through and silently launch
        // the full interactive wizard instead.
        throw new Error(
          "--migrate-config 옵션은 별도 명령으로 옮겨졌습니다. `notion-skills-sync migrate-config` " +
            "(bun run migrate-config)로 config.json을 .env와 저장소 변수에 복사하세요.",
        );
      }
      const ci = rest.includes("--ci") || rest.includes("--non-interactive");
      const testRun = rest.includes("--test-run");
      await runSetup({
        ci,
        testRun,
        notionEnv: flagValue(rest, "--env"),
        githubRepo: flagValue(rest, "--repo"),
        dbName: flagValue(rest, "--db-name"),
        parentPageId: flagValue(rest, "--db-parent-page"),
      });
      break;
    }
    case "sync": {
      const dryRun = rest.includes("--dry-run") || rest.includes("-n");
      const config = loadConfig();
      await runSync(buildSync(config, { dryRun }));
      break;
    }
    case "update": {
      runUpdate({ branch: flagValue(rest, "--branch") });
      break;
    }
    case "migrate-config": {
      runMigrateConfig({
        repo: flagValue(rest, "--repo"),
        envOnly: rest.includes("--env-only"),
      });
      break;
    }
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      break;
    default:
      console.error(`알 수 없는 명령: ${cmd}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
