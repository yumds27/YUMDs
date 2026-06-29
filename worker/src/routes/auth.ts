import type { Env } from "../lib/env";
import { json } from "../lib/http";
import { hashPassword, checkPassword } from "../lib/password";
import { getSecret, signToken, requireStudent } from "../lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email";
import { verifyGoogleIdToken } from "../lib/google";

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// KV-backed rate limiting on login by IP (5 attempts / 15 minutes)
const RL_MAX = 5, RL_WINDOW = 15 * 60;
async function checkRateLimit(ip: string, env: Env): Promise<boolean> {
  try {
    const raw = await env.CONFIG.get(`rl:login:${ip}`, "json") as { count: number; lockedUntil?: number } | null;
    if (!raw) return true;
    if (raw.lockedUntil && Date.now() < raw.lockedUntil) return false;
    return raw.count < RL_MAX;
  } catch { return true; }
}
async function incrementRL(ip: string, env: Env) {
  try {
    const raw = await env.CONFIG.get(`rl:login:${ip}`, "json") as { count: number; lockedUntil?: number } | null;
    const count = (raw?.count ?? 0) + 1;
    const val = count >= RL_MAX ? { count, lockedUntil: Date.now() + RL_WINDOW * 1000 } : { count };
    await env.CONFIG.put(`rl:login:${ip}`, JSON.stringify(val), { expirationTtl: RL_WINDOW });
  } catch {}
}
async function clearRL(ip: string, env: Env) {
  try { await env.CONFIG.delete(`rl:login:${ip}`); } catch {}
}

// ── Student signup ────────────────────────────────────────────
export async function handleSignup(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { email?: string; password?: string; name?: string; year?: number };
  const { email, password, name, year } = body;
  if (!email || !password || !name || !year) return json({ error: "email, password, name and year are required" }, { status: 400 });
  if (typeof year !== "number" || year < 1 || year > 6) return json({ error: "year must be 1–6" }, { status: 400 });
  if (password.length < 8) return json({ error: "password must be at least 8 characters" }, { status: 400 });
  const existing = await env.DB.prepare("SELECT id FROM students WHERE email=?").bind(email.toLowerCase()).first();
  if (existing) return json({ error: "an account with that email already exists" }, { status: 409 });
  const hash = await hashPassword(password);
  const { meta } = await env.DB.prepare(
    "INSERT INTO students (email, password_hash, name, current_year) VALUES (?,?,?,?)"
  ).bind(email.toLowerCase(), hash, name.trim(), year).run();
  const studentId = meta.last_row_id as number;
  const token = randomToken();
  await env.DB.prepare("INSERT INTO email_verifications (student_id, token, expires_at) VALUES (?,?,?)")
    .bind(studentId, token, Date.now() + 24 * 60 * 60 * 1000).run();
  await sendVerificationEmail(env, email, token);
  return json({ ok: true, message: "Account created. Check your email to verify your account before logging in." });
}

// ── Student login ─────────────────────────────────────────────
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (!await checkRateLimit(ip, env)) return json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429 });
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password) return json({ error: "email and password are required" }, { status: 400 });
  const student = await env.DB.prepare(
    "SELECT id, email, name, password_hash, email_verified, current_year FROM students WHERE email=?"
  ).bind(email.toLowerCase()).first<{ id: number; email: string; name: string; password_hash: string; email_verified: number; current_year: number }>();
  const valid = student?.password_hash && await checkPassword(password, student.password_hash);
  if (!student || !valid) {
    await incrementRL(ip, env);
    return json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (!student.email_verified) return json({ error: "Please verify your email address before logging in." }, { status: 403 });
  await clearRL(ip, env);
  const secret = getSecret(env);
  if (!secret) return json({ error: "Auth not configured on this server." }, { status: 500 });
  const token = await signToken({ sub: student.id, email: student.email, role: "student", exp: Date.now() + SESSION_TTL }, secret);
  return json({ ok: true, token, student: { id: student.id, email: student.email, name: student.name, year: student.current_year } });
}

// ── Google Sign-In (JWKS verification + merge-by-email) ───────
export async function handleGoogleSignIn(request: Request, env: Env): Promise<Response> {
  const { credential } = await request.json() as { credential?: string };
  if (!credential) return json({ error: "credential is required" }, { status: 400 });
  const gp = await verifyGoogleIdToken(credential, env);
  if (!gp) return json({ error: "Invalid Google credential." }, { status: 401 });
  let student = await env.DB.prepare(
    "SELECT id, email, name, current_year FROM students WHERE email=? OR google_sub=?"
  ).bind(gp.email.toLowerCase(), gp.sub).first<{ id: number; email: string; name: string; current_year: number }>();
  if (!student) {
    const { meta } = await env.DB.prepare(
      "INSERT INTO students (email, google_sub, name, current_year, email_verified) VALUES (?,?,?,1,1)"
    ).bind(gp.email.toLowerCase(), gp.sub, gp.name ?? gp.email.split("@")[0], 1).run();
    student = { id: meta.last_row_id as number, email: gp.email.toLowerCase(), name: gp.name ?? "", current_year: 1 };
  } else {
    await env.DB.prepare("UPDATE students SET google_sub=?, email_verified=1 WHERE id=?").bind(gp.sub, student.id).run();
  }
  const secret = getSecret(env);
  if (!secret) return json({ error: "Auth not configured on this server." }, { status: 500 });
  const token = await signToken({ sub: student.id, email: student.email, role: "student", exp: Date.now() + SESSION_TTL }, secret);
  return json({ ok: true, token, student: { id: student.id, email: student.email, name: student.name, year: student.current_year } });
}

// ── Email verification ────────────────────────────────────────
export async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return json({ error: "token is required" }, { status: 400 });
  const row = await env.DB.prepare("SELECT student_id, expires_at, used_at FROM email_verifications WHERE token=?")
    .bind(token).first<{ student_id: number; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at) return json({ error: "Invalid or already-used token." }, { status: 400 });
  if (Date.now() > row.expires_at) return json({ error: "This verification link has expired. Please sign up again." }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("UPDATE students SET email_verified=1 WHERE id=?").bind(row.student_id),
    env.DB.prepare("UPDATE email_verifications SET used_at=? WHERE token=?").bind(Date.now(), token),
  ]);
  return Response.redirect("https://yarmoukmds.com/login?verified=1", 302);
}

// ── Forgot password ───────────────────────────────────────────
export async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  const { email } = await request.json() as { email?: string };
  if (!email) return json({ error: "email is required" }, { status: 400 });
  const student = await env.DB.prepare("SELECT id FROM students WHERE email=?").bind(email.toLowerCase()).first<{ id: number }>();
  if (student) {
    const token = randomToken();
    await env.DB.prepare("INSERT INTO password_resets (student_id, token, expires_at) VALUES (?,?,?)")
      .bind(student.id, token, Date.now() + 60 * 60 * 1000).run();
    await sendPasswordResetEmail(env, email, token);
  }
  // Always return ok — don't reveal whether the email exists
  return json({ ok: true, message: "If that email is registered, a reset link has been sent." });
}

// ── Reset password ────────────────────────────────────────────
export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  const { token, password } = await request.json() as { token?: string; password?: string };
  if (!token || !password) return json({ error: "token and password are required" }, { status: 400 });
  if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const row = await env.DB.prepare("SELECT student_id, expires_at, used_at FROM password_resets WHERE token=?")
    .bind(token).first<{ student_id: number; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at) return json({ error: "Invalid or already-used reset link." }, { status: 400 });
  if (Date.now() > row.expires_at) return json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
  const hash = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare("UPDATE students SET password_hash=? WHERE id=?").bind(hash, row.student_id),
    env.DB.prepare("UPDATE password_resets SET used_at=? WHERE token=?").bind(Date.now(), token),
  ]);
  return json({ ok: true, message: "Password updated. You can now log in." });
}

// ── /api/auth/me ──────────────────────────────────────────────
export async function handleMe(request: Request, env: Env): Promise<Response> {
  const auth = await requireStudent(request, env);
  if (!auth) return json({ error: "Unauthorized" }, { status: 401 });
  const student = await env.DB.prepare("SELECT id, email, name, current_year, email_verified, created_at FROM students WHERE id=?")
    .bind(auth.sub).first();
  if (!student) return json({ error: "Student not found." }, { status: 404 });
  return json({ student });
}

// ── Admin login ───────────────────────────────────────────────
export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password) return json({ error: "email and password are required" }, { status: 400 });
  const admin = await env.DB.prepare("SELECT id, email, password_hash FROM admins WHERE email=?")
    .bind(email.toLowerCase()).first<{ id: number; email: string; password_hash: string }>();
  if (!admin || !await checkPassword(password, admin.password_hash)) return json({ error: "Invalid credentials." }, { status: 401 });
  await env.DB.prepare("INSERT INTO admin_audit_log (admin_id, action) VALUES (?,?)").bind(admin.id, "admin.login").run();
  const secret = getSecret(env);
  if (!secret) return json({ error: "Auth not configured on this server." }, { status: 500 });
  const token = await signToken({ sub: admin.id, email: admin.email, role: "admin", exp: Date.now() + SESSION_TTL }, secret);
  return json({ ok: true, token, admin: { id: admin.id, email: admin.email } });
}
