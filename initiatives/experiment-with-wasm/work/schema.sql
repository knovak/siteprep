-- 0001_core.sql
PRAGMA foreign_keys = ON;

CREATE TABLE app_users (
  owner_id TEXT PRIMARY KEY,
  can_edit_templates INTEGER NOT NULL DEFAULT 0 CHECK (can_edit_templates IN (0, 1))
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('personal', 'demo-template', 'demo-copy')),
  template_id TEXT REFERENCES collections(id),
  copied_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES app_users(owner_id)
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_key TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  added_at TEXT,
  ingested_at TEXT NOT NULL,
  verdict TEXT,
  verdict_at TEXT,
  UNIQUE (collection_id, url_key)
);

CREATE TABLE tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);

CREATE TABLE selections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
  expression TEXT NOT NULL
);

CREATE TABLE captures (
  url_key TEXT PRIMARY KEY,
  image_ref TEXT,
  source TEXT NOT NULL CHECK (source IN ('og', 'screenshot', 'none')),
  captured_at TEXT,
  image_hash TEXT,
  state TEXT NOT NULL
);

CREATE INDEX items_collection_added_idx ON items(collection_id, added_at);
CREATE INDEX tags_tag_idx ON tags(tag, item_id);

-- 0002_triage.sql
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

-- 0003_captures.sql
PRAGMA foreign_keys = ON;

ALTER TABLE captures ADD COLUMN page_title TEXT;
ALTER TABLE captures ADD COLUMN description TEXT;
ALTER TABLE captures ADD COLUMN favicon_url TEXT;
ALTER TABLE captures ADD COLUMN error_tag TEXT;
ALTER TABLE captures ADD COLUMN image_candidate TEXT;
ALTER TABLE captures ADD COLUMN content_type TEXT;
ALTER TABLE captures ADD COLUMN width INTEGER;
ALTER TABLE captures ADD COLUMN height INTEGER;
ALTER TABLE captures ADD COLUMN byte_size INTEGER;

CREATE TABLE capture_queue (
  url_key TEXT PRIMARY KEY REFERENCES captures(url_key) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('missing-image', 'duplicate-image')),
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'complete', 'failed')),
  queued_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX idx_captures_image_hash
ON captures(image_hash)
WHERE image_hash IS NOT NULL;

CREATE INDEX idx_capture_queue_pending
ON capture_queue(queued_at, url_key)
WHERE state IN ('queued', 'failed');

PRAGMA optimize;

-- 0004_selections.sql
PRAGMA foreign_keys = OFF;

ALTER TABLE items ADD COLUMN title_key TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_items_collection_title_key
ON items(collection_id, title_key);

CREATE TABLE triage_actions_next (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES triage_sessions(id) ON DELETE CASCADE,
  action_kind TEXT NOT NULL CHECK (action_kind IN ('verdict', 'tag-apply')),
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

-- 0005_identity_collections.sql
PRAGMA foreign_keys = ON;

CREATE UNIQUE INDEX idx_collections_owner_personal
ON collections(owner_id)
WHERE kind = 'personal';

CREATE INDEX idx_collections_owner_kind_created
ON collections(owner_id, kind, created_at);

CREATE INDEX idx_collections_template_id
ON collections(template_id)
WHERE template_id IS NOT NULL;

PRAGMA optimize;

-- 0006_private_collections.sql
PRAGMA foreign_keys = OFF;

CREATE TABLE collections_next (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT REFERENCES app_users(owner_id),
  kind TEXT NOT NULL CHECK (kind IN ('personal', 'private', 'demo-template', 'demo-copy')),
  template_id TEXT REFERENCES collections(id),
  copied_at TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO collections_next (id, name, owner_id, kind, template_id, copied_at, created_at)
SELECT id, name, owner_id, kind, template_id, copied_at, created_at
FROM collections;

DROP TABLE collections;
ALTER TABLE collections_next RENAME TO collections;

CREATE UNIQUE INDEX idx_collections_owner_personal
ON collections(owner_id)
WHERE kind = 'personal';

CREATE INDEX idx_collections_owner_kind_created
ON collections(owner_id, kind, created_at);

CREATE INDEX idx_collections_template_id
ON collections(template_id)
WHERE template_id IS NOT NULL;

PRAGMA foreign_keys = ON;
PRAGMA optimize;

-- 0007_authorized_users_history.sql
CREATE TABLE selection_history (
  owner_id TEXT NOT NULL REFERENCES app_users(owner_id) ON DELETE CASCADE,
  expression TEXT NOT NULL,
  used_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, expression)
);

CREATE INDEX idx_selection_history_owner_used
ON selection_history(owner_id, used_at DESC);

-- 0009_tag_removal.sql
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

-- 0010_selection_pagination.sql
-- Keep forward page reads in the same stable order, even as verdicts change.
CREATE INDEX idx_items_collection_page
  ON items(collection_id, coalesce(added_at, ingested_at) DESC, id);

PRAGMA user_version = 1;
