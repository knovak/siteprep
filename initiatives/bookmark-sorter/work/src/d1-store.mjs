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

const VERDICTS = new Set(['keeper', 'junk', 'archive', 'needs-more-time']);

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
              c.image_ref AS capture_image_ref, c.source AS capture_source,
              c.state AS capture_state, c.error_tag AS capture_error_tag,
              c.page_title AS capture_page_title, c.description AS capture_description,
              CASE WHEN q.reason = 'duplicate-image' AND q.state != 'complete'
                   THEN 0 ELSE 1 END AS capture_displayable,
              COALESCE((SELECT json_group_array(tag) FROM
                (SELECT tag FROM tags WHERE item_id = i.id ORDER BY tag)), '[]') AS tags_json
       FROM items i
       LEFT JOIN captures c ON c.url_key = i.url_key
       LEFT JOIN capture_queue q ON q.url_key = i.url_key
       WHERE i.collection_id = ?
       ORDER BY COALESCE(i.added_at, i.ingested_at) DESC, i.id
       LIMIT ? OFFSET ?`,
    ).bind(collectionId, safeLimit, safeOffset).all();
    return (result.results ?? []).map(({tags_json, capture_image_ref, capture_source, capture_state, capture_error_tag, capture_page_title, capture_description, capture_displayable, ...item}) => ({
      ...item,
      collection_id: collectionId,
      tags: JSON.parse(tags_json || '[]'),
      capture: capture_state ? {
        image_ref: capture_image_ref,
        source: capture_source,
        state: capture_state,
        error_tag: capture_error_tag,
        page_title: capture_page_title,
        description: capture_description,
        displayable: Number(capture_displayable) !== 0,
      } : null,
    }));
  }

  async getCapture(urlKey) {
    return this.db.prepare(
      `SELECT url_key, image_ref, source, captured_at, image_hash, state,
              page_title, description, favicon_url, error_tag, image_candidate,
              content_type, width, height, byte_size
       FROM captures WHERE url_key = ? LIMIT 1`,
    ).bind(urlKey).first();
  }

  async upsertCapture(capture) {
    await this.db.prepare(
      `INSERT INTO captures
       (url_key, image_ref, source, captured_at, image_hash, state,
        page_title, description, favicon_url, error_tag, image_candidate,
        content_type, width, height, byte_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(url_key) DO UPDATE SET
         image_ref = excluded.image_ref,
         source = excluded.source,
         captured_at = excluded.captured_at,
         image_hash = excluded.image_hash,
         state = excluded.state,
         page_title = excluded.page_title,
         description = excluded.description,
         favicon_url = excluded.favicon_url,
         error_tag = excluded.error_tag,
         image_candidate = excluded.image_candidate,
         content_type = excluded.content_type,
         width = excluded.width,
         height = excluded.height,
         byte_size = excluded.byte_size`,
    ).bind(
      capture.url_key,
      capture.image_ref,
      capture.source,
      capture.captured_at,
      capture.image_hash,
      capture.state,
      capture.page_title,
      capture.description,
      capture.favicon_url,
      capture.error_tag,
      capture.image_candidate,
      capture.content_type,
      capture.width,
      capture.height,
      capture.byte_size,
    ).run();
    return this.getCapture(capture.url_key);
  }

  async applyCaptureError(collectionId, urlKey, errorTag) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    await this.db.prepare(
      `INSERT OR IGNORE INTO tags (item_id, tag)
       SELECT id, ? FROM items WHERE collection_id = ? AND url_key = ?`,
    ).bind(errorTag, collectionId, urlKey).run();
  }

  async applyKnownCaptureErrors(collectionId, urlKeys) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    for (const batch of chunks([...new Set(urlKeys)], this.batchSize)) {
      if (!batch.length) continue;
      const placeholders = batch.map(() => '?').join(', ');
      await this.db.prepare(
        `INSERT OR IGNORE INTO tags (item_id, tag)
         SELECT i.id, c.error_tag
         FROM items i JOIN captures c ON c.url_key = i.url_key
         WHERE i.collection_id = ? AND c.error_tag IS NOT NULL
           AND i.url_key IN (${placeholders})`,
      ).bind(collectionId, ...batch).run();
    }
  }

  async refreshCaptureQueue({duplicateThreshold, at}) {
    await this.db.batch([
      this.db.prepare("DELETE FROM capture_queue WHERE state != 'running'"),
      this.db.prepare(
        `INSERT INTO capture_queue
         (url_key, reason, state, queued_at, updated_at, attempts, last_error)
         SELECT c.url_key,
                CASE WHEN duplicates.image_count >= ? THEN 'duplicate-image' ELSE 'missing-image' END,
                'queued', ?, ?, 0, NULL
         FROM captures c
         LEFT JOIN (
           SELECT image_hash, COUNT(*) AS image_count
           FROM captures
           WHERE source = 'og' AND image_hash IS NOT NULL
           GROUP BY image_hash
         ) duplicates ON duplicates.image_hash = c.image_hash
         WHERE c.source != 'screenshot'
           AND (c.image_ref IS NULL OR duplicates.image_count >= ?)
         ON CONFLICT(url_key) DO UPDATE SET
           reason = excluded.reason,
           state = CASE WHEN capture_queue.state = 'running' THEN 'running' ELSE 'queued' END,
           updated_at = excluded.updated_at`,
      ).bind(duplicateThreshold, at, at, duplicateThreshold),
    ]);
  }

  async listCaptureQueue({limit = 20} = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const result = await this.db.prepare(
      `SELECT url_key, reason, state, queued_at, updated_at, attempts, last_error
       FROM capture_queue
       WHERE state IN ('queued', 'failed')
       ORDER BY queued_at, url_key
       LIMIT ?`,
    ).bind(safeLimit).all();
    return result.results ?? [];
  }

  async markCaptureQueue(urlKey, {state, at, error = null}) {
    await this.db.prepare(
      `UPDATE capture_queue
       SET state = ?, updated_at = ?, last_error = ?,
           attempts = attempts + CASE WHEN ? = 'running' THEN 1 ELSE 0 END
       WHERE url_key = ?`,
    ).bind(state, at, error, state, urlKey).run();
  }

  async captureStats() {
    const [counts, queue, distribution] = await Promise.all([
      this.db.prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN source = 'og' AND image_ref IS NOT NULL THEN 1 ELSE 0 END) AS metadata_images,
                SUM(CASE WHEN source = 'og' AND image_ref IS NOT NULL
                          AND NOT EXISTS (
                            SELECT 1 FROM capture_queue q
                            WHERE q.url_key = captures.url_key
                              AND q.reason = 'duplicate-image'
                              AND q.state != 'complete'
                          ) THEN 1 ELSE 0 END) AS distinguishable_metadata,
                SUM(CASE WHEN source = 'screenshot' AND image_ref IS NOT NULL THEN 1 ELSE 0 END) AS screenshot_images,
                (SELECT COUNT(*) FROM capture_queue WHERE state != 'complete') AS gaps
         FROM captures`,
      ).all(),
      this.db.prepare(
        `SELECT COUNT(*) AS queued FROM capture_queue WHERE state IN ('queued', 'failed')`,
      ).all(),
      this.db.prepare(
        `SELECT COUNT(*) AS image_count FROM captures
         WHERE image_hash IS NOT NULL GROUP BY image_hash
         ORDER BY image_count DESC`,
      ).all(),
    ]);
    const row = firstResult(counts) ?? {};
    const total = Number(row.total ?? 0);
    const distinguishableMetadata = Number(row.distinguishable_metadata ?? 0);
    return {
      total,
      metadata_images: Number(row.metadata_images ?? 0),
      distinguishable_metadata: distinguishableMetadata,
      metadata_coverage: total ? distinguishableMetadata / total : null,
      screenshot_images: Number(row.screenshot_images ?? 0),
      gaps: Number(row.gaps ?? 0),
      queued: Number(firstResult(queue)?.queued ?? 0),
      duplicate_distribution: (distribution.results ?? []).map(value => Number(value.image_count)),
    };
  }

  async countUntriagedItems(collectionId) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    const result = await this.db.prepare(
      'SELECT COUNT(*) AS count FROM items WHERE collection_id = ? AND verdict IS NULL',
    ).bind(collectionId).all();
    return Number(firstResult(result)?.count ?? 0);
  }

  async startSession(collectionId, {id, startedAt}) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    await this.db.prepare(
      `INSERT INTO triage_sessions
       (id, collection_id, started_at, ended_at, items_judged, elapsed_ms)
       VALUES (?, ?, ?, NULL, 0, NULL)`,
    ).bind(id, collectionId, startedAt).run();
    return this.getSession(collectionId, id);
  }

  async getSession(collectionId, sessionId) {
    if (!await this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    const session = await this.db.prepare(
      `SELECT id, collection_id, started_at, ended_at, items_judged, elapsed_ms
       FROM triage_sessions WHERE id = ? AND collection_id = ? LIMIT 1`,
    ).bind(sessionId, collectionId).first();
    if (!session) throw new Error(`Unknown session: ${sessionId}`);
    return {...session, items_judged: Number(session.items_judged), elapsed_ms: session.elapsed_ms === null ? null : Number(session.elapsed_ms)};
  }

  async applyVerdict(collectionId, {itemIds, verdict, at, sessionId, actionId}) {
    if (!VERDICTS.has(verdict)) throw new Error(`Unsupported verdict: ${verdict}`);
    const session = await this.getSession(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const ids = [...new Set(itemIds)];
    if (!ids.length) throw new Error('At least one item is required');
    if (ids.length > 500) throw new Error('A verdict may target at most 500 items');
    const found = [];
    for (const batch of chunks(ids, this.batchSize)) {
      const placeholders = batch.map(() => '?').join(', ');
      const result = await this.db.prepare(
        `SELECT id, verdict, verdict_at FROM items
         WHERE collection_id = ? AND id IN (${placeholders})`,
      ).bind(collectionId, ...batch).all();
      found.push(...(result.results ?? []));
    }
    const byId = new Map(found.map(item => [item.id, item]));
    for (const id of ids) {
      if (!byId.has(id)) throw new Error(`Unknown item in collection: ${id}`);
    }
    const changes = ids
      .map(id => byId.get(id))
      .filter(item => item.verdict !== verdict)
      .map(item => ({item_id: item.id, verdict: item.verdict, verdict_at: item.verdict_at}));
    if (changes.length) {
      const statements = changes.map(change => this.db.prepare(
        'UPDATE items SET verdict = ?, verdict_at = ? WHERE id = ? AND collection_id = ?',
      ).bind(verdict, at, change.item_id, collectionId));
      statements.push(this.db.prepare(
        `INSERT INTO triage_actions
         (id, collection_id, session_id, action_kind, payload_json, created_at, undone_at)
         VALUES (?, ?, ?, 'verdict', ?, ?, NULL)`,
      ).bind(actionId, collectionId, sessionId, JSON.stringify({changes, verdict, verdict_at: at}), at));
      statements.push(this.db.prepare(
        'UPDATE triage_sessions SET items_judged = items_judged + ? WHERE id = ? AND collection_id = ?',
      ).bind(changes.length, sessionId, collectionId));
      await this.db.batch(statements);
    }
    return {
      changes: changes.map(change => ({item_id: change.item_id, verdict, verdict_at: at})),
      backlog: await this.countUntriagedItems(collectionId),
      session: await this.getSession(collectionId, sessionId),
    };
  }

  async undoLast(collectionId, {sessionId, at}) {
    const session = await this.getSession(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const action = await this.db.prepare(
      `SELECT id, payload_json FROM triage_actions
       WHERE collection_id = ? AND session_id = ? AND undone_at IS NULL
       ORDER BY created_at DESC, id DESC LIMIT 1`,
    ).bind(collectionId, sessionId).first();
    if (!action) return {changes: [], backlog: await this.countUntriagedItems(collectionId), session};
    const payload = JSON.parse(action.payload_json);
    const changes = Array.isArray(payload.changes) ? payload.changes : [];
    const statements = changes.map(change => this.db.prepare(
      'UPDATE items SET verdict = ?, verdict_at = ? WHERE id = ? AND collection_id = ?',
    ).bind(change.verdict, change.verdict_at, change.item_id, collectionId));
    statements.push(this.db.prepare(
      'UPDATE triage_actions SET undone_at = ? WHERE id = ? AND collection_id = ?',
    ).bind(at, action.id, collectionId));
    statements.push(this.db.prepare(
      `UPDATE triage_sessions
       SET items_judged = MAX(0, items_judged - ?)
       WHERE id = ? AND collection_id = ?`,
    ).bind(changes.length, sessionId, collectionId));
    await this.db.batch(statements);
    return {
      changes,
      backlog: await this.countUntriagedItems(collectionId),
      session: await this.getSession(collectionId, sessionId),
    };
  }

  async finishSession(collectionId, {sessionId, endedAt}) {
    const session = await this.getSession(collectionId, sessionId);
    if (session.ended_at) return session;
    const elapsed = Math.max(0, new Date(endedAt).valueOf() - new Date(session.started_at).valueOf());
    await this.db.prepare(
      `UPDATE triage_sessions SET ended_at = ?, elapsed_ms = ?
       WHERE id = ? AND collection_id = ?`,
    ).bind(endedAt, elapsed, sessionId, collectionId).run();
    return this.getSession(collectionId, sessionId);
  }
}
