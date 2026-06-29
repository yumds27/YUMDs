import type { Env } from "./env";

function b64urlBytes(s: string): Uint8Array {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const b = atob(s);
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
const b64urlStr = (s: string) => new TextDecoder().decode(b64urlBytes(s));

async function getGoogleJWKS(env: Env): Promise<JsonWebKey[]> {
  try {
    const c = await env.CONFIG.get("google_jwks", "json") as { keys: JsonWebKey[]; exp: number } | null;
    if (c && c.exp > Date.now() && Array.isArray(c.keys)) return c.keys;
  } catch {}
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!r.ok) throw new Error("JWKS fetch " + r.status);
  const j = await r.json() as { keys: JsonWebKey[] };
  try { await env.CONFIG.put("google_jwks", JSON.stringify({ keys: j.keys, exp: Date.now() + 3_600_000 }), { expirationTtl: 3600 }); } catch {}
  return j.keys;
}

export interface GooglePayload { sub: string; email: string; email_verified: boolean; name?: string; }

export async function verifyGoogleIdToken(idToken: string, env: Env): Promise<GooglePayload | null> {
  try {
    const [h, p, s] = String(idToken).split(".");
    if (!h || !p || !s) return null;
    const header = JSON.parse(b64urlStr(h)) as { alg: string; kid: string };
    if (header.alg !== "RS256") return null;
    const keys = await getGoogleJWKS(env);
    const jwk = keys.find((k) => (k as Record<string, unknown>).kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const payload = JSON.parse(b64urlStr(p)) as { iss: string; aud: string; sub: string; email: string; email_verified: boolean; name?: string; exp: number };
    if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) return null;
    if (env.GOOGLE_OAUTH_CLIENT_ID && payload.aud !== env.GOOGLE_OAUTH_CLIENT_ID) return null;
    if (!payload.exp || Date.now() >= payload.exp * 1000) return null;
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email, email_verified: payload.email_verified, name: payload.name };
  } catch { return null; }
}
