import { describe, expect, test } from "bun:test";
import { createWebApp } from "../web/app.ts";
import { CALLBACK_PATH, loadWebConfig, type WebConfig } from "../web/config.ts";
import { ConnectionError, listPlugins, type WebFetch } from "../web/notion.ts";
import { cookieName, seal, SESSION_SECONDS, unseal, type Session } from "../web/session.ts";

const config: WebConfig = {
  origin: "https://skills.example.com", clientId: "test-client",
  clientSecret: "test-client-secret", sessionKey: "12".repeat(32),
};
const pluginId = "00000001-0000-4000-8000-000000000001";
const session: Session = { accessToken: "test-access-token", workspaceId: "workspace-one", workspaceName: "Test workspace" };
const json = (value: unknown, status = 200) => Response.json(value, { status });
const cookiePair = (value: string) => value.split(";")[0]!;
const sessionCookie = (value = session) => `${cookieName(config, "session")}=${seal(config, "session", value, SESSION_SECONDS)}`;

function request(path: string, options: RequestInit = {}): Request {
  return new Request(config.origin + path, options);
}

async function start(app: ReturnType<typeof createWebApp>) {
  const response = await app(request("/auth/notion"));
  const location = new URL(response.headers.get("location")!);
  return { response, location, cookie: cookiePair(response.headers.getSetCookie()[0]!), state: location.searchParams.get("state")! };
}

describe("web OAuth flow", () => {
  test("exchanges a browser-bound code server-side and renders only the authorized plugins", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const app = createWebApp(config, { fetch: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/oauth/token")) return json({ access_token: session.accessToken, workspace_id: session.workspaceId, workspace_name: session.workspaceName, refresh_token: "not-stored" });
      return json({ results: [{ id: pluginId, name: "Meeting Notes", description: "Decisions and actions", version_id: "v1" }], has_more: false });
    } });
    const begin = await start(app);
    expect(begin.location.origin).toBe("https://api.notion.com");
    expect(begin.location.searchParams.get("redirect_uri")).toBe(config.origin + CALLBACK_PATH);
    expect(begin.response.headers.getSetCookie()[0]).toContain("HttpOnly; SameSite=Lax");
    expect(begin.response.headers.getSetCookie()[0]).toContain("Secure");
    expect(begin.location.href).not.toContain(config.clientSecret);
    const callback = await app(request(`${CALLBACK_PATH}?state=${begin.state}&code=test-code`, { headers: { cookie: begin.cookie } }));
    expect(callback.status).toBe(303);
    expect(callback.headers.get("location")).toBe("/skills");
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ grant_type: "authorization_code", code: "test-code", redirect_uri: config.origin + CALLBACK_PATH });
    expect(new Headers(calls[0]!.init?.headers).get("Notion-Version")).toBe("2026-03-11");
    const sessionHeader = callback.headers.getSetCookie().find((value) => value.startsWith(`${cookieName(config, "session")}=`))!;
    expect(sessionHeader).not.toContain(session.accessToken);
    expect(sessionHeader).not.toContain("not-stored");
    const library = await app(request("/skills", { headers: { cookie: cookiePair(sessionHeader) } }));
    const body = await library.text();
    expect(body).toContain("Meeting Notes");
    expect(body).not.toContain(session.accessToken);
    expect(library.headers.get("cache-control")).toContain("no-store");
    expect(new Headers(calls[1]!.init?.headers).get("Notion-Version")).toBe("2026-03-11");
    expect(new URL(calls[1]!.url).searchParams.get("page_size")).toBe("100");
  });

  test("rejects missing, cross-browser, and mismatched state before any token exchange", async () => {
    let calls = 0;
    const app = createWebApp(config, { fetch: async () => { calls++; return json({}); } });
    const begin = await start(app);
    for (const headers of [new Headers(), new Headers({ cookie: begin.cookie })]) {
      const result = await app(request(`${CALLBACK_PATH}?state=attacker&code=code`, { headers }));
      expect(result.status).toBe(400);
    }
    expect(calls).toBe(0);
  });

  test("expires state and handles consent denial without exchanging a code", async () => {
    let time = Date.now();
    let calls = 0;
    const app = createWebApp(config, { now: () => time, fetch: async () => { calls++; return json({}); } });
    const begin = await start(app);
    const denied = await app(request(`${CALLBACK_PATH}?state=${begin.state}&error=access_denied`, { headers: { cookie: begin.cookie } }));
    expect(await denied.text()).toContain("연결을 취소했어요");
    time += 11 * 60 * 1000;
    const stale = await app(request(`${CALLBACK_PATH}?state=${begin.state}&code=code`, { headers: { cookie: begin.cookie } }));
    expect(stale.status).toBe(400);
    expect(calls).toBe(0);
  });

  test("does not reflect credentials or provider error bodies", async () => {
    const app = createWebApp(config, { fetch: async () => json({ error: config.clientSecret, access_token: session.accessToken }, 400) });
    const begin = await start(app);
    const result = await app(request(`${CALLBACK_PATH}?state=${begin.state}&code=secret-code`, { headers: { cookie: begin.cookie } }));
    expect(result.status).toBe(502);
    const body = await result.text();
    expect(body).not.toContain(config.clientSecret);
    expect(body).not.toContain(session.accessToken);
    expect(body).not.toContain("secret-code");
  });

  test("fails closed when deployment settings are incomplete", async () => {
    const app = createWebApp(null);
    expect((await app(request("/auth/notion"))).status).toBe(503);
    expect((await app(request("/health"))).status).toBe(503);
    expect(await (await app(request("/"))).text()).not.toContain('href="/auth/notion"');
  });

  test("uses a fixed trusted origin and rejects unexpected callback hosts", async () => {
    const app = createWebApp(config);
    const response = await app(new Request("https://attacker.example/auth/notion"));
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("private sessions and skill access", () => {
  test("rejects tampering, expired cookies, wrong keys, and purpose confusion", () => {
    const value = seal(config, "session", session, 10, 1000);
    expect(unseal(config, "session", value, 1001)).toEqual(session);
    const index = Math.floor(value.length / 2);
    const tampered = value.slice(0, index) + (value[index] === "a" ? "b" : "a") + value.slice(index + 1);
    expect(unseal(config, "session", tampered, 1001)).toBeNull();
    expect(unseal(config, "session", value, 11000)).toBeNull();
    expect(unseal(config, "state", value, 1001)).toBeNull();
    expect(unseal({ ...config, sessionKey: "34".repeat(32) }, "session", value, 1001)).toBeNull();
  });

  test("blocks anonymous downloads and duplicate cookie ambiguity", async () => {
    const app = createWebApp(config);
    expect((await app(request(`/download/${pluginId}`))).status).toBe(401);
    expect((await app(request("/skills", { headers: { cookie: `${sessionCookie()}; ${sessionCookie()}` } }))).status).toBe(401);
  });

  test("isolates users and only downloads an ID returned for that session", async () => {
    let retrieveCount = 0;
    const fetchImpl: WebFetch = async (url, init) => {
      const bearer = new Headers(init?.headers).get("authorization");
      if (new URL(url).pathname === "/v1/ai/plugins") return json({ results: bearer === "Bearer user-two" ? [] : [{ id: pluginId, name: "Skills", description: "", version_id: "v1" }], has_more: false });
      retrieveCount++;
      return json({ url: "https://files.notion.example/archive.tar.gz?signature=temporary" });
    };
    const app = createWebApp(config, { fetch: fetchImpl });
    const own = await app(request(`/download/${pluginId}`, { headers: { cookie: sessionCookie() } }));
    expect(own.status).toBe(303);
    expect(own.headers.get("location")).toStartWith("https://files.notion.example/");
    expect(own.headers.get("referrer-policy")).toBe("no-referrer");
    const other = await app(request(`/download/${pluginId}`, { headers: { cookie: sessionCookie({ ...session, accessToken: "user-two" }) } }));
    expect(other.status).toBe(403);
    expect(retrieveCount).toBe(1);
  });

  test("escapes names and descriptions from Notion", async () => {
    const app = createWebApp(config, { fetch: async () => json({ results: [{ id: pluginId, name: '<script>alert("x")</script>', description: '<img src=x onerror="alert(1)">', version_id: "v1" }], has_more: false }) });
    const result = await app(request("/skills", { headers: { cookie: sessionCookie() } }));
    const body = await result.text();
    expect(body).not.toContain("<script>");
    expect(body).not.toContain("<img src=x");
    expect(body).toContain("&lt;script&gt;");
  });

  test("explains an empty library and permission failures without fake success", async () => {
    const empty = createWebApp(config, { fetch: async () => json({ results: [], has_more: false }) });
    expect(await (await empty(request("/skills", { headers: { cookie: sessionCookie() } }))).text()).toContain("아직 보이는 스킬이 없어요");
    const blocked = createWebApp(config, { fetch: async () => json({}, 403) });
    expect((await blocked(request("/skills", { headers: { cookie: sessionCookie() } }))).status).toBe(403);
    const expired = createWebApp(config, { fetch: async () => json({}, 401) });
    const response = await expired(request("/skills", { headers: { cookie: sessionCookie() } }));
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie().join(";")).toContain("Max-Age=0");
  });

  test("requires same-origin POST for logout and revocation", async () => {
    let calls = 0;
    const app = createWebApp(config, { fetch: async (url, init) => {
      calls++;
      expect(url).toBe("https://api.notion.com/v1/oauth/revoke");
      expect(JSON.parse(String(init?.body))).toEqual({ token: session.accessToken });
      return json({});
    } });
    const headers = { cookie: sessionCookie(), origin: config.origin };
    expect((await app(request("/auth/disconnect", { method: "POST", headers: { ...headers, origin: "https://attacker.example" } }))).status).toBe(403);
    expect(calls).toBe(0);
    const result = await app(request("/auth/disconnect", { method: "POST", headers }));
    expect(result.status).toBe(200);
    expect(calls).toBe(1);
    expect(result.headers.getSetCookie().join(";")).toContain("Max-Age=0");
  });

  test("keeps revocation failures visible and does not claim disconnection", async () => {
    const app = createWebApp(config, { fetch: async () => json({}, 503) });
    const response = await app(request("/auth/disconnect", { method: "POST", headers: { origin: config.origin, cookie: sessionCookie() } }));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("연결을 해제했어요");
  });

  test("follows pagination and stops malformed cursor loops", async () => {
    let calls = 0;
    await expect(listPlugins(session, async () => { calls++; return json({ results: [], has_more: true, next_cursor: "repeat" }); })).rejects.toBeInstanceOf(ConnectionError);
    expect(calls).toBe(2);
  });

  test("follows all pages before returning the authorized library", async () => {
    const urls: URL[] = [];
    const plugin = { id: pluginId, name: "Meeting Notes", description: "", version_id: "v1" };
    const result = await listPlugins(session, async (url) => {
      urls.push(new URL(url));
      return json(urls.length === 1
        ? { results: [plugin], has_more: true, next_cursor: "next" }
        : { results: [{ ...plugin, id: "tag:Finance" }], has_more: false, next_cursor: null });
    });
    expect(result.map((item) => item.id)).toEqual([pluginId, "tag:Finance"]);
    expect(urls.map((url) => url.searchParams.get("page_size"))).toEqual(["100", "100"]);
    expect(urls[1]!.searchParams.get("start_cursor")).toBe("next");
  });

  test.each([
    { results: [] },
    { results: [], has_more: "false" },
    { results: [], has_more: true, next_cursor: null },
    { results: [{ id: pluginId, name: "Skills", description: "", version_id: "" }], has_more: false },
  ])("does not render a malformed listing as an empty library: %j", async (response) => {
    const app = createWebApp(config, { fetch: async () => json(response) });
    const result = await app(request("/skills", { headers: { cookie: sessionCookie() } }));
    expect(result.status).toBe(502);
    expect(await result.text()).not.toContain("아직 보이는 스킬이 없어요");
  });

  test("downloads opaque plugin IDs with exactly one decode and encode", async () => {
    const id = "tag:Finance / 한글?&%2F";
    const urls: string[] = [];
    const app = createWebApp(config, { fetch: async (url) => {
      urls.push(url);
      if (new URL(url).pathname === "/v1/ai/plugins") return json({
        results: [{ id, name: "Finance", description: "", version_id: "v1" }], has_more: false,
      });
      expect(url).toBe(`https://api.notion.com/v1/ai/plugins/${encodeURIComponent(id)}`);
      return json({ id, version_id: "v1", url: "https://files.notion.example/finance.tar.gz" });
    } });
    const headers = { cookie: sessionCookie() };
    const library = await app(request("/skills", { headers }));
    expect(await library.text()).toContain(`/download/${encodeURIComponent(id)}`);
    const result = await app(request(`/download/${encodeURIComponent(id)}`, { headers }));
    expect(result.status).toBe(303);
    expect(urls).toHaveLength(3);
  });

  test.each(["%00bad", "a".repeat(201), "bad%7Fid", "%E0%A4", "raw/slash"])("rejects invalid download IDs before contacting Notion: %s", async (id) => {
    let calls = 0;
    const app = createWebApp(config, { fetch: async () => { calls++; return json({}); } });
    const result = await app(request(`/download/${id}`, { headers: { cookie: sessionCookie() } }));
    expect(result.status).toBe(502);
    expect(calls).toBe(0);
  });
});

test("web configuration validates origin and encryption key", () => {
  expect(loadWebConfig({})).toBeNull();
  const env = { WEB_BASE_URL: config.origin, NOTION_OAUTH_CLIENT_ID: config.clientId, NOTION_OAUTH_CLIENT_SECRET: config.clientSecret, WEB_SESSION_KEY: config.sessionKey };
  expect(loadWebConfig(env)).toEqual(config);
  expect(() => loadWebConfig({ ...env, WEB_BASE_URL: "http://public.example" })).toThrow();
  expect(() => loadWebConfig({ ...env, WEB_BASE_URL: "https://example.com/path" })).toThrow();
  expect(() => loadWebConfig({ ...env, WEB_SESSION_KEY: "short" })).toThrow();
});
