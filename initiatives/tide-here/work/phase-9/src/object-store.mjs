export class MemoryObjectStore {
  #objects = new Map();

  writeLog = [];

  async get(key) {
    const value = this.#objects.get(key);
    return value ? structuredClone(value) : null;
  }

  async put(key, body, {customMetadata = {}} = {}) {
    const value = {body: String(body), customMetadata: {...customMetadata}};
    this.#objects.set(key, value);
    this.writeLog.push(key);
  }

  keys() {
    return [...this.#objects.keys()].sort();
  }
}

export class R2ObjectStore {
  constructor(bucket) {
    if (!bucket) throw new Error('The TIDE_DATA R2 binding is required');
    this.bucket = bucket;
  }

  async get(key) {
    const object = await this.bucket.get(key);
    if (!object) return null;
    return {
      body: await object.text(),
      customMetadata: object.customMetadata ?? {},
    };
  }

  async put(key, body, {customMetadata = {}} = {}) {
    await this.bucket.put(key, body, {
      httpMetadata: {contentType: 'application/json; charset=utf-8'},
      customMetadata,
    });
  }
}
