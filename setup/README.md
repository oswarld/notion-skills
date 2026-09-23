# 로컬 동기화 설정

`bun run setup`은 `.env`를 설정하는 순서를 안내합니다. 파일 수정, 데이터베이스 생성, 커밋·푸시, GitHub Actions 설정은 수행하지 않습니다. 웹 카탈로그는 이 설정과 별개로 `bun run dev`로 실행할 수 있습니다.

설정 후 `bun run dry-run`으로 변경 내용을 확인하세요. 설정한 대상 저장소에 실제로 변경 사항을 게시할 때만 `bun run sync`를 실행합니다.

## 고급 통합 테스트

`bun run setup --ci --repo owner/name --db-parent-page <page-id>`는 실제 서비스와 연동하는 통합 테스트 명령입니다. 실제 스킬 유형의 데이터베이스와 예시 페이지를 만들고, 대상 저장소의 `setup-e2e-test` 브랜치에 기록합니다. 같은 동기화를 반복해도 추가 변경이 생기지 않는지도 확인합니다.

실제 리소스를 만들므로 생성 작업에 대한 명시적 승인과 전용 테스트 리소스가 필요합니다. GitHub Actions는 배포하지 않습니다.

실행에는 `non-interactive.ts`, `skills-db.ts`, `ntn-cli.ts`, `verify-sync.ts`를 사용합니다. 진단용 JSONL 로그는 민감한 값을 가린 뒤 Git 추적 대상에서 제외된 `.notion-sync-setup/` 디렉터리에 저장합니다.

`steps/`와 `COPY.md`에는 원본 프로젝트의 이전 설정 마법사가 참고 자료와 보조 함수 테스트용으로 남아 있습니다. 현재 기본 설정 명령은 이를 호출하지 않습니다. 해당 파일의 워크플로 배포 안내는 과거 구현에 관한 기록이며, 현재 설정 절차가 아닙니다.
