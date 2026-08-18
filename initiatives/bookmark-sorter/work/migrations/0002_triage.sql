PRAGMA foreign_keys = ON;

CREATE TABLE triage_sessions (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  items_judged INTEGER NOT NULL DEFAULT 0,
  elapsed_ms INTEGER
);

CREATE TABLE triage_actions (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES triage_sessions(id) ON DELETE CASCADE,
  action_kind TEXT NOT NULL CHECK (action_kind IN ('verdict')),
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  undone_at TEXT
);

CREATE INDEX idx_items_collection_untriaged
ON items(collection_id)
WHERE verdict IS NULL;

CREATE INDEX idx_triage_actions_session_active
ON triage_actions(session_id, created_at DESC)
WHERE undone_at IS NULL;

PRAGMA optimize;
