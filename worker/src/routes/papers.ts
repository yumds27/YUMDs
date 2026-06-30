import type { Env } from "../lib/env";
import { json } from "../lib/http";
import { requireStudent, requireAdmin } from "../lib/auth";

// ── Student ───────────────────────────────────────────────────

export async function handleGetPapers(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const year = new URL(request.url).searchParams.get("year");
  if (!year) return json({ error: "year required" }, { status: 400 });
  const { results } = await env.DB.prepare(`
    SELECT p.id, p.name, p.display_order,
           s.name AS subject_name,
           COUNT(q.id) AS question_count
    FROM past_papers p
    LEFT JOIN subjects s ON s.id = p.subject_id
    LEFT JOIN questions q ON q.paper_id = p.id
    WHERE p.year = ?
    GROUP BY p.id
    ORDER BY p.display_order, p.name
  `).bind(Number(year)).all();
  return json({ papers: results });
}

export async function handleGetQuestions(request: Request, env: Env, paperId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(`
    SELECT id, body, option_a, option_b, option_c, option_d, option_e, display_order
    FROM questions WHERE paper_id = ? ORDER BY display_order, id
  `).bind(Number(paperId)).all();
  return json({ questions: results });
}

// Returns correct answer + explanation only for submitted answers
export async function handleCheckAnswer(request: Request, env: Env, questionId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { answer } = await request.json() as { answer?: string };
  if (!answer) return json({ error: "answer required" }, { status: 400 });
  const row = await env.DB.prepare("SELECT correct, explanation FROM questions WHERE id=?")
    .bind(Number(questionId)).first<{ correct: string; explanation: string | null }>();
  if (!row) return json({ error: "not found" }, { status: 404 });
  return json({ correct: row.correct, explanation: row.explanation, isCorrect: answer === row.correct });
}

// ── Admin ─────────────────────────────────────────────────────

export async function handleAdminCreatePaper(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { name, year, subject_id, display_order = 0 } = await request.json() as any;
  if (!name || !year) return json({ error: "name and year required" }, { status: 400 });
  const { meta } = await env.DB.prepare(
    "INSERT INTO past_papers (name, year, subject_id, display_order) VALUES (?,?,?,?)"
  ).bind(name.trim(), year, subject_id ?? null, display_order).run();
  return json({ id: meta.last_row_id, name, year, subject_id, display_order }, { status: 201 });
}

export async function handleAdminUpdatePaper(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { name, display_order } = await request.json() as any;
  await env.DB.prepare("UPDATE past_papers SET name=?, display_order=? WHERE id=?")
    .bind(name.trim(), display_order ?? 0, Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminDeletePaper(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  await env.DB.prepare("DELETE FROM past_papers WHERE id=?").bind(Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminCreateQuestion(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { paper_id, body, option_a, option_b, option_c, option_d, option_e, correct, explanation, display_order = 0 } = await request.json() as any;
  if (!paper_id || !body || !option_a || !option_b || !option_c || !option_d || !correct) {
    return json({ error: "paper_id, body, options a-d, and correct are required" }, { status: 400 });
  }
  if (!["a","b","c","d","e"].includes(correct)) return json({ error: "correct must be a-e" }, { status: 400 });
  const { meta } = await env.DB.prepare(`
    INSERT INTO questions (paper_id, body, option_a, option_b, option_c, option_d, option_e, correct, explanation, display_order)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).bind(paper_id, body.trim(), option_a.trim(), option_b.trim(), option_c.trim(), option_d.trim(), option_e?.trim() ?? null, correct, explanation?.trim() ?? null, display_order).run();
  return json({ id: meta.last_row_id }, { status: 201 });
}

export async function handleAdminUpdateQuestion(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { body, option_a, option_b, option_c, option_d, option_e, correct, explanation, display_order } = await request.json() as any;
  await env.DB.prepare(`
    UPDATE questions SET body=?, option_a=?, option_b=?, option_c=?, option_d=?, option_e=?, correct=?, explanation=?, display_order=?
    WHERE id=?
  `).bind(body, option_a, option_b, option_c, option_d, option_e ?? null, correct, explanation ?? null, display_order ?? 0, Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminDeleteQuestion(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  await env.DB.prepare("DELETE FROM questions WHERE id=?").bind(Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminListQuestions(request: Request, env: Env, paperId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(
    "SELECT id, body, option_a, option_b, option_c, option_d, option_e, correct, explanation, display_order FROM questions WHERE paper_id=? ORDER BY display_order, id"
  ).bind(Number(paperId)).all();
  return json({ questions: results });
}

export async function handleAdminImportQuestions(request: Request, env: Env, paperId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { questions } = await request.json() as { questions: any[] };
  if (!Array.isArray(questions) || questions.length === 0)
    return json({ error: "questions array required" }, { status: 400 });
  let count = 0;
  for (const q of questions) {
    const { body, option_a, option_b, option_c, option_d, option_e, correct, explanation } = q;
    if (!body?.trim() || !option_a?.trim() || !option_b?.trim() || !option_c?.trim() || !option_d?.trim() || !correct) continue;
    if (!["a","b","c","d","e"].includes(correct)) continue;
    await env.DB.prepare(`
      INSERT INTO questions (paper_id, body, option_a, option_b, option_c, option_d, option_e, correct, explanation, display_order)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(Number(paperId), body.trim(), option_a.trim(), option_b.trim(), option_c.trim(), option_d.trim(),
            option_e?.trim() ?? null, correct, explanation?.trim() ?? null, count).run();
    count++;
  }
  return json({ ok: true, count }, { status: 201 });
}
