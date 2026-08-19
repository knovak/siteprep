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
