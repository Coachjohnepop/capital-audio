/**
 * Admin auth: a single shared password (ADMIN_PASSWORD env var) exchanged
 * for an HttpOnly session cookie. If ADMIN_PASSWORD is unset (local dev),
 * the gate is open. Uses Web Crypto so it runs in both node and edge.
 */

export const ADMIN_COOKIE = "ca-admin";
const TOKEN_PAYLOAD = "capital-audio-admin-v1";

export async function adminToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(TOKEN_PAYLOAD)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidAdminCookie(
  cookieValue: string | undefined,
  password: string | undefined
): Promise<boolean> {
  if (!password) return true; // gate disabled in local dev
  if (!cookieValue) return false;
  return cookieValue === (await adminToken(password));
}
