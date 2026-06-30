CREATE TABLE IF NOT EXISTS flashcard_decks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT,
  subject_id  INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS flashcard_cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id    INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front      TEXT NOT NULL,
  back       TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS student_card_progress (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  card_id          INTEGER NOT NULL REFERENCES flashcard_cards(id) ON DELETE CASCADE,
  ease_factor      REAL    NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 1,
  repetitions      INTEGER NOT NULL DEFAULT 0,
  due_at           INTEGER NOT NULL DEFAULT (unixepoch()),
  last_reviewed_at INTEGER,
  UNIQUE(student_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_scp_due      ON student_card_progress(student_id, due_at);
CREATE INDEX IF NOT EXISTS idx_fc_deck      ON flashcard_cards(deck_id);
