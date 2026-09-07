-- Record where a capture's fetch actually landed after following redirects.
-- Read-only history: nothing rewrites an item's url or url_key from this value.
-- A row is a fact as of its captured_at, not a permanent property of the URL.

ALTER TABLE captures ADD COLUMN final_url TEXT;
