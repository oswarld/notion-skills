import type { Plugin } from "../src/notion/plugins.ts";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function page(title: string, content: string, connected = false, interactive = false): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="회의록, 콘텐츠, 팀 운영까지. 스킬을 고르고 내 내용을 넣어 AI에 바로 요청하세요."><meta name="color-scheme" content="light"><title>${escapeHtml(title)} · INLEVEL9 Skills</title><link rel="stylesheet" href="/style.css"><link rel="icon" href="/skills-logo.png?v=90ab004d" type="image/png">${interactive ? '<script type="module" src="/catalog.js"></script>' : ""}</head><body><a class="skip" href="#main">본문으로 이동</a><div class="shell"><header><a class="brand" href="/" aria-label="INLEVEL9 Skills 홈"><img class="mark" src="/skills-logo.png?v=90ab004d" width="40" height="40" alt=""><span>INLEVEL9 <span class="brand-light">Skills</span></span></a><nav aria-label="주 메뉴"><a href="/catalog">스킬 찾기</a><a href="/guide">사용 안내</a>${connected ? '<form method="post" action="/auth/logout"><button class="quiet" type="submit">로그아웃</button></form>' : '<a class="nav-note" href="/skills">내 Notion 스킬</a>'}</nav></header><main id="main">${content}</main><footer><span>INLEVEL9 Skills</span><nav class="footer-links" aria-label="서비스 정책 및 관련 안내"><a class="privacy-link" href="/privacy">개인정보처리방침</a><a href="/terms">이용약관</a><a href="https://www.notion.com/help/skills" target="_blank" rel="noopener noreferrer">Notion Skills 알아보기</a></nav></footer></div></body></html>`;
}

export function home(ready: boolean): string {
  return page("내 일에 맞는 AI 스킬", `<section class="hero"><div class="hero-copy"><p class="eyebrow">매번 설명하던 일, 이제 스킬로</p><h1>해야 할 일을 고르면,<br><span>시작이 쉬워져요.</span></h1><p class="lead">회의록 정리, 콘텐츠 기획, 팀의 업무 매뉴얼.<br>업무에 맞는 판단 기준을 고르고,<br>내 자료와 함께 Notion AI에 전달하세요.</p><a class="primary" href="/catalog">내 일에 맞는 스킬 찾기 <span aria-hidden="true">↗</span></a><p class="helper">회원가입 없이 · 설치 없이 · 예시부터 시작</p></div><aside class="library" aria-label="사용자별 시작하기"><div class="library-top"><span>어떤 일을 하고 계세요?</span><span class="example-label">직접 골라보세요</span></div><a class="sample sample-link" href="/catalog?audience=office"><span class="sample-number">01</span><div><h2>일상 업무를 더 편하게</h2><p>회의록, 이메일, 문서, 이번 주 할 일</p></div><span aria-hidden="true">↗</span></a><a class="sample sample-link" href="/catalog?audience=creator"><span class="sample-number">02</span><div><h2>혼자서도 사업과 콘텐츠를</h2><p>콘텐츠 일정, 캠페인, 고객 문의와 의견</p></div><span aria-hidden="true">↗</span></a><a class="sample sample-link" href="/catalog?audience=team"><span class="sample-number">03</span><div><h2>팀이 함께 일하기 쉽게</h2><p>프로젝트, 업무 보고, 매뉴얼, 온보딩</p></div><span aria-hidden="true">↗</span></a><div class="library-bottom">내가 만들 결과를 보고 선택하세요.</div></aside></section><section class="how"><h2>처음이어도 세 단계면 준비돼요.</h2><ol><li><strong>내 일에 맞는 스킬 선택</strong><p>AI가 살펴볼 질문과 기준, 결과 예시를 확인합니다.</p></li><li><strong>자료와 기준으로 요청문 만들기</strong><p>자료를 넣거나 현재 Notion 페이지를 선택하고, 업무 조건을 덧붙입니다.</p></li><li><strong>Notion AI에 붙여넣기</strong><p>자료와 판단 기준을 함께 전달해 Notion AI에서 답변을 받습니다.</p></li></ol></section><section class="trust"><h2>Notion에 내 스킬이 있나요?</h2><div><p>Notion에 모아 둔 스킬 묶음도 연결해서 가져올 수 있어요.</p>${ready ? '<a class="text-link" href="/auth/notion">Notion으로 연결 →</a>' : '<p class="helper">Notion 연결은 준비 중입니다. 기본 스킬은 지금 둘러볼 수 있어요.</p>'}</div></section>`);
}

export function skills(workspaceName: string, plugins: Plugin[]): string {
  const items = plugins.map((plugin) => `<li class="plugin"><div><h2>${escapeHtml(plugin.name || "이름 없는 스킬 묶음")}</h2><p>${escapeHtml(plugin.description || "Notion에서 공유한 AI 스킬 묶음입니다.")}</p></div><a class="secondary" href="/download/${encodeURIComponent(plugin.id)}" aria-label="${escapeHtml(plugin.name)} 다운로드">다운로드 <span aria-hidden="true">↓</span></a></li>`).join("");
  return page("내 스킬", `<section class="page-heading"><p class="eyebrow">${escapeHtml(workspaceName)}</p><h1>내 스킬 라이브러리</h1><p>Notion에서 공유한 스킬 묶음 ${plugins.length}개를 찾았습니다.</p></section>${plugins.length ? `<ul class="plugins">${items}</ul><div class="helper"><p>다운로드는 Notion이 만든 원본 압축 파일(.tar.gz)입니다.</p><a href="/guide">다운로드한 스킬 사용하기 →</a></div>` : '<div class="empty"><h2>아직 보이는 스킬이 없어요.</h2><p>Notion에 Skills 데이터베이스가 있는지 확인하고, 연결할 때 해당 데이터베이스를 선택해 주세요. 일반 데이터베이스는 Skills 데이터베이스로 전환해야 합니다.</p><a class="primary" href="/auth/notion">공유할 스킬 다시 선택</a></div>'}<div class="account"><a href="/auth/notion">다른 워크스페이스 연결</a><form action="/auth/disconnect" method="post"><button class="quiet" type="submit">Notion 연결 해제</button></form></div>`, true);
}

export function message(title: string, body: string, statusAction = "/auth/notion", label = "Notion 다시 연결"): string {
  return page(title, `<section class="message"><p class="eyebrow">INLEVEL9 Skills</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><a class="primary" href="${escapeHtml(statusAction)}">${escapeHtml(label)}</a></section>`);
}

export function guide(): string {
  return page("사용 안내", `<article class="prose"><p class="eyebrow">Notion AI와 함께 쓰는 업무 기준</p><h1>자료와 판단 기준을 함께 전달하세요.</h1>
    <h2>스킬에는 무엇이 들어 있나요?</h2><p>업무에 필요한 입력, AI가 살펴볼 질문, 판단 기준, 정보가 부족할 때의 처리 방식, 결과 형식이 담겨 있습니다. 기본 스킬 15개 모두 같은 구성을 사용하며 질문과 기준은 업무에 맞게 다릅니다.</p>
    <h2>1. 하고 싶은 일을 고르세요</h2><p><a href="/catalog">스킬 찾기</a>에서 작업을 선택하고 판단 질문을 펼쳐 보세요. 합의와 제안, 초안과 완료처럼 어떤 내용을 구분하는지 알 수 있습니다. 결과 예시는 작성자가 준비한 설명용 예시입니다.</p>
    <h2>2. 작업할 자료를 정하세요</h2><p><strong>직접 자료 넣기:</strong> 메모나 문서를 첫 번째 입력칸에 넣습니다. 처음에는 ‘예시 넣기’로 연습할 수 있습니다.</p><p><strong>현재 Notion 페이지:</strong> 본문 입력을 건너뛰고, 해당 페이지를 자료로 사용하도록 요청문을 만듭니다. 작업할 페이지에서 Notion AI를 열고 요청문을 붙여넣으세요. 이 사이트가 페이지를 읽거나 접근 권한을 부여하는 것은 아닙니다. AI가 내용을 읽을 수 없다면 필요한 자료를 직접 첨부하세요.</p>
    <h2>3. 내 업무의 조건을 덧붙이세요</h2><p>독자, 사용 가능한 시간, 확정된 정책 등 스킬에서 묻는 조건을 넣으세요. ‘내 업무에서 더 중요하게 볼 기준’에는 팀 용어나 우선순위를 적을 수 있습니다. 없는 정보는 비워 두면 됩니다. 자료나 조건을 바꾸면 이전 요청문이 지워지므로 다시 만들어 주세요.</p>
    <h2>4. Notion AI에서 답변을 받으세요</h2><p>‘요청문 만들기’를 누른 뒤 내용을 복사해 Notion AI에 붙여넣습니다. 다른 AI에서도 쓸 수 있으며, 현재 페이지를 읽을 수 없는 앱에는 자료를 직접 제공하세요. 요청문은 결과 초안을 작성하도록 안내하며 페이지 수정이나 외부 발송을 자동으로 실행하지 않습니다.</p>
    <h2>결과는 이렇게 확인하세요</h2><p>원문 근거가 있는지, 없는 담당자나 날짜를 만들어 넣지 않았는지, 내 업무 조건을 지켰는지 확인하세요. 기준을 바꿔 같은 자료로 다시 요청하면 차이를 비교하기 쉽습니다. 모델과 문서 맥락에 따라 답변은 달라질 수 있습니다.</p>
    <h2 id="install">반복해서 쓴다면</h2><p>‘전체 작업 지침 .md 다운로드’는 판단 기준까지 포함한 한 파일입니다. 내용을 Notion 페이지에 보관해 반복해서 참고하거나 AI에 전달할 수 있습니다. ‘스킬 ZIP 다운로드’에는 SKILL.md와 판단 기준 파일이 함께 들어 있습니다. 스킬 파일을 지원하는 앱의 설치 안내에 따라 ZIP을 추가하세요. 내려받은 파일에는 화면에 직접 입력한 업무 내용이 포함되지 않습니다.</p>
    <h2>Notion에 있는 내 스킬 가져오기</h2><p><a href="/skills">내 Notion 스킬</a>에서 연결하고 사용할 Skills 데이터베이스를 공유하세요. 연결이 읽을 수 있는 스킬 묶음을 원본 .tar.gz으로 내려받습니다. 기본 스킬의 ZIP과는 파일 형식이 다르며, 붙여넣기나 다운로드만으로 AI 앱에 자동 설치되지는 않습니다.</p>
    <h2>입력한 내용은 어디에 남나요?</h2><p>본문과 추가 기준은 브라우저 메모리에서 요청문을 만드는 데만 사용합니다. 이 사이트 서버나 로컬 저장소에 저장하지 않습니다. 새로고침하거나 창을 닫으면 사라질 수 있으므로 필요한 요청문을 복사해 두세요. 붙여넣는 AI 서비스의 데이터 처리 정책은 별도로 적용됩니다.</p>
    <h2>연결과 사용 범위</h2><p>기본 스킬을 사용하고 요청문을 만드는 데 Notion 로그인, MCP 연결, 별도 모델 API 키는 필요하지 않습니다. Notion 연결은 내 스킬을 조회하고 내려받을 때 사용합니다. 로그아웃은 브라우저 세션을 지우고, 연결 해제는 접근 토큰을 폐기합니다. 로그인은 최대 8시간 유지됩니다.</p>
    <a class="primary" href="/catalog/meeting-notes">회의록 예시로 시작하기 →</a></article>`);
}
