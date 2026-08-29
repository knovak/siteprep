PRAGMA foreign_keys = OFF;

CREATE TABLE triage_actions_next (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES triage_sessions(id) ON DELETE CASCADE,
  action_kind TEXT NOT NULL CHECK (action_kind IN ('verdict', 'tag-apply', 'tag-remove')),
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  undone_at TEXT
);

INSERT INTO triage_actions_next
SELECT id, collection_id, session_id, action_kind, payload_json, created_at, undone_at
FROM triage_actions;

DROP TABLE triage_actions;
ALTER TABLE triage_actions_next RENAME TO triage_actions;

CREATE INDEX idx_triage_actions_session_active
ON triage_actions(session_id, created_at DESC)
WHERE undone_at IS NULL;

PRAGMA foreign_keys = ON;
PRAGMA optimize;
