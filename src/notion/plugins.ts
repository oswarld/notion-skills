// The Plugins Public API. `list` is cheap; `retrieve` is expensive server-side
// (render + attachment fetch + upload of a whole plugin), so use the plugin's
// `version_id` to skip it.
//
// No per-row publish flag: the API returns every live plugin the token can
// read, so access to the connection is what governs what a consumer sees.
//
// The plugin is the only unit here. `list` reports a plugin's identity and
// version; `/v1/ai/plugins/:id` yields a signed `.tar.gz` for the whole plugin,
// laid out to the Agent Plugins 1.0 standard. The API also supports individual
// skill downloads; this sync uses whole plugins and preserves their contents.

import { extractPluginArchive, type PluginFiles } from "./archive.ts";
import { NotionApiError, type NotionHttp, type PaginatedList } from "./http.ts";

/** Exactly what `/v1/ai/plugins` reports for one plugin. */
export interface Plugin {
  id: string;
  /** Display name; slugified into a directory name by the sync. */
  name: string;
  description: string;
  /** Opaque hash covering the whole plugin; compare for equality. */
  version_id: string;
}

/** What `/v1/ai/plugins/:id` returns: a signed URL to the plugin's archive. */
export interface PluginArchiveRef {
  id: string;
  version_id: string;
  /** Short-lived signed URL for the whole plugin's .tar.gz. */
  url: string;
}

export interface ListPluginsArgs {
  start_cursor?: string | null;
  page_size?: number;
}

const PLUGINS_PATH = "/v1/ai/plugins";

/** Plugin IDs are opaque strings, not necessarily UUIDs. */
export function isPluginId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200 &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reject incomplete listings before a consumer can treat them as deletions. */
export function parsePluginList(value: unknown): PaginatedList<Plugin> {
  if (!record(value) || !Array.isArray(value.results) || typeof value.has_more !== "boolean") {
    throw new Error("Invalid Notion plugin list: expected results and has_more.");
  }
  const cursor = value.next_cursor;
  if ((cursor !== undefined && cursor !== null && typeof cursor !== "string") ||
      (value.has_more && (typeof cursor !== "string" || !cursor.trim()))) {
    throw new Error("Invalid Notion plugin list: has_more requires a next_cursor.");
  }
  const results = value.results.map((plugin): Plugin => {
    if (!record(plugin) || !isPluginId(plugin.id) || typeof plugin.name !== "string" ||
        typeof plugin.description !== "string" || typeof plugin.version_id !== "string" ||
        !plugin.version_id.trim()) {
      throw new Error("Invalid Notion plugin list: malformed plugin metadata.");
    }
    return { id: plugin.id, name: plugin.name, description: plugin.description, version_id: plugin.version_id };
  });
  return { object: "list", results, has_more: value.has_more, next_cursor: cursor ?? null };
}

export class PluginResource {
  constructor(private readonly http: NotionHttp) {}

  async list(args: ListPluginsArgs = {}): Promise<PaginatedList<Plugin>> {
    return parsePluginList(await request<unknown>(this.http, {
      path: PLUGINS_PATH,
      query: { start_cursor: args.start_cursor, page_size: args.page_size ?? 100 },
    }));
  }

  /** Return only after every page succeeds; a partial list must never be pruned. */
  async listAll(args: ListPluginsArgs = {}): Promise<Plugin[]> {
    const items: Plugin[] = [];
    const cursors = new Set<string>();
    const ids = new Set<string>();
    let cursor = args.start_cursor;
    if (cursor) cursors.add(cursor);
    for (;;) {
      const page = await this.list({ ...args, start_cursor: cursor });
      for (const plugin of page.results) {
        if (ids.has(plugin.id)) throw new Error("Invalid Notion plugin list: duplicate plugin ID.");
        ids.add(plugin.id);
        items.push(plugin);
      }
      if (page.has_more === false) return items;
      cursor = page.next_cursor;
      if (!cursor || cursors.has(cursor)) {
        throw new Error("Invalid Notion plugin list: missing or repeated pagination cursor.");
      }
      cursors.add(cursor);
    }
  }

  retrieve({ plugin_id }: { plugin_id: string }): Promise<PluginArchiveRef> {
    return request<PluginArchiveRef>(this.http, {
      path: `${PLUGINS_PATH}/${encodeURIComponent(plugin_id)}`,
    });
  }

  /** Download a plugin's archive and extract the files its directory needs. */
  async files({ plugin_id }: { plugin_id: string }): Promise<PluginFiles> {
    const { url } = await this.retrieve({ plugin_id });
    // `fetchBytes`, not a bare fetch: signed-URL downloads are the bulk of a
    // cold sync's requests, and a dropped one has to retry rather than fail
    // the run.
    return extractPluginArchive(await this.http.fetchBytes(url, `plugin ${plugin_id} archive`));
  }
}

// Use the public API's documented errors, without internal feature-gate advice.
async function request<T>(
  http: NotionHttp,
  args: { path: string; query?: Record<string, string | number | undefined | null> },
): Promise<T> {
  try {
    return await http.request<T>(args);
  } catch (err) {
    if (!NotionApiError.is(err) || err.hint) throw err;
    if (err.status === 403 && err.code === "restricted_resource") {
      throw err.withHint(
        "  The token needs the Read content capability. Also check that the " +
          "skills databases are shared with the connection; unshared skills are omitted.",
      );
    }
    if (err.status === 401) {
      throw err.withHint("  The Notion access token is missing or invalid.");
    }
    if (err.status === 400 && err.code === "invalid_request_url") {
      throw err.withHint(
        "  Check the API base URL, /v1/ai/plugins route, and Notion-Version: 2026-03-11.",
      );
    }
    throw err;
  }
}
