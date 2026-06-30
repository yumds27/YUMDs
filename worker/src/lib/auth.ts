import type { Env } from "./env";

export interface StudentAuth { sub: number; email: string; role: "student"; exp: number; }
export interface AdminAuth   { sub: number; email: string; role: "admin";   exp: number; }
export type Auth = StudentAuth | AdminAuth;

// Fail-closed: if ADMIN_SECRET_KEY is unset, all token operations return null/false.
export function getSecret(env: Env): string | null {
  if (!env.ADMIN_SECRET_KEY) {
    console.error("[SECURITY] ADMIN_SECRET_KEY is not set — all auth denied (fail-closed). Run: wrangler secret put ADMIN_SECRET_KEY");
    return null;
  }
  return env.ADMIN_SECRET_KEY;
}

export async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const data = enc.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return btoa(JSON.stringify(payload)) + "." + btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function verifyToken(token: string, secret: string): Promise<Auth | null> {
  try {
    const [pb64, sb64] = token.split(".");
    if (!pb64 || !sb64) return null;
    const payload = JSON.parse(atob(pb64)) as Auth;
    if (payload.exp && Date.now() > payload.exp) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(atob(sb64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(JSON.stringify(payload)));
    return valid ? payload : null;
  } catch { return null; }
}

async function extractAuth(request: Request, env: Env): Promise<Auth | null> {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const secret = getSecret(env);
  if (!secret) return null;
  return verifyToken(token, secret);
}

export async function requireStudent(request: Request, env: Env): Promise<StudentAuth | null> {
  const auth = await extractAuth(request, env);
  return auth?.role === "student" ? (auth as StudentAuth) : null;
}

export async function requireAdmin(request: Request, env: Env): Promise<AdminAuth | null> {
  const auth = await extractAuth(request, env);
  return auth?.role === "admin" ? (auth as AdminAuth) : null;
}

export async function requireActiveSubscription(request: Request, env: Env): Promise<StudentAuth | null> {
  const student = await requireStudent(request, env);
  if (!student) return null;
  const sub = await env.DB.prepare(
    "SELECT status FROM subscriptions WHERE student_id = ?"
  ).bind(student.sub).first<{ status: string }>();
  return sub?.status === "active" ? student : null;
}
