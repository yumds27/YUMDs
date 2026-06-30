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
  const row = await env.DB.prepare(
    "SELECT correct, explanation, explanation_image, explanation_svg FROM questions WHERE id=?"
  ).bind(Number(questionId)).first<{
    correct: string; explanation: string | null;
    explanation_image: string | null; explanation_svg: string | null;
  }>();
  if (!row) return json({ error: "not found" }, { status: 404 });
  return json({
    correct: row.correct,
    explanation: row.explanation,
    explanation_image: row.explanation_image ?? null,
    explanation_svg: row.explanation_svg ?? null,
    isCorrect: answer === row.correct,
  });
}

// Serve explanation image from R2
export async function handleGetExplanationImage(request: Request, env: Env, questionId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const row = await env.DB.prepare("SELECT explanation_image FROM questions WHERE id=?")
    .bind(Number(questionId)).first<{ explanation_image: string | null }>();
  if (!row?.explanation_image) return json({ error: "not found" }, { status: 404 });
  const obj = await env.FILES.get(row.explanation_image);
  if (!obj) return json({ error: "not found" }, { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": obj.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "public, max-age=86400" },
  });
}

// Admin: upload explanation image
export async function handleAdminUploadExplanationImage(request: Request, env: Env, questionId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return json({ error: "file required" }, { status: 400 });
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const key = `question-images/q${questionId}.${ext}`;
  await env.FILES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "image/jpeg" },
  });
  await env.DB.prepare("UPDATE questions SET explanation_image=? WHERE id=?")
    .bind(key, Number(questionId)).run();
  return json({ ok: true });
}

// Admin: generate SVG diagram via Claude
export async function handleAdminGenerateSvg(request: Request, env: Env, questionId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  if (!env.CLAUDE_API_KEY) return json({ error: "Claude API key not configured" }, { status: 503 });
  const row = await env.DB.prepare("SELECT body, explanation FROM questions WHERE id=?")
    .bind(Number(questionId)).first<{ body: string; explanation: string | null }>();
  if (!row) return json({ error: "not found" }, { status: 404 });

  const prompt = `You are a medical illustrator. Generate a clean, educational SVG diagram (viewBox="0 0 420 280") that visually illustrates the key anatomical or physiological concept in the question below.

Rules:
- Output ONLY the SVG element, starting with <svg and ending with </svg>
- Use simple shapes: rect, circle, ellipse, path, line, text
- Include clear text labels for anatomical structures
- Use a white or transparent background
- Use professional colors (muted, not garish)
- Keep it simple and educational, not decorative

Question: ${row.body}
Explanation: ${row.explanation ?? "(no explanation)"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json() as any;
  const text = data.content?.[0]?.text ?? "";
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return json({ error: "generation failed" }, { status: 500 });
  const svg = match[0];
  await env.DB.prepare("UPDATE questions SET explanation_svg=? WHERE id=?")
    .bind(svg, Number(questionId)).run();
  return json({ svg });
}

// ── Progress ──────────────────────────────────────────────────

export async function handleRecordSession(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { paper_id, paper_name, mode, score, total, time_sec, answers, marked_ids } = await request.json() as any;
  if (!paper_id || !mode || score === undefined || !total) {
    return json({ error: "paper_id, mode, score, total required" }, { status: 400 });
  }
  const { meta } = await env.DB.prepare(`
    INSERT INTO student_paper_sessions (student_id, paper_id, paper_name, mode, score, total, time_sec, marked_ids)
    VALUES (?,?,?,?,?,?,?,?)
  `).bind(
    student.sub, paper_id, paper_name ?? null, mode, score, total,
    time_sec ?? 0, JSON.stringify(marked_ids ?? [])
  ).run();
  const sessionId = meta.last_row_id;
  if (Array.isArray(answers) && answers.length > 0) {
    for (const a of answers) {
      try {
        await env.DB.prepare(
          "INSERT INTO student_session_answers (session_id, question_id, chosen, is_correct) VALUES (?,?,?,?)"
        ).bind(sessionId, a.question_id, a.chosen ?? null, a.is_correct ? 1 : 0).run();
      } catch {}
    }
  }
  return json({ id: sessionId }, { status: 201 });
}

export async function handleGetSessions(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(`
    SELECT id, paper_id, paper_name, mode, score, total, time_sec, marked_ids, completed_at
    FROM student_paper_sessions
    WHERE student_id = ?
    ORDER BY completed_at DESC
    LIMIT 100
  `).bind(student.sub).all();
  return json({ sessions: results });
}

export async function handleGetSessionDetail(request: Request, env: Env, sessionId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const session = await env.DB.prepare(
    "SELECT * FROM student_paper_sessions WHERE id=? AND student_id=?"
  ).bind(Number(sessionId), student.sub).first<any>();
  if (!session) return json({ error: "not found" }, { status: 404 });
  const { results: answers } = await env.DB.prepare(`
    SELECT sa.question_id, sa.chosen, sa.is_correct,
           q.body, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e,
           q.correct, q.explanation, q.explanation_image, q.explanation_svg
    FROM student_session_answers sa
    JOIN questions q ON q.id = sa.question_id
    WHERE sa.session_id = ?
    ORDER BY sa.id
  `).bind(Number(sessionId)).all();
  return json({ session, answers });
}

export async function handleGetFileProgress(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(`
    SELECT fp.file_id, fp.completed_at, f.name AS file_name, f.content_type,
           t.name AS topic_name, s.name AS subject_name
    FROM student_file_progress fp
    JOIN files f ON f.id = fp.file_id
    LEFT JOIN topics t ON t.id = f.topic_id
    LEFT JOIN subjects s ON s.id = t.subject_id
    WHERE fp.student_id = ? AND fp.completed = 1
    ORDER BY s.name, t.name, f.name
  `).bind(student.sub).all();
  return json({ files: results });
}

export async function handleMarkFileComplete(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });
  const { file_id, completed } = await request.json() as any;
  if (!file_id) return json({ error: "file_id required" }, { status: 400 });
  if (completed) {
    await env.DB.prepare(`
      INSERT INTO student_file_progress (student_id, file_id, completed, completed_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, file_id) DO UPDATE SET completed=1, completed_at=CURRENT_TIMESTAMP
    `).bind(student.sub, file_id).run();
  } else {
    await env.DB.prepare(
      "DELETE FROM student_file_progress WHERE student_id=? AND file_id=?"
    ).bind(student.sub, file_id).run();
  }
  return json({ ok: true });
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
