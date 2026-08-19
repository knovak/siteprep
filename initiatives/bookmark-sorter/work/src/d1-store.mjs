function ownerClause(ownerId, alias = '') {
  const column = alias ? `${alias}.owner_id` : 'owner_id';
  return ownerId === null
    ? {sql: `${column} IS NULL`, values: []}
    : {sql: `${column} = ?`, values: [ownerId]};
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

  async ensureUser() {
    if (this.ownerId === null) return {owner_id: null, can_edit_templates: 0};
    await this.db.prepare(
      'INSERT OR IGNORE INTO app_users (owner_id, can_edit_templates) VALUES (?, 0)',
    ).bind(this.ownerId).run();
    return this.user();
  }

  async user() {
    if (this.ownerId === null) return {owner_id: null, can_edit_templates: 0};
    const user = await this.db.prepare(
      'SELECT owner_id, can_edit_templates FROM app_users WHERE owner_id = ? LIMIT 1',
    ).bind(this.ownerId).first();
    return user ? {...user, can_edit_templates: Number(user.can_edit_templates) !== 0} : null;
  }

  async canEditTemplates() {
    return Boolean((await this.user())?.can_edit_templates);
  }

  async ownedCollection(id) {
    const scope = ownerClause(this.ownerId, 'c');
    return this.db.prepare(
      `SELECT c.id, c.name, c.owner_id, c.kind, c.template_id, c.copied_at, c.created_at
       FROM collections c WHERE c.id = ? AND ${scope.sql} LIMIT 1`,
    ).bind(id, ...scope.values).first();
  }

  async readableCollection(id) {
    const scope = ownerClause(this.ownerId, 'c');
    return this.db.prepare(
      `SELECT c.id, c.name, c.owner_id, c.kind, c.template_id, c.copied_at, c.created_at
       FROM collections c
       WHERE c.id = ? AND (${scope.sql} OR c.kind = 'demo-template')
       LIMIT 1`,
    ).bind(id, ...scope.values).first();
  }

  async writableCollection(id) {
    const collection = await this.ownedCollection(id);
    if (!collection) return null;
    if (collection.kind === 'demo-template' && !await this.canEditTemplates()) return null;
    return collection;
  }

  async assertCollectionReadable(id) {
    const collection = await this.readableCollection(id);
    if (!collection) throw new Error(`Unknown collection: ${id}`);
    return collection;
  }

  async assertCollectionWritable(id) {
    const collection = await this.writableCollection(id);
    if (!collection) throw new Error(`Unknown or read-only collection: ${id}`);
    return collection;
  }

  async hasCollection(id) {
    return Boolean(await this.ownedCollection(id));
  }

  async ensureCollection({id, name = 'Pile', kind = 'personal', createdAt = new Date().toISOString()} = {}) {
    if (!id) throw new Error('Collection id is required');
    if (await this.writableCollection(id)) return this.ownedCollection(id);
    await this.ensureUser();
    if (kind === 'demo-template' && !await this.canEditTemplates()) {
      throw new Error('Template editing is not allowed for this user');
    }
    await this.db.prepare(
      `INSERT OR IGNORE INTO collections
       (id, name, owner_id, kind, template_id, copied_at, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?)`,
    ).bind(id, name, this.ownerId, kind, createdAt).run();
    const collection = await this.writableCollection(id);
    if (!collection) throw new Error(`Collection is outside this owner scope: ${id}`);
    return collection;
  }

  async ensurePersonalCollection({id, name = 'My bookmarks', createdAt = new Date().toISOString()} = {}) {
    await this.ensureUser();
    const scope = ownerClause(this.ownerId);
    const findExisting = () => this.db.prepare(
      `SELECT id, name, owner_id, kind, template_id, copied_at, created_at
       FROM collections WHERE ${scope.sql} AND kind = 'personal'
       ORDER BY created_at, id LIMIT 1`,
    ).bind(...scope.values).first();
    const existing = await findExisting();
    if (existing) return existing;
    try {
      return await this.ensureCollection({id, name, kind: 'personal', createdAt});
    } catch (error) {
      const concurrent = await findExisting();
      if (concurrent) return concurrent;
      throw error;
    }
  }

  async listCollections() {
    const scope = ownerClause(this.ownerId, 'c');
    const result = await this.db.prepare(
      `SELECT c.id, c.name, c.owner_id, c.kind, c.template_id, c.copied_at, c.created_at,
              (SELECT COUNT(*) FROM items i WHERE i.collection_id = c.id) AS item_count
       FROM collections c WHERE ${scope.sql}
       ORDER BY CASE c.kind WHEN 'personal' THEN 0 WHEN 'demo-copy' THEN 1 ELSE 2 END,
                c.created_at, c.id`,
    ).bind(...scope.values).all();
    return (result.results ?? []).map(row => ({...row, item_count: Number(row.item_count ?? 0)}));
  }

  async listTemplates() {
    const result = await this.db.prepare(
      `SELECT c.id, c.name, c.kind, c.created_at,
              (SELECT COUNT(*) FROM items i WHERE i.collection_id = c.id) AS item_count
       FROM collections c WHERE c.kind = 'demo-template'
       ORDER BY c.name, c.id`,
    ).all();
    return (result.results ?? []).map(row => ({...row, item_count: Number(row.item_count ?? 0)}));
  }

  async renameCollection(id, name) {
    const collection = await this.assertCollectionWritable(id);
    const nextName = String(name || '').trim();
    if (!nextName) throw new Error('Collection name is required');
    await this.db.prepare(
      'UPDATE collections SET name = ? WHERE id = ? AND owner_id = ?',
    ).bind(nextName, id, this.ownerId).run();
    return {...collection, name: nextName};
  }

  async copyTemplate(templateId, {id, name, copiedAt, createdAt = copiedAt} = {}) {
    if (!id) throw new Error('Collection id is required');
    await this.ensureUser();
    const template = await this.assertCollectionReadable(templateId);
    if (template.kind !== 'demo-template') throw new Error(`Not a demo template: ${templateId}`);
    const owned = await this.listCollections();
    const usedNames = new Set(owned.map(collection => collection.name));
    const rootName = String(name || `${template.name} copy`).trim() || `${template.name} copy`;
    let copyName = rootName;
    for (let suffix = 2; usedNames.has(copyName); suffix += 1) copyName = `${rootName} (${suffix})`;

    await this.db.batch([
      this.db.prepare(
        `INSERT INTO collections
         (id, name, owner_id, kind, template_id, copied_at, created_at)
         VALUES (?, ?, ?, 'demo-copy', ?, ?, ?)`,
      ).bind(id, copyName, this.ownerId, template.id, copiedAt, createdAt),
      this.db.prepare(
        `INSERT INTO items
         (id, collection_id, url, url_key, title, title_key, note, added_at, ingested_at, verdict, verdict_at)
         SELECT lower(hex(randomblob(16))), ?, url, url_key, title, title_key, note,
                added_at, ingested_at, verdict, verdict_at
         FROM items WHERE collection_id = ?`,
      ).bind(id, template.id),
      this.db.prepare(
        `INSERT INTO tags (item_id, tag)
         SELECT destination.id, source_tag.tag
         FROM items source
         JOIN tags source_tag ON source_tag.item_id = source.id
         JOIN items destination ON destination.collection_id = ?
          AND destination.url_key = source.url_key
         WHERE source.collection_id = ?`,
      ).bind(id, template.id),
      this.db.prepare(
        `INSERT INTO selections (id, name, collection_id, expression)
         SELECT lower(hex(randomblob(16))), name, ?, expression
         FROM selections WHERE collection_id = ?`,
      ).bind(id, template.id),
    ]);
    return this.ownedCollection(id);
  }

  async deleteDemoCopy(id) {
    const collection = await this.assertCollectionWritable(id);
    if (collection.kind !== 'demo-copy') throw new Error('Only a demo copy can be deleted here');
    await this.db.prepare(
      'DELETE FROM collections WHERE id = ? AND owner_id = ? AND kind = \'demo-copy\'',
    ).bind(id, this.ownerId).run();
    return collection;
  }

  async collectionHasUrlKey(collectionId, urlKey) {
    await this.assertCollectionReadable(collectionId);
    const row = await this.db.prepare(
      'SELECT id FROM items WHERE collection_id = ? AND url_key = ? LIMIT 1',
    ).bind(collectionId, urlKey).first();
    return Boolean(row);
  }

  async ingestCandidates(collectionId, candidates) {
    await this.assertCollectionWritable(collectionId);

    const existingResult = await this.db.prepare(
      `SELECT id, url, url_key, title, title_key, note, added_at, ingested_at, verdict, verdict_at
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
      if (!current.verdict && candidate.verdict) {
        current.verdict = candidate.verdict;
        current.verdict_at = candidate.verdict_at;
      }
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
          title_key: candidate.title_key,
          note: candidate.note,
          added_at: candidate.added_at,
          verdict: candidate.verdict ?? null,
          verdict_at: candidate.verdict_at ?? null,
        };
        statements.push(this.db.prepare(
          `INSERT INTO items
           (id, collection_id, url, url_key, title, title_key, note, added_at, ingested_at, verdict, verdict_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          item.id,
          collectionId,
          candidate.url,
          candidate.url_key,
          candidate.title,
          candidate.title_key,
          candidate.note,
          candidate.added_at,
          candidate.ingested_at,
          candidate.verdict ?? null,
          candidate.verdict_at ?? null,
        ));
        existing.set(candidate.url_key, item);
        added += 1;
      } else {
        const addedAt = earlier(item.added_at, candidate.added_at);
        const note = item.note || candidate.note || null;
        const titleKey = item.title_key || candidate.title_key;
        const verdict = item.verdict || candidate.verdict || null;
        const verdictAt = item.verdict ? item.verdict_at : candidate.verdict_at || null;
        if (addedAt !== item.added_at || note !== item.note || titleKey !== item.title_key
            || verdict !== item.verdict || verdictAt !== item.verdict_at) {
          statements.push(this.db.prepare(
            'UPDATE items SET added_at = ?, note = ?, title_key = ?, verdict = ?, verdict_at = ? WHERE id = ? AND collection_id = ?',
          ).bind(addedAt, note, titleKey, verdict, verdictAt, item.id, collectionId));
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
    await this.assertCollectionReadable(collectionId);
    const result = await this.db.prepare(
      'SELECT COUNT(*) AS count FROM items WHERE collection_id = ?',
    ).bind(collectionId).all();
    return Number(firstResult(result)?.count ?? 0);
  }

  async listItems(collectionId, {limit = 200, offset = 0} = {}) {
    await this.assertCollectionReadable(collectionId);
    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 200));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const result = await this.db.prepare(
      `SELECT i.id, i.url, i.url_key, i.title, i.title_key, i.note, i.added_at, i.ingested_at,
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

  async listAllItems(collectionId) {
    const total = await this.countItems(collectionId);
    const items = [];
    for (let offset = 0; offset < total; offset += 500) {
      items.push(...await this.listItems(collectionId, {limit: 500, offset}));
    }
    return items;
  }

  async saveSelection(collectionId, selection) {
    await this.assertCollectionWritable(collectionId);
    await this.db.prepare(
      `INSERT INTO selections (id, name, collection_id, expression)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, expression = excluded.expression
       WHERE selections.collection_id = excluded.collection_id`,
    ).bind(selection.id, selection.name, collectionId, selection.expression).run();
    return this.selection(collectionId, selection.id);
  }

  async listSelections(collectionId) {
    await this.assertCollectionReadable(collectionId);
    const result = await this.db.prepare(
      `SELECT id, name, collection_id, expression FROM selections
       WHERE collection_id = ? ORDER BY name, id`,
    ).bind(collectionId).all();
    return result.results ?? [];
  }

  async selection(collectionId, id) {
    await this.assertCollectionReadable(collectionId);
    const selection = await this.db.prepare(
      `SELECT id, name, collection_id, expression FROM selections
       WHERE id = ? AND collection_id = ? LIMIT 1`,
    ).bind(id, collectionId).first();
    if (!selection) throw new Error(`Unknown selection: ${id}`);
    return selection;
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
    await this.assertCollectionWritable(collectionId);
    await this.db.prepare(
      `INSERT OR IGNORE INTO tags (item_id, tag)
       SELECT id, ? FROM items WHERE collection_id = ? AND url_key = ?`,
    ).bind(errorTag, collectionId, urlKey).run();
  }

  async applyKnownCaptureErrors(collectionId, urlKeys) {
    await this.assertCollectionWritable(collectionId);
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

  async listCaptureQueue({limit = 20, collectionId = null} = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    if (collectionId !== null) await this.assertCollectionReadable(collectionId);
    const result = await this.db.prepare(
      `SELECT url_key, reason, state, queued_at, updated_at, attempts, last_error
       FROM capture_queue
       WHERE state IN ('queued', 'failed')
         ${collectionId === null ? '' : 'AND EXISTS (SELECT 1 FROM items i WHERE i.collection_id = ? AND i.url_key = capture_queue.url_key)'}
       ORDER BY queued_at, url_key
       LIMIT ?`,
    ).bind(...(collectionId === null ? [safeLimit] : [collectionId, safeLimit])).all();
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

  async captureStats(collectionId = null) {
    if (collectionId !== null) {
      await this.assertCollectionReadable(collectionId);
      const [counts, queue, distribution] = await Promise.all([
        this.db.prepare(
          `WITH scoped AS (
             SELECT DISTINCT c.* FROM captures c
             JOIN items i ON i.url_key = c.url_key
             WHERE i.collection_id = ?
           )
           SELECT COUNT(*) AS total,
                  SUM(CASE WHEN source = 'og' AND image_ref IS NOT NULL THEN 1 ELSE 0 END) AS metadata_images,
                  SUM(CASE WHEN source = 'og' AND image_ref IS NOT NULL
                            AND NOT EXISTS (
                              SELECT 1 FROM capture_queue q
                              WHERE q.url_key = scoped.url_key
                                AND q.reason = 'duplicate-image'
                                AND q.state != 'complete'
                            ) THEN 1 ELSE 0 END) AS distinguishable_metadata,
                  SUM(CASE WHEN source = 'screenshot' AND image_ref IS NOT NULL THEN 1 ELSE 0 END) AS screenshot_images,
                  SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM capture_queue q WHERE q.url_key = scoped.url_key AND q.state != 'complete'
                  ) THEN 1 ELSE 0 END) AS gaps
           FROM scoped`,
        ).bind(collectionId).all(),
        this.db.prepare(
          `SELECT COUNT(*) AS queued FROM capture_queue q
           WHERE q.state IN ('queued', 'failed')
             AND EXISTS (SELECT 1 FROM items i WHERE i.collection_id = ? AND i.url_key = q.url_key)`,
        ).bind(collectionId).all(),
        this.db.prepare(
          `SELECT COUNT(*) AS image_count FROM (
             SELECT DISTINCT c.url_key, c.image_hash FROM captures c
             JOIN items i ON i.url_key = c.url_key
             WHERE i.collection_id = ? AND c.image_hash IS NOT NULL
           ) GROUP BY image_hash ORDER BY image_count DESC`,
        ).bind(collectionId).all(),
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
    await this.assertCollectionReadable(collectionId);
    const result = await this.db.prepare(
      'SELECT COUNT(*) AS count FROM items WHERE collection_id = ? AND verdict IS NULL',
    ).bind(collectionId).all();
    return Number(firstResult(result)?.count ?? 0);
  }

  async startSession(collectionId, {id, startedAt}) {
    await this.assertCollectionWritable(collectionId);
    await this.db.prepare(
      `INSERT INTO triage_sessions
       (id, collection_id, started_at, ended_at, items_judged, elapsed_ms)
       VALUES (?, ?, ?, NULL, 0, NULL)`,
    ).bind(id, collectionId, startedAt).run();
    return this.getSession(collectionId, id);
  }

  async getSession(collectionId, sessionId) {
    await this.assertCollectionReadable(collectionId);
    const session = await this.db.prepare(
      `SELECT id, collection_id, started_at, ended_at, items_judged, elapsed_ms
       FROM triage_sessions WHERE id = ? AND collection_id = ? LIMIT 1`,
    ).bind(sessionId, collectionId).first();
    if (!session) throw new Error(`Unknown session: ${sessionId}`);
    return {...session, items_judged: Number(session.items_judged), elapsed_ms: session.elapsed_ms === null ? null : Number(session.elapsed_ms)};
  }

  async applyVerdict(collectionId, {itemIds, verdict, at, sessionId, actionId}) {
    await this.assertCollectionWritable(collectionId);
    if (!VERDICTS.has(verdict)) throw new Error(`Unsupported verdict: ${verdict}`);
    const session = await this.getSession(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const ids = [...new Set(itemIds)];
    if (!ids.length) throw new Error('At least one item is required');
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
      const statements = [];
      for (const batch of chunks(changes.map(change => change.item_id), this.batchSize)) {
        const placeholders = batch.map(() => '?').join(', ');
        statements.push(this.db.prepare(
          `UPDATE items SET verdict = ?, verdict_at = ?
           WHERE collection_id = ? AND id IN (${placeholders})`,
        ).bind(verdict, at, collectionId, ...batch));
      }
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

  async applyTags(collectionId, {itemIds, tags, at, sessionId, actionId}) {
    await this.assertCollectionWritable(collectionId);
    const session = await this.getSession(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const ids = [...new Set(itemIds)];
    const wanted = [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))];
    if (!ids.length) throw new Error('At least one item is required');
    if (!wanted.length) throw new Error('Choose at least one tag');

    const found = new Set();
    const existing = new Map(ids.map(id => [id, new Set()]));
    for (const batch of chunks(ids, this.batchSize)) {
      const placeholders = batch.map(() => '?').join(', ');
      const rows = await this.db.prepare(
        `SELECT i.id, t.tag FROM items i LEFT JOIN tags t ON t.item_id = i.id
         WHERE i.collection_id = ? AND i.id IN (${placeholders})`,
      ).bind(collectionId, ...batch).all();
      for (const row of rows.results ?? []) {
        found.add(row.id);
        if (row.tag !== null && row.tag !== undefined) existing.get(row.id).add(row.tag);
      }
    }
    for (const id of ids) if (!found.has(id)) throw new Error(`Unknown item in collection: ${id}`);

    const changes = ids.map(id => ({item_id: id, tags: wanted.filter(tag => !existing.get(id).has(tag))})).filter(change => change.tags.length);
    if (changes.length) {
      const changedIds = changes.map(change => change.item_id);
      const statements = [];
      for (const tag of wanted) {
        for (const batch of chunks(changedIds.filter(id => !existing.get(id).has(tag)), this.batchSize)) {
          if (!batch.length) continue;
          const placeholders = batch.map(() => '?').join(', ');
          statements.push(this.db.prepare(
            `INSERT OR IGNORE INTO tags (item_id, tag)
             SELECT id, ? FROM items WHERE collection_id = ? AND id IN (${placeholders})`,
          ).bind(tag, collectionId, ...batch));
        }
      }
      statements.push(this.db.prepare(
        `INSERT INTO triage_actions
         (id, collection_id, session_id, action_kind, payload_json, created_at, undone_at)
         VALUES (?, ?, ?, 'tag-apply', ?, ?, NULL)`,
      ).bind(actionId, collectionId, sessionId, JSON.stringify({changes}), at));
      await this.db.batch(statements);
    }
    return {
      kind: 'tag-apply',
      changes: changes.map(change => ({item_id: change.item_id, added_tags: change.tags})),
      backlog: await this.countUntriagedItems(collectionId),
      session: await this.getSession(collectionId, sessionId),
    };
  }

  async undoLast(collectionId, {sessionId, at}) {
    await this.assertCollectionWritable(collectionId);
    const session = await this.getSession(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const action = await this.db.prepare(
      `SELECT id, action_kind, payload_json FROM triage_actions
       WHERE collection_id = ? AND session_id = ? AND undone_at IS NULL
       ORDER BY created_at DESC, id DESC LIMIT 1`,
    ).bind(collectionId, sessionId).first();
    if (!action) return {changes: [], backlog: await this.countUntriagedItems(collectionId), session};
    const payload = JSON.parse(action.payload_json);
    const changes = Array.isArray(payload.changes) ? payload.changes : [];
    const statements = action.action_kind === 'tag-apply'
      ? changes.flatMap(change => change.tags.map(tag => this.db.prepare(
        'DELETE FROM tags WHERE item_id = ? AND tag = ?',
      ).bind(change.item_id, tag)))
      : changes.map(change => this.db.prepare(
        'UPDATE items SET verdict = ?, verdict_at = ? WHERE id = ? AND collection_id = ?',
      ).bind(change.verdict, change.verdict_at, change.item_id, collectionId));
    statements.push(this.db.prepare(
      'UPDATE triage_actions SET undone_at = ? WHERE id = ? AND collection_id = ?',
    ).bind(at, action.id, collectionId));
    if (action.action_kind === 'verdict') {
      statements.push(this.db.prepare(
        `UPDATE triage_sessions
         SET items_judged = MAX(0, items_judged - ?)
         WHERE id = ? AND collection_id = ?`,
      ).bind(changes.length, sessionId, collectionId));
    }
    await this.db.batch(statements);
    return {
      kind: action.action_kind,
      changes: action.action_kind === 'tag-apply'
        ? changes.map(change => ({item_id: change.item_id, removed_tags: change.tags}))
        : changes,
      backlog: await this.countUntriagedItems(collectionId),
      session: await this.getSession(collectionId, sessionId),
    };
  }

  async finishSession(collectionId, {sessionId, endedAt}) {
    await this.assertCollectionWritable(collectionId);
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
