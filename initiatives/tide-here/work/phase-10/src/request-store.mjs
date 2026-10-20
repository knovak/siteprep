// Reuse immutable object bodies only within a single gateway request. Registry
// validation and the selected provider can then verify the same bytes without
// downloading a full annual dataset from R2 more than once. The next request
// starts fresh, so activation changes and damaged objects remain detectable.
export function requestObjectStore(store) {
  const reads = new Map();
  return {
    get(key) {
      if (!reads.has(key)) reads.set(key, Promise.resolve().then(() => store.get(key)));
      return reads.get(key);
    },
    async put(key, ...args) {
      reads.delete(key);
      try {
        return await store.put(key, ...args);
      } finally {
        reads.delete(key);
      }
    },
  };
}
