import { audiences, categories, filterSkills, type CatalogSkill } from "./catalog.ts";
import { escapeHtml as e, page } from "./views.ts";

function options(values: Record<string, string>, selected: string): string {
  return Object.entries(values).map(([key, label]) => `<option value="${key}"${key === selected ? " selected" : ""}>${e(label)}</option>`).join("");
}

function decisionPanel(skill: CatalogSkill): string {
  return `<section class="decision-panel" aria-labelledby="decision-heading">
    <p class="eyebrow">Notion AI에게 건넬 판단 기준</p><h2 id="decision-heading">무엇을 보고, 어떻게 구분할까요?</h2>
    <p class="helper">아래 질문과 기준이 요청문에 함께 담깁니다. 자료를 넣거나 현재 Notion 페이지를 대상으로 선택해, Notion AI에 전달하세요.</p>
    <div class="decision-questions">${skill.decisionGuide.questions.map((item, index) => `<details><summary><span class="decision-label">${String(index + 1).padStart(2, "0")} · ${e(item.label)}</span><span>${e(item.question)}</span></summary><div class="decision-detail"><p><strong>판단 기준</strong>${e(item.criterion)}</p><p><strong>정보가 부족할 때</strong>${e(item.ifUnknown)}</p></div></details>`).join("")}</div>
    <details class="decision-output"><summary>Notion에 정리할 결과 보기</summary><ul>${skill.decisionGuide.output.map((item) => `<li>${e(item)}</li>`).join("")}</ul></details>
  </section>`;
}

export function catalogPage(query: string, audience: string, category: string): string {
  const results = filterSkills(query, audience, category);
  return page("스킬 둘러보기", `
    <section class="page-heading"><p class="eyebrow">내 일에 바로 쓰는 작은 도움</p><h1>어떤 일을 끝내고 싶으세요?</h1><p>회의록부터 콘텐츠 기획, 팀 운영까지. 예시를 보고 내 내용으로 시작하세요.</p></section>
    <form class="catalog-filters" action="/catalog" method="get" role="search">
      <label>하고 싶은 일<input type="search" name="q" maxlength="100" value="${e(query)}" placeholder="회의, 이메일, 콘텐츠…"></label>
      <label>나에게 맞는 스킬<select name="audience"><option value="">모든 사용자</option>${options(audiences, audience)}</select></label>
      <label>작업 종류<select name="category"><option value="">모든 작업</option>${options(categories, category)}</select></label>
      <button class="primary" type="submit">찾기</button>
    </form>
    <div class="results-line"><p>스킬 ${results.length}개 · 로그인 없이 이용</p><a href="/catalog">필터 초기화</a></div>
    ${results.length ? `<ul class="catalog-grid">${results.map((skill) => `<li><article class="skill-card"><span class="category-tag">${categories[skill.category]}</span><h2><a href="/catalog/${skill.id}">${e(skill.title)} <span aria-hidden="true">↗</span></a></h2><p>${e(skill.summary)}</p><div class="card-outcome"><span>이렇게 정리해요</span><p>${e(skill.outcome)}</p></div><small>${skill.audiences.map((key) => audiences[key]).join(" · ")}</small></article></li>`).join("")}</ul>` : '<div class="empty"><h2>조건에 맞는 스킬이 없어요.</h2><p>검색어를 짧게 바꾸거나 필터를 초기화해 보세요.</p><a class="secondary" href="/catalog">전체 스킬 보기</a></div>'}
    <aside class="helper"><p>처음이라면 회의록 정리나 이메일 작성부터 시작해 보세요. 각 스킬에 작성한 예시가 준비되어 있습니다.</p><a href="/guide">스킬이 처음이라면 →</a></aside>`);
}

export function skillPage(skill: CatalogSkill): string {
  return page(skill.title, `
    <section class="page-heading"><a class="back-link" href="/catalog">← 스킬 둘러보기</a><p class="eyebrow">${categories[skill.category]}</p><h1>${e(skill.title)}</h1><p>${e(skill.summary)}</p><p class="result-caption">${e(skill.outcome)}</p></section>
    ${decisionPanel(skill)}
    <div class="workbench">
      <section class="input-panel" aria-labelledby="input-heading"><div class="panel-heading"><h2 id="input-heading">1. 자료와 조건 정하기</h2><button type="button" class="quiet" id="fill-example">예시 넣기</button></div><p class="helper">입력한 내용은 이 화면에서만 사용해요. AI에 전달할 때는 복사한 요청문을 직접 붙여넣으세요.</p>
        <fieldset class="source-options"><legend>어떤 자료로 작업할까요?</legend><label><input type="radio" name="source-mode" value="paste" checked>직접 자료 넣기</label><label><input type="radio" name="source-mode" value="notion-page">현재 Notion 페이지</label></fieldset>
        <p class="helper" id="notion-page-help" hidden>작업할 페이지에서 Notion AI를 열고 요청문을 붙여넣으세요. 이 사이트가 페이지 내용을 가져오지는 않습니다. AI가 자료를 읽을 수 없다면 내용을 직접 첨부해 주세요.</p>
        <div id="skill-inputs" data-title="${e(skill.title)}">
          ${skill.inputs.map((input, index) => `<label class="input-field"${index === 0 ? ' id="material-field"' : ''} for="input-${index}">${e(input.label)}${index === 0 ? ' <span class="required-note">필수</span>' : ' <span class="optional-note">선택</span>'}<textarea id="input-${index}" data-label="${e(input.label)}" data-sample="${e(input.sample)}" data-required="${index === 0}" maxlength="12000" rows="${index === 0 ? 7 : 3}" placeholder="${e(input.hint)}" aria-describedby="input-feedback"></textarea></label>`).join("")}
          <label class="input-field" for="decision-context">내 업무에서 더 중요하게 볼 기준 <span class="optional-note">선택</span><textarea id="decision-context" maxlength="3000" rows="3" placeholder="예: 원문에 있는 표현을 유지하고, 빠진 정보부터 보여 주세요." aria-describedby="decision-context-help"></textarea></label><p class="helper" id="decision-context-help">팀의 용어나 우선순위가 있다면 덧붙이세요. 비워 두면 위의 기본 기준을 사용합니다.</p>
          <p id="input-feedback" role="status" aria-live="polite"></p><button type="button" class="primary" id="compose">요청문 만들기</button>
        </div>
        <noscript><p>요청문을 자동으로 만들려면 JavaScript가 필요해요. 아래 ‘작업 지침 보기’의 내용을 복사하고, 내 자료를 덧붙여 AI에 요청할 수도 있습니다.</p></noscript>
      </section>
      <aside class="example-panel"><p class="eyebrow">어떤 결과가 나오는지 먼저 보세요</p><h2>결과 예시</h2><p class="helper">‘예시 넣기’에 해당하는 작성 예시입니다. 실제 AI 실행 결과가 아니며, 답변은 사용하는 AI에 따라 달라집니다.</p><pre class="example-output">${e(skill.example)}</pre><p class="helper">정해지지 않은 정보는 확인할 항목으로 남겨요.</p></aside>
    </div>
    <section class="prompt-panel" id="prompt-panel" hidden aria-labelledby="prompt-heading"><h2 id="prompt-heading">2. 복사해서 Notion AI에 붙여넣기</h2><p>작업할 Notion 페이지의 AI 대화에 요청문을 붙여넣으세요. 자료와 판단 기준이 함께 전달됩니다. 다른 AI 대화창에서도 사용할 수 있어요.</p><label for="prepared-prompt">내 요청문</label><textarea id="prepared-prompt" rows="12" readonly></textarea><div class="prompt-actions"><button class="primary" id="copy-prompt" type="button">요청문 복사</button><button class="quiet" id="select-prompt" type="button">전체 선택</button><span id="copy-feedback" role="status" aria-live="polite"></span></div></section>
    <section class="reuse-panel"><h2>마음에 들면 계속 사용하세요.</h2><p>전체 작업 지침을 Notion에 보관하거나, 스킬 파일을 지원하는 앱에 ZIP을 추가할 수 있어요. 파일에는 직접 입력한 업무 내용이 포함되지 않습니다.</p><a class="secondary" href="/catalog/${skill.id}/source">전체 작업 지침 .md 다운로드 ↓</a><a class="text-link" href="/catalog/${skill.id}/download">스킬 ZIP 다운로드 ↓</a><a class="text-link" href="/guide#install">사용 방법 보기 →</a><details><summary>작업 지침 보기</summary><pre id="skill-instructions">${e(skill.instructions)}</pre></details></section>`, false, true);
}
