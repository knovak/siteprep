export class MemoryBookmarkStore {
  #collections = new Map();
  #items = new Map();
  #itemsByUrl = new Map();
  #tags = new Map();
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
}
