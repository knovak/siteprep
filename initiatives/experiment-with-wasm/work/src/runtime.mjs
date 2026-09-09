import {SqliteBinding} from './sqlite-adapter.mjs';
import {WasmBookmarkStore} from './bookmark-store.mjs';
import {createLocalApp} from './local-app.mjs';

export const APPLICATION_ID = 0x42535731;
export const MAX_DATABASE_BYTES = 100 * 1024 * 1024;
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

function scalar(db, sql) { return db.exec(sql)[0]?.values[0]?.[0]; }

export function validateDatabase(SQL, bytes, schema) {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_DATABASE_BYTES) throw new Error('Choose a WASM Bookmark Sorter backup smaller than 100 MB.');
  let db, reference;
  try {
    db = new SQL.Database(bytes);
    if (scalar(db, 'PRAGMA application_id') !== APPLICATION_ID || scalar(db, 'PRAGMA user_version') !== 1) {
      throw new Error('This is not a compatible WASM Bookmark Sorter database.');
    }
    // Reject triggers, views, extra tables and modified schemas before app queries run.
    reference = new SQL.Database(); reference.run(schema);
    const objects = database => JSON.stringify(database.exec("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name"));
    if (objects(db) !== objects(reference)) throw new Error('The backup schema does not match this application.');
    if (scalar(db, 'PRAGMA integrity_check') !== 'ok' || db.exec('PRAGMA foreign_key_check').length) throw new Error('The database backup failed its integrity check.');
    for (const row of db.exec('SELECT url FROM items')[0]?.values || []) {
      // Stored non-web bookmarks are inert text; the card renderer only links HTTP(S).
      try { new URL(row[0]); }
      catch { throw new Error('The backup contains an invalid bookmark URL.'); }
    }
    for (const [ref] of db.exec('SELECT image_ref FROM captures WHERE image_ref IS NOT NULL')[0]?.values || []) {
      if (!IMAGE.test(ref) || ref.length > 7 * 1024 * 1024) throw new Error('The backup contains an unsupported picture.');
    }
    db.run('PRAGMA foreign_keys = ON');
    return db;
  } catch (error) { db?.close(); throw error; }
  finally { reference?.close(); }
}

export async function createRuntime({SQL, schema, persistence, onSaved = () => {}}) {
  const saved = await persistence.read();
  let revision = saved?.revision ?? 0;
  const db = saved ? validateDatabase(SQL, new Uint8Array(saved.bytes), schema) : new SQL.Database();
  if (!saved) { db.run(schema); db.run(`PRAGMA application_id = ${APPLICATION_ID}`); }
  db.run('PRAGMA foreign_keys = ON');
  const binding = new SqliteBinding(db);
  const store = new WasmBookmarkStore(binding, {ownerId: 'local-device'});
  await store.ensurePersonalCollection({id: 'personal', name: 'My bookmarks'});
  if (!saved) revision = await persistence.save(binding.snapshot(), revision);
  const app = createLocalApp({store});
  let queue = Promise.resolve();
  const enqueue = operation => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  const replace = bytes => {
    binding.database.close();
    binding.database = new SQL.Database(bytes);
    binding.database.run('PRAGMA foreign_keys = ON');
  };
  async function commit() {
    const bytes = binding.snapshot();
    if (bytes.length > MAX_DATABASE_BYTES) throw new Error('This database is over 100 MB. Export it and use a smaller collection.');
    revision = await persistence.save(bytes, revision);
    onSaved({revision, bytes: bytes.length});
  }
  async function atomic(operation) {
    const before = binding.snapshot();
    binding.database.run('SAVEPOINT action');
    try {
      const result = await operation();
      if (result instanceof Response && !result.ok) {
        binding.database.run('ROLLBACK TO action; RELEASE action');
        return result;
      }
      binding.database.run('RELEASE action');
      await commit();
      return result;
    } catch (error) {
      replace(before);
      throw error;
    }
  }
  return {
    store, binding,
    request(path, options = {}) {
      return enqueue(async () => {
        if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const url = new URL(path, 'https://bookmark.local');
        if (url.origin !== 'https://bookmark.local' || !url.pathname.startsWith('/api/')) throw new Error('Only local bookmark actions are supported.');
        const request = new Request(url, options);
        if (request.method === 'GET') return app.handle(request);
        try { return await atomic(() => app.handle(request)); }
        catch (error) { return Response.json({error: `Change not saved: ${error.message}`}, {status: 507}); }
      });
    },
    backup() { return enqueue(() => binding.snapshot()); },
    restore(bytes) {
      return enqueue(async () => {
        const checked = validateDatabase(SQL, bytes, schema);
        checked.close();
        const before = binding.snapshot();
        try { replace(bytes); await commit(); }
        catch (error) { replace(before); throw error; }
      });
    },
    attachImage(collectionId, urlKey, dataUrl) {
      return enqueue(() => atomic(async () => {
        if (!IMAGE.test(dataUrl) || dataUrl.length > 7 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP picture smaller than 5 MB.');
        if (!await store.collectionHasUrlKey(collectionId, urlKey)) throw new Error('The bookmark is no longer in this collection.');
        await store.upsertCapture({url_key: urlKey, image_ref: dataUrl, source: 'screenshot', state: 'local-image', captured_at: new Date().toISOString(), content_type: dataUrl.slice(5, dataUrl.indexOf(';'))});
      }));
    },
    savePreview(collectionId, urlKey, {title, description, dataUrl, mode}) {
      return enqueue(() => atomic(async () => {
        if (dataUrl && (!IMAGE.test(dataUrl) || dataUrl.length > 7 * 1024 * 1024)) throw new Error('The preview picture is too large.');
        if (!await store.collectionHasUrlKey(collectionId, urlKey)) throw new Error('The bookmark is no longer in this collection.');
        const previous = await store.getCapture(urlKey);
        const image = previous?.state === 'local-image' ? previous.image_ref : dataUrl || previous?.image_ref || null;
        await store.upsertCapture({url_key: urlKey, image_ref: image, source: mode === 'screenshot' ? 'screenshot' : 'og',
          state: previous?.state === 'local-image' ? 'local-image' : 'online-preview', captured_at: new Date().toISOString(),
          page_title: String(title || '').slice(0,1000), description: String(description || '').slice(0,4000),
          content_type: image ? image.slice(5,image.indexOf(';')) : null});
      }));
    },
    diagnostics() {
      return {engine: 'SQLite/WASM', sqliteVersion: scalar(binding.database, 'SELECT sqlite_version()'), statements: binding.statements, revision};
    },
  };
}
