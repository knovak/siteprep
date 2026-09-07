-- Keep forward page reads in the same stable order, even as verdicts change.
CREATE INDEX idx_items_collection_page
  ON items(collection_id, coalesce(added_at, ingested_at) DESC, id);
