import type { Env } from "../lib/env";
import { json } from "../lib/http";
import { requireStudent } from "../lib/auth";
import { requireAdmin } from "../lib/auth";

// ── Student: browse ───────────────────────────────────────────

export async function handleGetSubjects(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const year = new URL(request.url).searchParams.get("year");
  if (!year || isNaN(Number(year))) return json({ error: "year param required" }, { status: 400 });
  const { results } = await env.DB.prepare(
    "SELECT id, name, display_order, icon_key FROM subjects WHERE year=? ORDER BY display_order, name"
  ).bind(Number(year)).all();
  return json({ subjects: results });
}

// All files for a subject, grouped into categories (topics)
export async function handleGetSubjectFiles(request: Request, env: Env, subjectId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const subject = await env.DB.prepare("SELECT id, name, year FROM subjects WHERE id=?")
    .bind(Number(subjectId)).first<{ id: number; name: string; year: number }>();
  if (!subject) return json({ error: "not found" }, { status: 404 });
  const { results } = await env.DB.prepare(`
    SELECT f.id, f.name, f.content_type, f.size_bytes,
           t.id AS topic_id, t.name AS topic_name, t.display_order AS topic_order
    FROM files f
    JOIN topics t ON t.id = f.topic_id
    WHERE t.subject_id = ?
    ORDER BY t.display_order ASC, t.name ASC, f.name ASC
  `).bind(Number(subjectId)).all();
  // Group by topic on the server
  const topicMap = new Map<number, { id: number; name: string; files: any[] }>();
  for (const row of results as any[]) {
    if (!topicMap.has(row.topic_id)) {
      topicMap.set(row.topic_id, { id: row.topic_id, name: row.topic_name, files: [] });
    }
    topicMap.get(row.topic_id)!.files.push({
      id: row.id, name: row.name, content_type: row.content_type, size_bytes: row.size_bytes,
    });
  }
  return json({ subject, categories: Array.from(topicMap.values()) });
}

export async function handleGetTopics(request: Request, env: Env, subjectId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(
    "SELECT id, name, display_order FROM topics WHERE subject_id=? ORDER BY display_order, name"
  ).bind(Number(subjectId)).all();
  return json({ topics: results });
}

export async function handleGetFiles(request: Request, env: Env, topicId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(
    "SELECT id, name, content_type, size_bytes, created_at FROM files WHERE topic_id=? ORDER BY created_at"
  ).bind(Number(topicId)).all();
  return json({ files: results });
}

// Short-lived view token stored in KV so files can be opened in a new tab
export async function handleGetFileUrl(request: Request, env: Env, fileId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const file = await env.DB.prepare("SELECT r2_key FROM files WHERE id=?")
    .bind(Number(fileId)).first<{ r2_key: string }>();
  if (!file) return json({ error: "not found" }, { status: 404 });
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  await env.CONFIG.put(`viewtoken:${token}`, JSON.stringify({ fileId, studentId: student.sub }), { expirationTtl: 900 });
  return json({ url: `/api/content/view/${fileId}?token=${token}` });
}

// Streams file from R2 — token validated from KV (15 min TTL, single-use)
export async function handleViewFile(request: Request, env: Env, fileId: string): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response("missing token", { status: 401 });
  const raw = await env.CONFIG.get(`viewtoken:${token}`);
  if (!raw) return new Response("invalid or expired token", { status: 401 });
  const { fileId: tokenFileId } = JSON.parse(raw) as { fileId: number; studentId: number };
  if (String(tokenFileId) !== fileId) return new Response("token mismatch", { status: 401 });
  await env.CONFIG.delete(`viewtoken:${token}`);
  const file = await env.DB.prepare("SELECT r2_key, content_type, name FROM files WHERE id=?")
    .bind(Number(fileId)).first<{ r2_key: string; content_type: string; name: string }>();
  if (!file) return new Response("not found", { status: 404 });
  const obj = await env.FILES.get(file.r2_key);
  if (!obj) return new Response("file not found in storage", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": file.content_type,
      "content-disposition": `inline; filename="${file.name}"`,
      "cache-control": "private, max-age=900",
    },
  });
}

// Serve subject icon from R2 — no auth needed (decorative image, browser <img> tag)
export async function handleGetSubjectIcon(_request: Request, env: Env, subjectId: string): Promise<Response> {
  const subject = await env.DB.prepare("SELECT icon_key FROM subjects WHERE id=?")
    .bind(Number(subjectId)).first<{ icon_key: string | null }>();
  if (!subject?.icon_key) return new Response("no icon", { status: 404 });
  const obj = await env.FILES.get(subject.icon_key);
  if (!obj) return new Response("icon not found in storage", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/png",
      "cache-control": "public, max-age=604800",
    },
  });
}

// ── Admin: CRUD ───────────────────────────────────────────────

export async function handleAdminCreateSubject(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { name, year, display_order = 0 } = await request.json() as any;
  if (!name || !year) return json({ error: "name and year required" }, { status: 400 });
  if (year < 1 || year > 6) return json({ error: "year must be 1-6" }, { status: 400 });
  const { meta } = await env.DB.prepare(
    "INSERT INTO subjects (name, year, display_order) VALUES (?,?,?)"
  ).bind(name.trim(), year, display_order).run();
  return json({ id: meta.last_row_id, name, year, display_order }, { status: 201 });
}

export async function handleAdminUpdateSubject(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { name, display_order } = await request.json() as any;
  await env.DB.prepare("UPDATE subjects SET name=?, display_order=? WHERE id=?")
    .bind(name.trim(), display_order ?? 0, Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminDeleteSubject(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  await env.DB.prepare("DELETE FROM subjects WHERE id=?").bind(Number(id)).run();
  return json({ ok: true });
}

// Upload/replace icon for a subject
export async function handleAdminUploadSubjectIcon(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const form = await request.formData();
  const icon = form.get("icon") as File | null;
  if (!icon) return json({ error: "icon file required" }, { status: 400 });
  if (!icon.type.startsWith("image/")) return json({ error: "file must be an image" }, { status: 400 });
  const r2Key = `subject-icons/${id}`;
  await env.FILES.put(r2Key, icon.stream(), {
    httpMetadata: { contentType: icon.type },
  });
  await env.DB.prepare("UPDATE subjects SET icon_key=? WHERE id=?").bind(r2Key, Number(id)).run();
  return json({ ok: true, icon_key: r2Key });
}

export async function handleAdminCreateTopic(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { name, subject_id, display_order = 0 } = await request.json() as any;
  if (!name || !subject_id) return json({ error: "name and subject_id required" }, { status: 400 });
  const { meta } = await env.DB.prepare(
    "INSERT INTO topics (subject_id, name, display_order) VALUES (?,?,?)"
  ).bind(subject_id, name.trim(), display_order).run();
  return json({ id: meta.last_row_id, name, subject_id, display_order }, { status: 201 });
}

export async function handleAdminUpdateTopic(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { name, display_order } = await request.json() as any;
  await env.DB.prepare("UPDATE topics SET name=?, display_order=? WHERE id=?")
    .bind(name.trim(), display_order ?? 0, Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminDeleteTopic(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  await env.DB.prepare("DELETE FROM topics WHERE id=?").bind(Number(id)).run();
  return json({ ok: true });
}

// Upload file via multipart form: fields = topic_id, file (binary)
export async function handleAdminUploadFile(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const form = await request.formData();
  const topicId = form.get("topic_id");
  const file = form.get("file") as File | null;
  if (!topicId || !file) return json({ error: "topic_id and file required" }, { status: 400 });
  const topic = await env.DB.prepare("SELECT id FROM topics WHERE id=?").bind(Number(topicId)).first();
  if (!topic) return json({ error: "topic not found" }, { status: 404 });
  const ext = file.name.split(".").pop() ?? "bin";
  const r2Key = `files/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await env.FILES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  const { meta } = await env.DB.prepare(
    "INSERT INTO files (topic_id, name, r2_key, content_type, size_bytes, uploaded_by) VALUES (?,?,?,?,?,?)"
  ).bind(Number(topicId), file.name, r2Key, file.type || "application/pdf", file.size, admin.sub).run();
  return json({ id: meta.last_row_id, name: file.name, r2_key: r2Key }, { status: 201 });
}

export async function handleAdminDeleteFile(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const file = await env.DB.prepare("SELECT r2_key FROM files WHERE id=?")
    .bind(Number(id)).first<{ r2_key: string }>();
  if (!file) return json({ error: "not found" }, { status: 404 });
  await env.FILES.delete(file.r2_key);
  await env.DB.prepare("DELETE FROM files WHERE id=?").bind(Number(id)).run();
  return json({ ok: true });
}
