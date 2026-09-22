export interface WebConfig {
  origin: string;
  clientId: string;
  clientSecret: string;
  sessionKey: string;
}

export const CALLBACK_PATH = "/auth/notion/callback";

export function loadWebConfig(env: NodeJS.ProcessEnv = process.env): WebConfig | null {
  const origin = env.WEB_BASE_URL?.trim();
  const clientId = env.NOTION_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.NOTION_OAUTH_CLIENT_SECRET?.trim();
  const sessionKey = env.WEB_SESSION_KEY?.trim();
  if (!origin || !clientId || !clientSecret || !sessionKey) return null;
  const url = new URL(origin);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("WEB_BASE_URL must be an HTTPS origin (HTTP is allowed on loopback for development).");
  }
  if (!/^[a-f0-9]{64}$/i.test(sessionKey)) {
    throw new Error("WEB_SESSION_KEY must contain 32 random bytes encoded as 64 hexadecimal characters.");
  }
  return { origin: url.origin, clientId, clientSecret, sessionKey };
}
