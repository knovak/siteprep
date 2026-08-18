function ownerClause(ownerId) {
  return ownerId === null
    ? {sql: 'owner_id IS NULL', values: []}
    : {sql: 'owner_id = ?', values: [ownerId]};
}

function firstResult(result) {
  return result?.results?.[0] ?? null;
}

function earlier(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export class D1BookmarkStore {
  constructor(db, {ownerId = null, batchSize = 100, idFactory = () => crypto.randomUUID()} = {}) {
    if (!db?.prepare || !db?.batch) throw new TypeError('A D1 database binding is required');
    this.db = db;
    this.ownerId = ownerId;
    this.batchSize = batchSize;
    this.idFactory = idFactory;
  }

  async hasCollection(id) {
    const scope = ownerClause(this.ownerId);
    const row = await this.db.prepare(
      `SELECT id FROM collections WHERE id = ? AND ${scope.sql} LIMIT 1`,
    ).bind(id, ...scope.values).first();
    return Boolean(row);
  }

  async ensureCollection({id, name = 'Pile', kind = 'personal', createdAt = new Date().toISOString()} = {}) {
    if (!id) throw new Error('Collection id is required');
    if (await this.hasCollection(id)) return;
    await this.db.prepare(
      `INSERT OR IGNORE INTO collections
       (id, name, owner_id, kind, template_id, copied_at, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?)`,
    ).bind(id, name, this.ownerId, kind, createdAt).run();
    if (!await this.hasCollection(id)) throw new Error(`Collection is outside this owner scope: ${id}`);
  }

  async ingestCandidates(collectionId, candidates) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);

    const existingResult = await this.db.prepare(
      `SELECT id, url, url_key, title, note, added_at, ingested_at, verdict, verdict_at
       FROM items WHERE collection_id = ?`,
    ).bind(collectionId).all();
    const existing = new Map((existingResult.results ?? []).map(item => [item.url_key, item]));
    const incoming = new Map();

    for (const candidate of candidates) {
      const current = incoming.get(candidate.url_key);
      if (!current) {
        incoming.set(candidate.url_key, {...candidate, tags: new Set(candidate.tags)});
        continue;
      }
      current.added_at = earlier(current.added_at, candidate.added_at);
      current.note ||= candidate.note;
      for (const tag of candidate.tags) current.tags.add(tag);
    }

    const statements = [];
    let added = 0;
    for (const candidate of incoming.values()) {
      let item = existing.get(candidate.url_key);
      if (!item) {
        item = {
          id: this.idFactory(),
          url_key: candidate.url_key,
          note: candidate.note,
          added_at: candidate.added_at,
        };
        statements.push(this.db.prepare(
          `INSERT INTO items
           (id, collection_id, url, url_key, title, note, added_at, ingested_at, verdict, verdict_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
        ).bind(
          item.id,
          collectionId,
          candidate.url,
          candidate.url_key,
          candidate.title,
          candidate.note,
          candidate.added_at,
          candidate.ingested_at,
        ));
        existing.set(candidate.url_key, item);
        added += 1;
      } else {
        const addedAt = earlier(item.added_at, candidate.added_at);
        const note = item.note || candidate.note || null;
        if (addedAt !== item.added_at || note !== item.note) {
          statements.push(this.db.prepare(
            'UPDATE items SET added_at = ?, note = ? WHERE id = ? AND collection_id = ?',
          ).bind(addedAt, note, item.id, collectionId));
        }
      }

      for (const tag of candidate.tags) {
        statements.push(this.db.prepare(
          'INSERT OR IGNORE INTO tags (item_id, tag) VALUES (?, ?)',
        ).bind(item.id, tag));
      }
    }

    for (const batch of chunks(statements, this.batchSize)) {
      if (batch.length) await this.db.batch(batch);
    }

    return {
      added,
      merged: candidates.length - added,
      total: existing.size,
    };
  }

  async countItems(collectionId) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    const result = await this.db.prepare(
      'SELECT COUNT(*) AS count FROM items WHERE collection_id = ?',
    ).bind(collectionId).all();
    return Number(firstResult(result)?.count ?? 0);
  }

  async listItems(collectionId, {limit = 200, offset = 0} = {}) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 200));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const result = await this.db.prepare(
      `SELECT i.id, i.url, i.url_key, i.title, i.note, i.added_at, i.ingested_at,
              i.verdict, i.verdict_at,
              COALESCE((SELECT json_group_array(tag) FROM
                (SELECT tag FROM tags WHERE item_id = i.id ORDER BY tag)), '[]') AS tags_json
       FROM items i
       WHERE i.collection_id = ?
       ORDER BY COALESCE(i.added_at, i.ingested_at) DESC, i.id
       LIMIT ? OFFSET ?`,
    ).bind(collectionId, safeLimit, safeOffset).all();
    return (result.results ?? []).map(({tags_json, ...item}) => ({
      ...item,
      collection_id: collectionId,
      tags: JSON.parse(tags_json || '[]'),
    }));
  }
}
