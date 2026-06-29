CREATE TABLE program_years (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO program_years (id, name) VALUES
  (1, 'Year 1'), (2, 'Year 2'), (3, 'Year 3'),
  (4, 'Year 4'), (5, 'Year 5'), (6, 'Year 6');

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_sub TEXT,
  name TEXT NOT NULL,
  current_year INTEGER NOT NULL REFERENCES program_years(id),
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  action TEXT NOT NULL,
  detail_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
