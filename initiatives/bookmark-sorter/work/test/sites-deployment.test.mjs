import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), 'utf8');

test('Sites declares the approved D1 and R2 end-user deployment', async () => {
  const hosting = JSON.parse(await read('.openai/hosting.json'));
  assert.match(hosting.project_id, /^appgprj_/);
  assert.equal(hosting.d1, 'DB');
  assert.equal(hosting.r2, 'CAPTURES');
  const worker = await read('worker/index.ts');
  assert.match(worker, /input: \{bytes: Uint8Array; contentType\?: string; maxWidth: number; maxHeight: number\}/);
  assert.match(worker, /width: input\.maxWidth/);
  assert.match(worker, /height: input\.maxHeight/);
  assert.doesNotMatch(worker, /width: input\.width|height: input\.height/);
});

test('the generated deployment migration creates the complete final schema', async () => {
  const sql = await read('drizzle/0000_lively_fat_cobra.sql');
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) database.exec(statement);
  }

  const tables = database.prepare(
    "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name",
  ).all().map(row => row.name);
  assert.deepEqual(tables, [
    'app_users',
    'capture_queue',
    'captures',
    'collections',
    'items',
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
  ]) assert.ok(indexes.has(required), `missing deployment index ${required}`);

  database.exec("INSERT INTO app_users (owner_id) VALUES ('tester')");
  database.exec(
    "INSERT INTO collections (id, name, owner_id, kind, created_at) VALUES ('pile', 'My bookmarks', 'tester', 'personal', '2026-08-19T00:00:00Z')",
  );
  assert.throws(() => database.exec(
    "INSERT INTO collections (id, name, owner_id, kind, created_at) VALUES ('other', 'Other', 'tester', 'personal', '2026-08-19T00:00:01Z')",
  ));
});
