-- Isolated proof-of-concept database. Nothing here grants browser access.
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  creator_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  puzzle_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer TEXT
);
CREATE INDEX submissions_review_queue ON submissions(status, created_at, id);
CREATE INDEX submissions_hash ON submissions(content_hash);

CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
