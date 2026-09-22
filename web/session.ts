import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import type { WebConfig } from "./config.ts";

export const SESSION_SECONDS = 8 * 60 * 60;
export const STATE_SECONDS = 10 * 60;
export type CookiePurpose = "session" | "state";

export interface Session {
  accessToken: string;
  workspaceName: string;
  workspaceId: string;
}

export function randomState(): string {
  return randomBytes(32).toString("base64url");
}

export function equalState(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Purpose-bound authenticated encryption prevents a state cookie becoming a session.
export function seal(config: WebConfig, purpose: CookiePurpose, value: unknown, seconds: number, now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(config.sessionKey, "hex"), iv);
  cipher.setAAD(Buffer.from(`${config.origin}:${purpose}:v1`));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify({ value, expires: now + seconds * 1000 }), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function unseal(config: WebConfig, purpose: CookiePurpose, value: string | undefined, now = Date.now()): unknown {
  if (!value || value.length > 3800) return null;
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(config.sessionKey, "hex"), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(`${config.origin}:${purpose}:v1`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload: unknown = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (!payload || typeof payload !== "object" || !("expires" in payload) ||
        typeof payload.expires !== "number" || payload.expires <= now || !("value" in payload)) return null;
    return payload.value;
  } catch {
    return null;
  }
}

export function cookieName(config: WebConfig, purpose: CookiePurpose): string {
  return `${config.origin.startsWith("https:") ? "__Host-" : ""}skills_${purpose}`;
}

export function cookie(config: WebConfig, purpose: CookiePurpose, value: string, seconds: number): string {
  if (value.length > 3800) throw new Error("Session exceeds the cookie size limit.");
  return `${cookieName(config, purpose)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${config.origin.startsWith("https:") ? "; Secure" : ""}`;
}

export function readCookie(request: Request, config: WebConfig, purpose: CookiePurpose): string | undefined {
  const prefix = `${cookieName(config, purpose)}=`;
  const matches = (request.headers.get("cookie") ?? "").split(";").map((s) => s.trim()).filter((s) => s.startsWith(prefix));
  return matches.length === 1 ? matches[0]!.slice(prefix.length) : undefined;
}

export function readSession(request: Request, config: WebConfig, now = Date.now()): Session | null {
  const value = unseal(config, "session", readCookie(request, config, "session"), now);
  if (!value || typeof value !== "object" || !("accessToken" in value) ||
      typeof value.accessToken !== "string" || !value.accessToken ||
      !("workspaceName" in value) || typeof value.workspaceName !== "string" ||
      !("workspaceId" in value) || typeof value.workspaceId !== "string") return null;
  return value as Session;
}
