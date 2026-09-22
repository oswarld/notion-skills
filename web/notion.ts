import { CALLBACK_PATH, type WebConfig } from "./config.ts";
import type { Session } from "./session.ts";
import { isPluginId, parsePluginList, type Plugin } from "../src/notion/plugins.ts";
import { DEFAULT_NOTION_VERSION, type PaginatedList } from "../src/notion/http.ts";

export type WebFetch = (url: string, init?: RequestInit) => Promise<Response>;

export class ConnectionError extends Error {
  constructor(readonly kind: "expired" | "permissions" | "unavailable" | "invalid") {
    super(kind);
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function authorizationUrl(config: WebConfig, state: string): string {
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: config.origin + CALLBACK_PATH,
    state,
  }).toString();
  return url.href;
}

async function oauthRequest(config: WebConfig, path: string, body: unknown, fetchImpl: WebFetch): Promise<Response> {
  return fetchImpl(`https://api.notion.com/v1/oauth/${path}`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      "Notion-Version": DEFAULT_NOTION_VERSION,
    },
    body: JSON.stringify(body),
  });
}

export async function exchangeCode(config: WebConfig, code: string, fetchImpl: WebFetch): Promise<Session> {
  const response = await oauthRequest(config, "token", {
    grant_type: "authorization_code", code, redirect_uri: config.origin + CALLBACK_PATH,
  }, fetchImpl);
  // Provider error bodies can contain credentials. Never forward or log them.
  if (!response.ok) throw new ConnectionError("invalid");
  const data: unknown = await response.json();
  if (!record(data) || typeof data.access_token !== "string" || !data.access_token ||
      data.access_token.length > 1024 || typeof data.workspace_id !== "string" ||
      data.workspace_id.length > 100) throw new ConnectionError("invalid");
  return {
    accessToken: data.access_token,
    workspaceId: data.workspace_id,
    workspaceName: typeof data.workspace_name === "string" ? data.workspace_name.slice(0, 200) : "내 워크스페이스",
  };
}

export async function revokeSession(config: WebConfig, session: Session, fetchImpl: WebFetch): Promise<void> {
  const response = await oauthRequest(config, "revoke", { token: session.accessToken }, fetchImpl);
  if (!response.ok) throw new ConnectionError("unavailable");
}

async function apiGet(session: Session, path: string, fetchImpl: WebFetch): Promise<unknown> {
  const response = await fetchImpl(`https://api.notion.com${path}`, {
    method: "GET", redirect: "error", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${session.accessToken}`, "Notion-Version": DEFAULT_NOTION_VERSION },
  });
  if (response.status === 401) throw new ConnectionError("expired");
  if (response.status === 403 || response.status === 404) throw new ConnectionError("permissions");
  if (!response.ok) throw new ConnectionError("unavailable");
  return response.json();
}

export async function listPlugins(session: Session, fetchImpl: WebFetch): Promise<Plugin[]> {
  const plugins: Plugin[] = [];
  const seen = new Set<string>();
  const ids = new Set<string>();
  let cursor: string | undefined;
  // Bound a malformed provider response rather than looping indefinitely.
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);
    const response = await apiGet(session, `/v1/ai/plugins?${query}`, fetchImpl);
    let data: PaginatedList<Plugin>;
    try {
      data = parsePluginList(response);
    } catch {
      throw new ConnectionError("unavailable");
    }
    for (const plugin of data.results) {
      if (ids.has(plugin.id)) throw new ConnectionError("unavailable");
      ids.add(plugin.id);
      plugins.push(plugin);
    }
    if (data.has_more === false) return plugins;
    if (typeof data.next_cursor !== "string" || !data.next_cursor || seen.has(data.next_cursor)) throw new ConnectionError("unavailable");
    cursor = data.next_cursor;
    seen.add(cursor);
  }
  throw new ConnectionError("unavailable");
}

export async function pluginDownload(session: Session, pluginId: string, fetchImpl: WebFetch): Promise<string> {
  if (!isPluginId(pluginId)) throw new ConnectionError("invalid");
  // Recheck this user's current access; never accept a download URL from a client.
  const plugins = await listPlugins(session, fetchImpl);
  if (!plugins.some((plugin) => plugin.id === pluginId)) throw new ConnectionError("permissions");
  const data = await apiGet(session, `/v1/ai/plugins/${encodeURIComponent(pluginId)}`, fetchImpl);
  if (!record(data) || typeof data.url !== "string") throw new ConnectionError("unavailable");
  const url = new URL(data.url);
  if (url.protocol !== "https:" || url.username || url.password) throw new ConnectionError("unavailable");
  // The archive goes from Notion's storage straight to its authorized user's browser.
  // This also avoids unbounded archive decompression in the shared web service.
  return url.href;
}
