import { CALLBACK_PATH, type WebConfig } from "./config.ts";
import { authorizationUrl, ConnectionError, exchangeCode, listPlugins, pluginDownload, revokeSession, type WebFetch } from "./notion.ts";
import { cookie, equalState, randomState, readCookie, readSession, seal, SESSION_SECONDS, STATE_SECONDS, unseal } from "./session.ts";
import { guide, home, message, skills } from "./views.ts";
import { findSkill, skillArchive } from "./catalog.ts";
import { catalogPage, skillPage } from "./catalog-views.ts";
import { terms } from "./terms.ts";
import { privacy } from "./privacy.ts";

interface Dependencies {
  fetch?: WebFetch;
  now?: () => number;
}

const securityHeaders = {
  "Cache-Control": "no-store, private",
  "Content-Security-Policy": "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function html(body: string, status = 200, cookies: string[] = [], interactive = false): Response {
  const headers = new Headers({ ...securityHeaders, "Content-Type": "text/html; charset=utf-8" });
  if (interactive) headers.set("Content-Security-Policy", `${securityHeaders["Content-Security-Policy"].replace("form-action 'self'", "form-action 'none'")}; script-src 'self'; connect-src 'none'`);
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(body, { status, headers });
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ ...securityHeaders, Location: location });
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(null, { status: 303, headers });
}

export function createWebApp(config: WebConfig | null, dependencies: Dependencies = {}): (request: Request) => Promise<Response> {
  const fetchImpl = dependencies.fetch ?? ((url, init) => fetch(url, init));
  const now = dependencies.now ?? Date.now;
  return async (request) => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response(null, { status: 405, headers: { ...securityHeaders, Allow: "GET, POST" } });
    }
    if (request.method === "GET" && path === "/health") {
      return Response.json({ status: config ? "ready" : "setup_required" }, { status: config ? 200 : 503, headers: securityHeaders });
    }
    if (request.method === "GET" && path === "/guide") return html(guide());
    if (request.method === "GET" && path === "/privacy") return html(privacy());
    if (request.method === "GET" && path === "/terms") return html(terms());
    if (request.method === "GET" && path === "/catalog") {
      return html(catalogPage((url.searchParams.get("q") ?? "").slice(0, 100), url.searchParams.get("audience") ?? "", url.searchParams.get("category") ?? ""));
    }
    if (path.startsWith("/catalog/")) {
      if (request.method !== "GET") return new Response(null, { status: 405, headers: { ...securityHeaders, Allow: "GET" } });
      const match = /^\/catalog\/([a-z0-9-]+)(?:\/(download|source))?$/.exec(path);
      const skill = match ? findSkill(match[1]!) : undefined;
      if (!skill) return html(message("스킬을 찾지 못했어요", "목록에서 다른 스킬을 골라 주세요.", "/catalog", "스킬 둘러보기"), 404);
      if (match?.[2]) {
        const archive = match[2] === "download";
        return new Response(archive ? new Uint8Array(skillArchive(skill)) : skill.markdown, { headers: {
          ...securityHeaders,
          "Content-Type": archive ? "application/zip" : "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${skill.id}${archive ? ".zip" : "-SKILL.md"}"`,
        } });
      }
      return html(skillPage(skill), 200, [], true);
    }
    if (request.method === "GET" && path === "/") {
      return config && readSession(request, config, now()) ? redirect("/skills") : html(home(Boolean(config)));
    }
    if (!config) return html(message("연결을 준비하고 있어요", "운영자가 Notion 연결 등록을 마치면 이용할 수 있습니다.", "/", "홈으로 돌아가기"), 503);

    const clearState = cookie(config, "state", "", 0);
    const clearSession = cookie(config, "session", "", 0);
    // Never derive callback URLs or cookie scope from forwarded host headers.
    if (url.origin !== config.origin) return html(message("시작 주소를 확인해 주세요", "서비스의 공식 주소에서 다시 시작해 주세요.", config.origin, "공식 주소로 이동"), 400);
    if (request.method === "POST" && request.headers.get("origin") !== config.origin) {
      return html(message("요청을 확인할 수 없어요", "이 사이트에서 다시 시도해 주세요.", "/", "홈으로 돌아가기"), 403);
    }

    try {
      if (request.method === "GET" && path === "/auth/notion") {
        const state = randomState();
        return redirect(authorizationUrl(config, state), [cookie(config, "state", seal(config, "state", state, STATE_SECONDS, now()), STATE_SECONDS)]);
      }
      if (request.method === "GET" && path === CALLBACK_PATH) {
        const expected = unseal(config, "state", readCookie(request, config, "state"), now());
        const state = url.searchParams.get("state");
        if (typeof expected !== "string" || !state || !equalState(expected, state)) {
          return html(message("연결 시간이 지났어요", "연결을 시작한 브라우저에서 다시 시도해 주세요."), 400, [clearState]);
        }
        if (url.searchParams.has("error")) {
          return html(message("연결을 취소했어요", "아직 스킬을 가져오지 않았습니다. 준비되면 다시 연결해 주세요."), 200, [clearState]);
        }
        const code = url.searchParams.get("code");
        if (!code || code.length > 2048) throw new ConnectionError("invalid");
        const session = await exchangeCode(config, code, fetchImpl);
        return redirect("/skills", [clearState, cookie(config, "session", seal(config, "session", session, SESSION_SECONDS, now()), SESSION_SECONDS)]);
      }
      if (request.method === "POST" && path === "/auth/logout") return redirect("/", [clearSession, clearState]);
      const session = readSession(request, config, now());
      if (!session) return html(message("Notion을 연결해 주세요", "내 스킬을 보려면 Notion으로 연결해 주세요. 로그인은 최대 8시간 유지됩니다."), 401, [clearSession]);
      if (request.method === "POST" && path === "/auth/disconnect") {
        await revokeSession(config, session, fetchImpl);
        return html(message("Notion 연결을 해제했어요", "이 연결의 접근 권한을 폐기하고 브라우저의 로그인 정보를 삭제했습니다.", "/", "홈으로 돌아가기"), 200, [clearSession, clearState]);
      }
      if (request.method === "GET" && path === "/skills") return html(skills(session.workspaceName, await listPlugins(session, fetchImpl)));
      if (request.method === "GET" && path.startsWith("/download/")) {
        const encodedId = path.slice("/download/".length);
        if (encodedId.includes("/")) throw new ConnectionError("invalid");
        return redirect(await pluginDownload(session, decodeURIComponent(encodedId), fetchImpl));
      }
      return html(message("페이지를 찾지 못했어요", "시작 화면에서 다시 이동해 주세요.", "/", "홈으로 돌아가기"), 404);
    } catch (error) {
      if (error instanceof ConnectionError && error.kind === "expired") {
        return html(message("다시 연결이 필요해요", "Notion의 접근 권한이 만료되었거나 해제되었습니다. 다시 로그인해 주세요."), 401, [clearSession, clearState]);
      }
      if (error instanceof ConnectionError && error.kind === "permissions") {
        return html(message("스킬 접근 권한을 확인해 주세요", "Notion에서 사용할 Skills 데이터베이스를 공유해 주세요. 계속 보이지 않으면 관리자에게 연결 정책과 Skills API 이용 가능 여부를 확인해 주세요."), 403, [clearState]);
      }
      return html(message("연결을 완료하지 못했어요", "Notion 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요. 연결 해제 중이었다면 Notion 설정에서도 직접 해제할 수 있습니다."), 502, [clearState]);
    }
  };
}
