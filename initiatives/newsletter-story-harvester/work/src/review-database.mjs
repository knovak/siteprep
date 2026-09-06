/** D1 owns hosted judgments; seed data fills new story IDs without replacing saved choices. */
export async function readJudgments(db, seed) {
  const initial = Object.fromEntries(seed.stories.map(story => [story.id, {
    verdict: story.verdict ?? null, verdict_at: story.verdict_at ?? null,
  }]));
  await db.prepare(`INSERT INTO review_state (store_id, judgments, revision, updated_at)
    VALUES (?, ?, 0, ?) ON CONFLICT(store_id) DO NOTHING`)
    .bind(seed.store_id, JSON.stringify(initial), new Date().toISOString()).run();
  const row = await db.prepare('SELECT judgments, revision FROM review_state WHERE store_id = ?')
    .bind(seed.store_id).first();
  return {store_id: seed.store_id, revision: row.revision, judgments: {...initial, ...JSON.parse(row.judgments)}};
}

export async function writeJudgments(db, current, changes) {
  const judgments = {...current.judgments};
  const at = new Date().toISOString();
  for (const change of changes) judgments[change.id] = {verdict: change.verdict, verdict_at: at};
  const encoded = JSON.stringify(judgments);
  // Leave headroom under D1's row/string limit; never truncate a store.
  if (new TextEncoder().encode(encoded).length > 1_000_000) throw new Error('Judgment store is too large');
  const result = await db.prepare(`UPDATE review_state SET judgments = ?, revision = revision + 1, updated_at = ?
    WHERE store_id = ? AND revision = ? RETURNING revision`)
    .bind(encoded, at, current.store_id, current.revision).first();
  return result ? {...current, revision: result.revision, judgments} : null;
}
