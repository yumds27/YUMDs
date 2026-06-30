import type { Env } from "../lib/env";
import { json } from "../lib/http";
import { requireStudent, requireAdmin } from "../lib/auth";

// ── SM-2 spaced repetition ────────────────────────────────────────────────────

interface Progress { ease_factor: number; interval_days: number; repetitions: number; }

function sm2(p: Progress, rating: 1 | 2 | 3 | 4): Progress & { due_at: number } {
  let { ease_factor, interval_days, repetitions } = p;

  if (rating === 1) {
    interval_days = 1;
    repetitions   = 0;
  } else if (rating === 2) {
    ease_factor   = Math.max(1.3, ease_factor - 0.15);
    interval_days = Math.max(1, Math.round(interval_days * 1.2));
    repetitions++;
  } else if (rating === 3) {
    if      (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else                        interval_days = Math.round(interval_days * ease_factor);
    repetitions++;
  } else {
    ease_factor   = Math.min(4.0, ease_factor + 0.15);
    if      (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else                        interval_days = Math.round(interval_days * ease_factor);
    interval_days = Math.round(interval_days * 1.3);
    repetitions++;
  }

  ease_factor = Math.max(1.3, Math.min(4.0, ease_factor));
  const due_at = Math.floor(Date.now() / 1000) + interval_days * 86400;
  return { ease_factor, interval_days, repetitions, due_at };
}

// ── Student endpoints ─────────────────────────────────────────────────────────

export async function handleGetDecks(request: Request, env: Env): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });

  const { results } = await env.DB.prepare(`
    SELECT
      d.id, d.title, d.description,
      COUNT(DISTINCT c.id) AS card_count,
      COUNT(CASE WHEN p.due_at IS NOT NULL AND p.due_at <= unixepoch() THEN 1 END) AS due_count,
      COUNT(CASE WHEN c.id IS NOT NULL AND p.id IS NULL THEN 1 END) AS new_count
    FROM flashcard_decks d
    LEFT JOIN flashcard_cards c ON c.deck_id = d.id
    LEFT JOIN student_card_progress p ON p.card_id = c.id AND p.student_id = ?
    GROUP BY d.id
    ORDER BY d.title
  `).bind(student.id).all();

  return json({ decks: results });
}

export async function handleGetStudyCards(request: Request, env: Env, deckId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });

  const now = Math.floor(Date.now() / 1000);
  const limit = 20;

  // Due cards (have progress, due_at <= now)
  const { results: due } = await env.DB.prepare(`
    SELECT c.id, c.front, c.back, 'review' AS card_type,
           p.ease_factor, p.interval_days, p.repetitions, p.due_at
    FROM flashcard_cards c
    JOIN student_card_progress p ON p.card_id = c.id
    WHERE c.deck_id = ? AND p.student_id = ? AND p.due_at <= ?
    ORDER BY p.due_at ASC
    LIMIT ?
  `).bind(Number(deckId), student.id, now, limit).all();

  const remaining = limit - due.length;

  // New cards (no progress entry yet)
  const { results: newCards } = remaining > 0
    ? await env.DB.prepare(`
        SELECT c.id, c.front, c.back, 'new' AS card_type,
               2.5 AS ease_factor, 1 AS interval_days, 0 AS repetitions, ? AS due_at
        FROM flashcard_cards c
        WHERE c.deck_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM student_card_progress p
            WHERE p.card_id = c.id AND p.student_id = ?
          )
        ORDER BY c.id ASC
        LIMIT ?
      `).bind(now, Number(deckId), student.id, remaining).all()
    : { results: [] };

  return json({ cards: [...due, ...newCards] });
}

export async function handleReviewCard(request: Request, env: Env, cardId: string): Promise<Response> {
  const student = await requireStudent(request, env);
  if (!student) return json({ error: "unauthorized" }, { status: 401 });

  const { rating } = await request.json() as { rating?: number };
  if (!rating || rating < 1 || rating > 4) return json({ error: "rating must be 1–4" }, { status: 400 });

  const existing = await env.DB.prepare(
    "SELECT ease_factor, interval_days, repetitions FROM student_card_progress WHERE card_id=? AND student_id=?"
  ).bind(Number(cardId), student.id).first<Progress>();

  const base: Progress = existing ?? { ease_factor: 2.5, interval_days: 1, repetitions: 0 };
  const next = sm2(base, rating as 1 | 2 | 3 | 4);
  const now  = Math.floor(Date.now() / 1000);

  if (existing) {
    await env.DB.prepare(`
      UPDATE student_card_progress
      SET ease_factor=?, interval_days=?, repetitions=?, due_at=?, last_reviewed_at=?
      WHERE card_id=? AND student_id=?
    `).bind(next.ease_factor, next.interval_days, next.repetitions, next.due_at, now, Number(cardId), student.id).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO student_card_progress (student_id, card_id, ease_factor, interval_days, repetitions, due_at, last_reviewed_at)
      VALUES (?,?,?,?,?,?,?)
    `).bind(student.id, Number(cardId), next.ease_factor, next.interval_days, next.repetitions, next.due_at, now).run();
  }

  return json({ interval_days: next.interval_days });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

export async function handleAdminListDecks(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(`
    SELECT d.id, d.title, d.description, d.subject_id,
           COUNT(c.id) AS card_count
    FROM flashcard_decks d
    LEFT JOIN flashcard_cards c ON c.deck_id = d.id
    GROUP BY d.id ORDER BY d.title
  `).all();
  return json({ decks: results });
}

export async function handleAdminCreateDeck(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { title, description, subject_id } = await request.json() as any;
  if (!title?.trim()) return json({ error: "title required" }, { status: 400 });
  const { meta } = await env.DB.prepare(
    "INSERT INTO flashcard_decks (title, description, subject_id) VALUES (?,?,?)"
  ).bind(title.trim(), description?.trim() ?? null, subject_id ?? null).run();
  return json({ id: meta.last_row_id, title, description, subject_id }, { status: 201 });
}

export async function handleAdminUpdateDeck(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { title, description, subject_id } = await request.json() as any;
  if (!title?.trim()) return json({ error: "title required" }, { status: 400 });
  await env.DB.prepare("UPDATE flashcard_decks SET title=?, description=?, subject_id=? WHERE id=?")
    .bind(title.trim(), description?.trim() ?? null, subject_id ?? null, Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminDeleteDeck(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  await env.DB.prepare("DELETE FROM flashcard_decks WHERE id=?").bind(Number(id)).run();
  return json({ ok: true });
}

export async function handleAdminListCards(request: Request, env: Env, deckId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { results } = await env.DB.prepare(
    "SELECT id, front, back FROM flashcard_cards WHERE deck_id=? ORDER BY id"
  ).bind(Number(deckId)).all();
  return json({ cards: results });
}

export async function handleAdminCreateCard(request: Request, env: Env, deckId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { front, back } = await request.json() as any;
  if (!front?.trim() || !back?.trim()) return json({ error: "front and back required" }, { status: 400 });
  const { meta } = await env.DB.prepare(
    "INSERT INTO flashcard_cards (deck_id, front, back) VALUES (?,?,?)"
  ).bind(Number(deckId), front.trim(), back.trim()).run();
  return json({ id: meta.last_row_id, front, back }, { status: 201 });
}

export async function handleAdminUpdateCard(request: Request, env: Env, cardId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  const { front, back } = await request.json() as any;
  if (!front?.trim() || !back?.trim()) return json({ error: "front and back required" }, { status: 400 });
  await env.DB.prepare("UPDATE flashcard_cards SET front=?, back=? WHERE id=?")
    .bind(front.trim(), back.trim(), Number(cardId)).run();
  return json({ ok: true });
}

export async function handleAdminDeleteCard(request: Request, env: Env, cardId: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: "unauthorized" }, { status: 401 });
  await env.DB.prepare("DELETE FROM flashcard_cards WHERE id=?").bind(Number(cardId)).run();
  return json({ ok: true });
}
