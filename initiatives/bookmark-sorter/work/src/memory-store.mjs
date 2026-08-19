const VERDICTS = new Set(['keeper', 'junk', 'archive', 'needs-more-time']);

export class MemoryBookmarkStore {
  #collections = new Map();
  #items = new Map();
  #itemsByUrl = new Map();
  #tags = new Map();
  #sessions = new Map();
  #actions = [];
  #selections = new Map();
  #captures = new Map();
  #captureQueue = new Map();
  #nextItem = 1;

  createCollection(collection) {
    this.#collections.set(collection.id, structuredClone(collection));
  }

  hasCollection(id) {
    return this.#collections.has(id);
  }

  findItem(collectionId, urlKey) {
    const id = this.#itemsByUrl.get(`${collectionId}\u0000${urlKey}`);
    const item = id ? this.#items.get(id) : null;
    return item ? structuredClone(item) : null;
  }

  insertItem(item) {
    const stored = {...structuredClone(item), id: item.id ?? `item-${this.#nextItem++}`};
    this.#items.set(stored.id, stored);
    this.#itemsByUrl.set(`${stored.collection_id}\u0000${stored.url_key}`, stored.id);
    this.#tags.set(stored.id, new Set());
    return structuredClone(stored);
  }

  updateItem(id, changes) {
    const current = this.#items.get(id);
    if (!current) throw new Error(`Unknown item: ${id}`);
    this.#items.set(id, {...current, ...structuredClone(changes)});
    return structuredClone(this.#items.get(id));
  }

  addTags(id, tags) {
    const stored = this.#tags.get(id);
    if (!stored) throw new Error(`Unknown item: ${id}`);
    for (const tag of tags) stored.add(tag);
  }

  saveSelection(collectionId, selection) {
    if (!this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    const stored = {...structuredClone(selection), collection_id: collectionId};
    this.#selections.set(stored.id, stored);
    return structuredClone(stored);
  }

  listSelections(collectionId) {
    if (!this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    return [...this.#selections.values()]
      .filter(selection => selection.collection_id === collectionId)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(selection => structuredClone(selection));
  }

  selection(collectionId, id) {
    const selection = this.#selections.get(id);
    if (!selection || selection.collection_id !== collectionId) throw new Error(`Unknown selection: ${id}`);
    return structuredClone(selection);
  }

  listItems(collectionId) {
    return [...this.#items.values()]
      .filter(item => item.collection_id === collectionId)
      .map(item => {
        const capture = this.#captures.get(item.url_key);
        const queueEntry = this.#captureQueue.get(item.url_key);
        const displayable = !(queueEntry?.reason === 'duplicate-image' && queueEntry.state !== 'complete');
        return {
          ...structuredClone(item),
          tags: [...this.#tags.get(item.id)].sort(),
          capture: capture ? {...structuredClone(capture), displayable} : null,
        };
      });
  }

  listAllItems(collectionId) {
    return [...this.#items.values()]
      .filter(item => item.collection_id === collectionId)
      .map(item => {
        const capture = this.#captures.get(item.url_key);
        const queueEntry = this.#captureQueue.get(item.url_key);
        const displayable = !(queueEntry?.reason === 'duplicate-image' && queueEntry.state !== 'complete');
        return {...structuredClone(item), tags: [...this.#tags.get(item.id)].sort(), capture: capture ? {...structuredClone(capture), displayable} : null};
      });
  }

  getCapture(urlKey) {
    const capture = this.#captures.get(urlKey);
    return capture ? structuredClone(capture) : null;
  }

  upsertCapture(capture) {
    this.#captures.set(capture.url_key, structuredClone(capture));
    return structuredClone(capture);
  }

  applyCaptureError(collectionId, urlKey, errorTag) {
    let tagged = 0;
    for (const item of this.#items.values()) {
      if (item.collection_id !== collectionId || item.url_key !== urlKey) continue;
      this.#tags.get(item.id).add(errorTag);
      tagged += 1;
    }
    return tagged;
  }

  applyKnownCaptureErrors(collectionId, urlKeys) {
    let tagged = 0;
    for (const urlKey of new Set(urlKeys)) {
      const errorTag = this.#captures.get(urlKey)?.error_tag;
      if (errorTag) tagged += this.applyCaptureError(collectionId, urlKey, errorTag);
    }
    return tagged;
  }

  refreshCaptureQueue({duplicateThreshold, at}) {
    const hashCounts = new Map();
    for (const capture of this.#captures.values()) {
      if (capture.source === 'og' && capture.image_hash) {
        hashCounts.set(capture.image_hash, (hashCounts.get(capture.image_hash) ?? 0) + 1);
      }
    }
    const queue = new Map();
    for (const capture of this.#captures.values()) {
      if (capture.source === 'screenshot') continue;
      const duplicate = capture.image_hash && hashCounts.get(capture.image_hash) >= duplicateThreshold;
      if (capture.image_ref && !duplicate) continue;
      const previous = this.#captureQueue.get(capture.url_key);
      queue.set(capture.url_key, {
        url_key: capture.url_key,
        reason: duplicate ? 'duplicate-image' : 'missing-image',
        state: previous?.state === 'running' ? 'running' : 'queued',
        queued_at: previous?.queued_at ?? at,
        updated_at: at,
        attempts: previous?.attempts ?? 0,
        last_error: previous?.last_error ?? null,
      });
    }
    this.#captureQueue = queue;
    return queue.size;
  }

  listCaptureQueue({limit = 20} = {}) {
    return [...this.#captureQueue.values()]
      .filter(entry => entry.state === 'queued' || entry.state === 'failed')
      .sort((left, right) => left.queued_at.localeCompare(right.queued_at) || left.url_key.localeCompare(right.url_key))
      .slice(0, limit)
      .map(entry => structuredClone(entry));
  }

  markCaptureQueue(urlKey, {state, at, error = null}) {
    const entry = this.#captureQueue.get(urlKey);
    if (!entry) throw new Error(`Unknown capture queue item: ${urlKey}`);
    entry.state = state;
    entry.updated_at = at;
    entry.last_error = error;
    if (state === 'running') entry.attempts += 1;
    return structuredClone(entry);
  }

  captureStats() {
    const captures = [...this.#captures.values()];
    const pending = [...this.#captureQueue.values()].filter(entry => entry.state !== 'complete');
    const duplicateKeys = new Set(pending.filter(entry => entry.reason === 'duplicate-image').map(entry => entry.url_key));
    const distribution = new Map();
    for (const capture of captures) {
      if (capture.image_hash) distribution.set(capture.image_hash, (distribution.get(capture.image_hash) ?? 0) + 1);
    }
    const distinguishableMetadata = captures.filter(capture => capture.source === 'og' && capture.image_ref && !duplicateKeys.has(capture.url_key)).length;
    return {
      total: captures.length,
      metadata_images: captures.filter(capture => capture.source === 'og' && capture.image_ref).length,
      distinguishable_metadata: distinguishableMetadata,
      metadata_coverage: captures.length ? distinguishableMetadata / captures.length : null,
      screenshot_images: captures.filter(capture => capture.source === 'screenshot' && capture.image_ref).length,
      gaps: pending.length,
      queued: [...this.#captureQueue.values()].filter(entry => entry.state === 'queued' || entry.state === 'failed').length,
      duplicate_distribution: [...distribution.values()].sort((left, right) => right - left),
    };
  }

  countItems(collectionId) {
    let count = 0;
    for (const item of this.#items.values()) {
      if (item.collection_id === collectionId) count += 1;
    }
    return count;
  }

  countUntriagedItems(collectionId) {
    let count = 0;
    for (const item of this.#items.values()) {
      if (item.collection_id === collectionId && !item.verdict) count += 1;
    }
    return count;
  }

  startSession(collectionId, {id, startedAt}) {
    if (!this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    if (!id) throw new Error('Session id is required');
    const session = {
      id,
      collection_id: collectionId,
      started_at: startedAt,
      ended_at: null,
      items_judged: 0,
      elapsed_ms: null,
    };
    this.#sessions.set(id, session);
    return structuredClone(session);
  }

  session(collectionId, sessionId) {
    const session = this.#sessions.get(sessionId);
    if (!session || session.collection_id !== collectionId) throw new Error(`Unknown session: ${sessionId}`);
    return session;
  }

  applyVerdict(collectionId, {itemIds, verdict, at, sessionId, actionId}) {
    if (!VERDICTS.has(verdict)) throw new Error(`Unsupported verdict: ${verdict}`);
    const session = this.session(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const changes = [];
    for (const id of [...new Set(itemIds)]) {
      const item = this.#items.get(id);
      if (!item || item.collection_id !== collectionId) throw new Error(`Unknown item in collection: ${id}`);
      if (item.verdict === verdict) continue;
      changes.push({item_id: id, verdict: item.verdict, verdict_at: item.verdict_at});
      this.#items.set(id, {...item, verdict, verdict_at: at});
    }
    if (changes.length) {
      this.#actions.push({
        id: actionId,
        collection_id: collectionId,
        session_id: sessionId,
        action_kind: 'verdict',
        payload: {changes, verdict, verdict_at: at},
        created_at: at,
        undone_at: null,
      });
      session.items_judged += changes.length;
    }
    return {
      changes: changes.map(change => ({item_id: change.item_id, verdict, verdict_at: at})),
      backlog: this.countUntriagedItems(collectionId),
      session: structuredClone(session),
    };
  }

  applyTags(collectionId, {itemIds, tags, at, sessionId, actionId}) {
    const session = this.session(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const wanted = [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))];
    if (!wanted.length) throw new Error('Choose at least one tag');
    const changes = [];
    for (const id of [...new Set(itemIds)]) {
      const item = this.#items.get(id);
      if (!item || item.collection_id !== collectionId) throw new Error(`Unknown item in collection: ${id}`);
      const stored = this.#tags.get(id);
      const added = wanted.filter(tag => !stored.has(tag));
      if (!added.length) continue;
      for (const tag of added) stored.add(tag);
      changes.push({item_id: id, tags: added});
    }
    if (changes.length) {
      this.#actions.push({
        id: actionId,
        collection_id: collectionId,
        session_id: sessionId,
        action_kind: 'tag-apply',
        payload: {changes},
        created_at: at,
        undone_at: null,
      });
    }
    return {
      kind: 'tag-apply',
      changes: changes.map(change => ({item_id: change.item_id, added_tags: [...change.tags]})),
      backlog: this.countUntriagedItems(collectionId),
      session: structuredClone(session),
    };
  }

  undoLast(collectionId, {sessionId, at}) {
    const session = this.session(collectionId, sessionId);
    if (session.ended_at) throw new Error('The sitting has ended');
    const action = [...this.#actions].reverse().find(candidate =>
      candidate.collection_id === collectionId
      && candidate.session_id === sessionId
      && !candidate.undone_at,
    );
    if (!action) return {changes: [], backlog: this.countUntriagedItems(collectionId), session: structuredClone(session)};
    const restored = [];
    for (const change of action.payload.changes) {
      const item = this.#items.get(change.item_id);
      if (!item || item.collection_id !== collectionId) continue;
      if (action.action_kind === 'tag-apply') {
        const tags = this.#tags.get(change.item_id);
        for (const tag of change.tags) tags.delete(tag);
        restored.push({item_id: change.item_id, removed_tags: [...change.tags]});
      } else {
        this.#items.set(change.item_id, {...item, verdict: change.verdict, verdict_at: change.verdict_at});
        restored.push({...change});
      }
    }
    action.undone_at = at;
    if (action.action_kind === 'verdict') session.items_judged = Math.max(0, session.items_judged - restored.length);
    return {kind: action.action_kind, changes: restored, backlog: this.countUntriagedItems(collectionId), session: structuredClone(session)};
  }

  finishSession(collectionId, {sessionId, endedAt}) {
    const session = this.session(collectionId, sessionId);
    if (!session.ended_at) {
      session.ended_at = endedAt;
      session.elapsed_ms = Math.max(0, new Date(endedAt).valueOf() - new Date(session.started_at).valueOf());
    }
    return structuredClone(session);
  }
}
