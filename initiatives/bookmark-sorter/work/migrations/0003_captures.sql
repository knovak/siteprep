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
