export class MemoryBookmarkStore {
  #collections = new Map();
  #items = new Map();
  #tags = new Map();
  #nextItem = 1;

  createCollection(collection) {
    this.#collections.set(collection.id, structuredClone(collection));
  }

  hasCollection(id) {
    return this.#collections.has(id);
  }

  findItem(collectionId, urlKey) {
    const item = [...this.#items.values()].find(
      candidate => candidate.collection_id === collectionId && candidate.url_key === urlKey,
    );
    return item ? structuredClone(item) : null;
  }

  insertItem(item) {
    const stored = {...structuredClone(item), id: item.id ?? `item-${this.#nextItem++}`};
    this.#items.set(stored.id, stored);
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
}
