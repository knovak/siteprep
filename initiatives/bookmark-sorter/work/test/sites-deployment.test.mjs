import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), 'utf8');

async function applyMigration(database, relative) {
  const sql = await read(relative);
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) database.exec(statement);
  }
}

test('Sites declares the approved D1 and R2 end-user deployment', async () => {
  const hosting = JSON.parse(await read('.openai/hosting.json'));
  assert.match(hosting.project_id, /^appgprj_/);
  assert.equal(hosting.d1, 'DB');
  assert.equal(hosting.r2, 'CAPTURES');
  const worker = await read('worker/index.ts');
  assert.match(worker, /input: \{bytes: Uint8Array; contentType\?: string; sourceUrl\?: string; maxWidth: number; maxHeight: number\}/);
  assert.match(worker, /cf: \{image:/);
  assert.match(worker, /width: input\.maxWidth/);
  assert.match(worker, /height: input\.maxHeight/);
  assert.doesNotMatch(worker, /width: input\.width|height: input\.height/);
});

test('the generated deployment migration creates the complete final schema', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  const migrations = (await readdir(new URL('../drizzle/', import.meta.url)))
    .filter(name => name.endsWith('.sql'))
    .sort();
  for (const migration of migrations) await applyMigration(database, `drizzle/${migration}`);

  const tables = database.prepare(
    "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name",
  ).all().map(row => row.name);
  assert.deepEqual(tables, [
    'app_users',
    'authorized_user',
    'capture_queue',
    'captures',
    'collections',
    'items',
    'selection_history',
    'selections',
    'tags',
    'triage_actions',
    'triage_sessions',
  ]);

  const indexes = new Set(database.prepare(
    "SELECT name FROM sqlite_schema WHERE type = 'index' AND name NOT LIKE 'sqlite_%'",
  ).all().map(row => row.name));
  for (const required of [
    'idx_collections_owner_personal',
    'items_collection_url_key_unique',
    'idx_items_collection_untriaged',
    'idx_capture_queue_pending',
    'idx_triage_actions_session_active',
    'idx_selection_history_owner_used',
  ]) assert.ok(indexes.has(required), `missing deployment index ${required}`);

  assert.deepEqual(database.prepare('SELECT email, type FROM authorized_user ORDER BY email').all().map(user => ({...user})), [
    {email: 'julie.duffield@gmail.com', type: 'user'},
    {email: 'krnovak@gmail.com', type: 'admin'},
  ]);

  database.exec("INSERT INTO app_users (owner_id) VALUES ('tester')");
  database.exec(
    "INSERT INTO collections (id, name, owner_id, kind, created_at) VALUES ('pile', 'My bookmarks', 'tester', 'personal', '2026-08-19T00:00:00Z')",
  );
  assert.throws(() => database.exec(
    "INSERT INTO collections (id, name, owner_id, kind, created_at) VALUES ('other', 'Other', 'tester', 'personal', '2026-08-19T00:00:01Z')",
  ));
  database.exec(
    "INSERT INTO collections (id, name, owner_id, kind, created_at) VALUES ('private', 'Research queue', 'tester', 'private', '2026-08-19T00:00:02Z')",
  );
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM items WHERE collection_id = 'private'").get().count, 0);
});

test('the generated collection migration preserves an existing pile and its items', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  await applyMigration(database, 'drizzle/0000_lively_fat_cobra.sql');
  database.exec("INSERT INTO app_users (owner_id) VALUES ('tester')");
  database.exec(
    "INSERT INTO collections (id, name, owner_id, kind, created_at) VALUES ('pile', 'My bookmarks', 'tester', 'personal', '2026-08-19T00:00:00Z')",
  );
  database.exec(
    "INSERT INTO items (id, collection_id, url, url_key, title, title_key, ingested_at) VALUES ('item', 'pile', 'https://example.com', 'https://example.com', 'Example', 'example', '2026-08-19T00:00:00Z')",
  );

  await applyMigration(database, 'drizzle/0001_sticky_wild_pack.sql');
  assert.equal(database.prepare("SELECT name FROM collections WHERE id = 'pile'").get().name, 'My bookmarks');
  assert.equal(database.prepare("SELECT collection_id FROM items WHERE id = 'item'").get().collection_id, 'pile');
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
  database.exec(
    "INSERT INTO collections (id, name, owner_id, kind, created_at) VALUES ('private', 'Research queue', 'tester', 'private', '2026-08-20T00:00:00Z')",
  );
});
