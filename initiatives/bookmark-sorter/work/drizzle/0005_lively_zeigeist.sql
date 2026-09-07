-- Drizzle 0.31.10 quotes expression-index fragments as column names; retain the SQL expression.
CREATE INDEX idx_items_collection_page ON items (collection_id, coalesce(added_at, ingested_at) DESC, id);
