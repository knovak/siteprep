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
