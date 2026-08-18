const VERDICTS = new Set(['keeper', 'junk', 'archive', 'needs-more-time']);

export class MemoryBookmarkStore {
  #collections = new Map();
  #items = new Map();
  #itemsByUrl = new Map();
  #tags = new Map();
  #sessions = new Map();
  #actions = [];
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

  listItems(collectionId) {
    return [...this.#items.values()]
      .filter(item => item.collection_id === collectionId)
      .map(item => ({...structuredClone(item), tags: [...this.#tags.get(item.id)].sort()}));
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
      this.#items.set(change.item_id, {...item, verdict: change.verdict, verdict_at: change.verdict_at});
      restored.push({...change});
    }
    action.undone_at = at;
    session.items_judged = Math.max(0, session.items_judged - restored.length);
    return {changes: restored, backlog: this.countUntriagedItems(collectionId), session: structuredClone(session)};
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
