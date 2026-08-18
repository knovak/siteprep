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
