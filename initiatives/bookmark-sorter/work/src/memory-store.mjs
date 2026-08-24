const VERDICTS = new Set(['keeper', 'junk', 'archive', 'needs-more-time']);

function earlier(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

export class MemoryBookmarkStore {
  #collections = new Map();
  #items = new Map();
  #itemsByUrl = new Map();
  #tags = new Map();
  #sessions = new Map();
  #actions = [];
  #selections = new Map();
  #selectionHistory = new Map();
  #authorizedUsers = new Map([
    ['krnovak@gmail.com', 'admin'],
    ['julie.duffield@gmail.com', 'user'],
  ]);
  #captures = new Map();
  #captureQueue = new Map();
  #nextItem = 1;
  #canEditTemplates;

  constructor({canEditTemplates = false} = {}) {
    this.#canEditTemplates = canEditTemplates;
  }

  createCollection(collection) {
    const stored = {
      owner_id: null,
      template_id: null,
      copied_at: null,
      created_at: new Date().toISOString(),
      kind: 'personal',
      ...structuredClone(collection),
    };
    this.#collections.set(stored.id, stored);
    return structuredClone(stored);
  }

  hasCollection(id) {
    return this.#collections.has(id);
  }

  ownedCollection(id) {
    const collection = this.#collections.get(id);
    return collection ? structuredClone(collection) : null;
  }

  ensureUser() {
    return {owner_id: null, can_edit_templates: this.#canEditTemplates};
  }

  canEditTemplates() {
    return this.#canEditTemplates;
  }

  ensureCollection(collection) {
    return this.hasCollection(collection.id)
      ? structuredClone(this.#collections.get(collection.id))
      : this.createCollection(collection);
  }

  ensurePersonalCollection({id, name = 'My bookmarks', createdAt = new Date().toISOString()} = {}) {
    const existing = [...this.#collections.values()].find(collection => collection.kind === 'personal');
    return existing ? structuredClone(existing) : this.createCollection({id, name, kind: 'personal', created_at: createdAt});
  }

  listCollections() {
    return [...this.#collections.values()]
      .map(collection => ({...structuredClone(collection), item_count: this.countItems(collection.id)}))
      .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id));
  }

  listTemplates() {
    return this.listCollections().filter(collection => collection.kind === 'demo-template');
  }

  renameCollection(id, name) {
    const collection = this.#collections.get(id);
    if (!collection) throw new Error(`Unknown collection: ${id}`);
    const nextName = String(name || '').trim();
    if (!nextName) throw new Error('Collection name is required');
    collection.name = nextName;
    return structuredClone(collection);
  }

  copyTemplate(templateId, {id, name, copiedAt, createdAt = copiedAt} = {}) {
    const template = this.#collections.get(templateId);
    if (!template || template.kind !== 'demo-template') throw new Error(`Not a demo template: ${templateId}`);
    const usedNames = new Set([...this.#collections.values()].map(collection => collection.name));
    const rootName = String(name || `${template.name} copy`).trim() || `${template.name} copy`;
    let copyName = rootName;
    for (let suffix = 2; usedNames.has(copyName); suffix += 1) copyName = `${rootName} (${suffix})`;
    const copy = this.createCollection({
      id,
      name: copyName,
      kind: 'demo-copy',
      template_id: templateId,
      copied_at: copiedAt,
      created_at: createdAt,
    });
    for (const source of this.listAllItems(templateId)) {
      const item = this.insertItem({...source, id: undefined, collection_id: id});
      this.addTags(item.id, source.tags);
    }
    for (const selection of this.listSelections(templateId)) {
      this.saveSelection(id, {...selection, id: `selection-copy-${this.#nextItem++}`});
    }
    return copy;
  }

  deleteDemoCopy(id) {
    const collection = this.#collections.get(id);
    if (!collection || collection.kind !== 'demo-copy') throw new Error('Only a demo copy can be deleted here');
    for (const item of [...this.#items.values()]) {
      if (item.collection_id !== id) continue;
      this.#items.delete(item.id);
      this.#itemsByUrl.delete(`${id}\u0000${item.url_key}`);
      this.#tags.delete(item.id);
    }
    for (const [selectionId, selection] of this.#selections) {
      if (selection.collection_id === id) this.#selections.delete(selectionId);
    }
    this.#collections.delete(id);
    return structuredClone(collection);
  }

  eraseCollection(id) {
    const collection = this.#collections.get(id);
    if (!collection) throw new Error(`Unknown collection: ${id}`);
    const erasedItems = this.countItems(id);
    for (const item of [...this.#items.values()]) {
      if (item.collection_id !== id) continue;
      this.#items.delete(item.id);
      this.#itemsByUrl.delete(`${id}\u0000${item.url_key}`);
      this.#tags.delete(item.id);
    }
    for (const [selectionId, selection] of this.#selections) {
      if (selection.collection_id === id) this.#selections.delete(selectionId);
    }
    for (const [sessionId, session] of this.#sessions) {
      if (session.collection_id === id) this.#sessions.delete(sessionId);
    }
    this.#actions = this.#actions.filter(action => action.collection_id !== id);
    return {collection: structuredClone(collection), erased_items: erasedItems};
  }

  listAuthorizedUsers() {
    return [...this.#authorizedUsers]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([email, type]) => ({email, type}));
  }

  addAuthorizedUser(email, type) {
    this.#authorizedUsers.set(email, type);
    return {email, type};
  }

  removeAuthorizedUser(email) {
    this.#authorizedUsers.delete(email);
    return {email};
  }

  recordSelection(expression, usedAt) {
    if (!expression) return null;
    this.#selectionHistory.set(expression, usedAt);
    return {expression, used_at: usedAt};
  }

  listSelectionHistory() {
    return [...this.#selectionHistory]
      .map(([expression, used_at]) => ({expression, used_at}))
      .sort((left, right) => right.used_at.localeCompare(left.used_at) || left.expression.localeCompare(right.expression));
  }

  collectionHasUrlKey(collectionId, urlKey) {
    return Boolean(this.#itemsByUrl.get(`${collectionId}\u0000${urlKey}`));
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

  ingestCandidates(collectionId, candidates) {
    if (!this.hasCollection(collectionId)) throw new Error(`Unknown collection: ${collectionId}`);
    const incoming = new Map();
    for (const candidate of candidates) {
      const current = incoming.get(candidate.url_key);
      if (!current) {
        incoming.set(candidate.url_key, {...structuredClone(candidate), tags: new Set(candidate.tags || [])});
        continue;
      }
      current.added_at = earlier(current.added_at, candidate.added_at);
      current.note ||= candidate.note;
      if (!current.verdict && candidate.verdict) {
        current.verdict = candidate.verdict;
        current.verdict_at = candidate.verdict_at;
      }
      for (const tag of candidate.tags || []) current.tags.add(tag);
    }

    let added = 0;
    for (const candidate of incoming.values()) {
      const existing = this.findItem(collectionId, candidate.url_key);
      if (!existing) {
        const item = this.insertItem({
          collection_id: collectionId,
          url: candidate.url,
          url_key: candidate.url_key,
          title: candidate.title,
          title_key: candidate.title_key,
          note: candidate.note,
          added_at: candidate.added_at,
          ingested_at: candidate.ingested_at,
          verdict: candidate.verdict ?? null,
          verdict_at: candidate.verdict_at ?? null,
        });
        this.addTags(item.id, candidate.tags);
        added += 1;
        continue;
      }
      this.updateItem(existing.id, {
        added_at: earlier(existing.added_at, candidate.added_at),
        note: existing.note || candidate.note || null,
        title_key: existing.title_key || candidate.title_key,
        verdict: existing.verdict || candidate.verdict || null,
        verdict_at: existing.verdict ? existing.verdict_at : candidate.verdict_at || null,
      });
      this.addTags(existing.id, candidate.tags);
    }
    return {added, merged: candidates.length - added, total: this.countItems(collectionId)};
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

  listUncapturedItems(collectionId, {limit = 20} = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    return [...this.#items.values()]
      .filter(item => item.collection_id === collectionId && !this.#captures.has(item.url_key))
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, safeLimit)
      .map(({url, url_key}) => ({url, url_key}));
  }

  listRetryableCaptureItems(collectionId, {limit = 20} = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    return [...this.#items.values()]
      .filter(item => item.collection_id === collectionId)
      .filter(item => {
        const capture = this.#captures.get(item.url_key);
        return ['pass1-gap', 'pass1-retried-gap', 'pass1-diagnosed-gap'].includes(capture?.state) && capture.image_candidate && !capture.image_ref;
      })
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, safeLimit)
      .map(({url, url_key}) => ({url, url_key}));
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

  listCaptureQueue({limit = 20, collectionId = null} = {}) {
    const scoped = collectionId === null
      ? null
      : new Set([...this.#items.values()].filter(item => item.collection_id === collectionId).map(item => item.url_key));
    return [...this.#captureQueue.values()]
      .filter(entry => entry.state === 'queued' || entry.state === 'failed')
      .filter(entry => scoped === null || scoped.has(entry.url_key))
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

  captureStats(collectionId = null) {
    const scoped = collectionId === null
      ? null
      : new Set([...this.#items.values()].filter(item => item.collection_id === collectionId).map(item => item.url_key));
    const captures = [...this.#captures.values()].filter(capture => scoped === null || scoped.has(capture.url_key));
    const pending = [...this.#captureQueue.values()].filter(entry => entry.state !== 'complete' && (scoped === null || scoped.has(entry.url_key)));
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
      retryable: captures.filter(capture => capture.state === 'pass1-gap' && capture.image_candidate && !capture.image_ref).length,
      gaps: pending.length,
      queued: [...this.#captureQueue.values()].filter(entry => (entry.state === 'queued' || entry.state === 'failed') && (scoped === null || scoped.has(entry.url_key))).length,
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
