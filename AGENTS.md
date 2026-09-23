# AGENTS.md — AI 에이전트 작업 지침

이 저장소에서 작업하는 AI 에이전트가 따라야 할 지침입니다. 직접 동기화를 설정하는 사용자도 아래 절차를 참고할 수 있습니다.

## 언어 기준

- 사용자가 읽는 안내 문서, 화면 문구, CLI 도움말, 예시 스킬의 설명과 본문은 한국어로 작성합니다.
- 기본 스킬의 `description`과 본문도 한국어로 작성해 사용자가 내려받은 지침을 직접 읽고 수정할 수 있게 합니다.
- 코드 식별자, 파일명, 명령어, 환경변수, API 필드, 스킬의 `name` 값은 영문 표기를 유지합니다. 외부 서비스의 실제 항목 이름은 필요하면 한국어 설명을 붙입니다.
- 검증·배포 기록은 확인한 날짜와 당시 상태를 명시합니다. 번역하면서 미검증 사항을 확인된 사실로 바꾸지 않습니다.

## 동기화 설정

설정은 **환경변수로만** 관리합니다. 로컬에서는 `.env`를 사용합니다. 이 저장소에는 예약 실행 워크플로가 없습니다. `bun run setup`은 로컬 설정 순서만 안내하며, `bun run sync`는 대상 저장소에 실제로 변경 사항을 게시합니다. 별도 설정 파일을 만들지 않습니다.

기존 `config.json`은 더 이상 읽지 않습니다. 다만 파일의 존재와 설정 항목은 검사합니다. 아직 대체 환경변수가 설정되지 않은 항목이 있으면 해당 변수 이름을 안내하고 실패합니다. 이전 배포 환경이 무시된 설정으로 조용히 실행되는 일을 막기 위한 동작입니다.

새 환경은 다음 순서로 설정합니다.

> **사용자에게 결과를 안내할 때:** 생성하거나 설정한 항목은 원시 ID 대신 **URL**로 보여 주세요. 예를 들어 `https://notion.so/workspace/abc123`, `https://github.com/my-org/my-skills`처럼 사용자가 알아보고 열어 확인할 수 있는 주소를 사용합니다. 실제 설정값에는 내부적으로 ID를 사용합니다.

### 1. Notion API 접근 준비

먼저 대상 Notion 환경에서 `ntn` CLI가 **사용자 소유의 개인용 액세스 토큰**으로 인증되었는지 확인합니다. `/v1/users/me` 응답에서 봇의 소유자 유형이 `workspace`가 아닌 `user`여야 합니다. 설정 과정에서는 `ntn`으로 표준 Notion Public API를 호출해 다음 작업을 수행합니다.

- 필요한 경우 스킬 유형의 데이터베이스 생성.
- 데이터베이스 ID로 데이터 소스 ID 조회.
- 스킬 조회와 수정.

`ntn`이 없으면 아래 방법으로 설치하거나 실행합니다. 이 설정 과정에 Notion MCP 연결은 필요하지 않습니다.

### 2. 스킬 데이터베이스 생성 또는 기존 데이터베이스 사용

> **ntn CLI 설치:** 아직 설치되지 않았다면 다음 명령을 사용합니다.
>
> ```bash
> curl -fsSL https://ntn.dev | bash
> ```
>
> `ntn`을 `/usr/local/bin`에 설치합니다. 영구 설치 없이 실행하려면 `npx --yes ntn <command>`를 사용할 수 있습니다.

**기본 방법: 새 스킬 데이터베이스 생성**

처음 설정할 때 권장하는 방법입니다. 표준 Notion API의 `POST /v1/databases`에 `database_type: skills`를 지정합니다. 운영 환경에서 Notion MCP 전용으로 사용하는 `/v1/tools/run`은 호출하지 않습니다.

```json
{
  "parent": { "type": "page_id", "page_id": "<parent-page-id>" },
  "database_type": "skills",
  "title": [{ "type": "text", "text": { "content": "스킬" } }]
}
```

이 요청은 공식 Notion 스킬 구조인 `Skill name`, `Description`, `Files`, `Tags`, `Created by` 속성을 갖춘 데이터베이스를 만듭니다.

동기화에는 이 유형의 기본 구조만 있으면 됩니다. Notion Skills Public API가 해당 구조를 직접 제공하므로 **`Published`나 `Plugins` 속성을 추가하지 않습니다.** API에는 행별 게시 여부가 없습니다. 연결의 접근 권한이 게시 범위를 정하며, 플러그인 묶음도 API가 알려 줍니다. 추가 속성을 만들어도 동기화에서 읽지 않습니다.

`SKILL.md` 외에 파일이 필요한 스킬은 기본 **Files** 속성을 사용합니다. 첨부 파일은 생성된 `SKILL.md`와 함께 전달됩니다. 스크립트나 참고 자료처럼 중첩 폴더가 필요하면 `.zip` 파일 하나로 첨부합니다. 동기화 시 해당 위치에 압축을 풉니다. `SKILL.md`는 항상 Notion에서 가져옵니다.

데이터베이스를 만든 뒤 공유 설정에서 **Everyone in workspace can view**를 선택해 워크스페이스 구성원이 스킬을 볼 수 있게 합니다.

생성 응답의 `data_sources` 배열에서 데이터 소스 ID를 찾아 `SKILLS_DATA_SOURCE_ID`로 저장합니다.

**대안: 기존 데이터베이스 사용**

이미 스킬 데이터베이스가 있다면 사용자에게 데이터베이스 URL 또는 **데이터베이스 ID**를 받습니다. 데이터 소스 ID와 구분해야 합니다. 데이터베이스 ID는 다음과 같은 Notion URL에서 찾을 수 있습니다.

`https://notion.so/workspace/<database-id>?v=...`

`ntn` CLI로 데이터 소스 ID를 조회합니다. 아래 예시의 `dev`는 실제 대상 환경에 맞춥니다.

```bash
npx --yes ntn datasources resolve <database-id> --env dev --json
```

응답에 포함된 데이터 소스 중 적절한 항목을 `SKILLS_DATA_SOURCE_ID`로 사용합니다.

### 3. 예시 스킬 추가

사용자가 시작하기 쉽도록 일반적인 지식 업무 중심의 예시를 추가합니다.

1. **회의록 정리:** 핵심 결정, 실행할 일, 후속 조치를 구분해 회의록 작성.
2. **문서 검토:** 명확성, 빠진 정보, 일관성을 검토하고 개선안 제시.
3. **자료 요약:** 여러 출처를 종합해 핵심 내용과 활용할 점 정리.
4. **이메일 작성:** 목적에 맞는 말투, 구성, 요청을 담은 이메일 작성.
5. **프로젝트 계획:** 단계, 주요 일정, 작업, 의존 관계, 위험 정리.

각 스킬의 `Skill name`, `Description`, 본문을 채웁니다. 동기화 연결이 읽을 수 있는 스킬은 모두 게시되며, 행별 게시 체크박스는 없습니다. 워크스페이스의 플러그인마다 이름을 바탕으로 `plugins/` 아래에 디렉터리를 만듭니다. 예를 들어 Finance 플러그인의 스킬은 `plugins/finance/skills/<skill>/`에 들어갑니다.

### 4. 대상 GitHub 저장소 선택 또는 생성

동기화 도구는 스킬을 GitHub 저장소에 게시합니다. 새 저장소를 만들거나 기존 저장소를 사용할 수 있습니다.

**방법 A: 새 GitHub 저장소 생성**

처음 설정할 때 권장하는 방법입니다. GitHub CLI로 스킬 마켓플레이스용 비공개 저장소를 만듭니다.

```bash
gh repo create <owner>/<repo-name> --private --description "Skills marketplace synced from Notion"
```

예시:

```bash
gh repo create my-org/notion-skills --private --description "Skills marketplace synced from Notion"
```

스킬을 받을 대상 저장소에 최초 커밋이 필요합니다. 해당 저장소의 생성·커밋·푸시가 허용된 경우 아래 순서로 초기화합니다.

```bash
cd <local-clone-path>
git clone https://github.com/<owner>/<repo-name>.git .
git commit --allow-empty -m "Initial commit"
git push origin main
```

완료 후 `my-org/notion-skills` 같은 `owner/repo` 값을 `GITHUB_REPO`로 사용합니다.

**방법 B: 기존 GitHub 저장소 사용**

스킬을 동기화할 기존 저장소가 있다면 `owner/repo` 값을 사용합니다. 대상 저장소에 쓸 권한이 있어야 합니다.

예를 들어 저장소 URL이 `https://github.com/my-org/my-skills`라면 `GITHUB_REPO=my-org/my-skills`로 설정합니다.

### 5. .env 설정

```bash
cat >> .env <<'EOF'
NOTION_API_TOKEN=<token-with-read-access>
NOTION_ENV=prod
GITHUB_REPO=<owner/repo>
GITHUB_BRANCH=main
SKILLS_DATA_SOURCE_ID=<data-source-id>
EOF
```

필수값은 `NOTION_API_TOKEN`과 `GITHUB_REPO`입니다. 나머지는 기본값이 있으며, 전체 설정은 [환경변수 예시](./.env.example)를 참고하세요. 데이터 소스 ID는 스킬 조회에 사용하지 않고 각 플러그인 표시 파일에 Notion 원본 참조로 기록합니다.

설정 과정에서 GitHub Actions를 다시 만들거나 워크플로 비밀값을 등록하거나 이 저장소를 푸시하지 않습니다. 기존 예약 실행 워크플로는 의도적으로 제거했습니다.

### 6. API에서 스킬이 보이는지 확인

동기화는 `NOTION_API_TOKEN`과 `Notion-Version: 2026-03-11`을 사용해 `GET /v1/ai/plugins`를 읽습니다. 결과는 다음 두 조건에 따라 달라집니다.

- 데이터베이스가 `database_type: skills`인 **스킬 유형**이어야 합니다. 기존 일반 데이터베이스는 Notion 화면에서 `Turn into → Skills DB`로 변환합니다. 일반 데이터베이스는 스킬이 0개로 표시됩니다.
- Notion 연결에 해당 스킬의 **읽기 권한**이 있어야 합니다. 이 접근 권한이 게시 범위이며, `Published` 체크박스는 사용하지 않습니다.

다음과 같이 확인합니다.

```bash
NOTION_API_TOKEN=<token> bun run dry-run
```

`403 restricted_resource`는 토큰에 **Read content** 권한이 없다는 뜻입니다. 예상한 플러그인이 없다면 연결이 대상 스킬 데이터베이스를 읽을 수 있는지 확인합니다. `Tags` 값마다 플러그인이 만들어지고, 태그가 없는 스킬은 단독 플러그인이 됩니다. 압축 파일에는 최대 100개 스킬이 포함됩니다. 초과하면 최근 수정된 스킬부터 포함됩니다.

더 이상 보이지 않는 플러그인을 정리하기 전에 목록의 마지막 페이지까지 조회합니다. 조회에 실패했거나 목록이 불완전하면 기존 플러그인 디렉터리를 삭제하지 않습니다.

## 자주 쓰는 명령

### 변경 사항 미리 확인

```bash
bun run dry-run
```

### 실제 동기화

```bash
bun run sync
```

### 타입 검사

```bash
bunx tsc --noEmit
```

### 테스트

```bash
bun test
```

### 도구 업데이트 가져오기

```bash
bun run update
```

`upstream`의 변경 사항을 병합하며 로컬 `.env` 설정은 유지합니다.
