const DATABASE = 'experiment-with-wasm-bookmarks-v1';

export async function openPersistence(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error('Browser storage is unavailable. Open this file in a browser with IndexedDB enabled.');
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other copies of this app and try again.'));
  });
  db.onversionchange = () => db.close();
  return {
    async read() {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('snapshots', 'readonly');
        const request = tx.objectStore('snapshots').get('current');
        tx.oncomplete = () => resolve(request.result ?? null);
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('Could not read saved bookmarks.'));
      });
    },
    async save(bytes, expectedRevision) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        const request = store.get('current');
        let failure;
        request.onsuccess = () => {
          if ((request.result?.revision ?? 0) !== expectedRevision) {
            failure = new Error('Another window saved changes. Reload this window before editing again.');
            tx.abort();
            return;
          }
          store.put({revision: expectedRevision + 1, bytes, savedAt: new Date().toISOString()}, 'current');
        };
        tx.oncomplete = () => resolve(expectedRevision + 1);
        tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('Browser storage could not save this change.'));
      });
    },
    close() { db.close(); },
  };
}
