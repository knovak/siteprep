import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { authorizationDecision, normalizeCollectionName, normalizeEmail, sha256 } from './domain.mjs';

export class LocalAdapters {
  constructor(databasePath, blobRoot) {
    this.database = new DatabaseSync(databasePath);
    this.blobRoot = blobRoot;
    mkdirSync(blobRoot, {recursive: true});
    this.database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE authorized_user (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, site_user_id TEXT UNIQUE, role TEXT NOT NULL);
      CREATE TABLE actor (id TEXT PRIMARY KEY, authorized_user_id TEXT UNIQUE NOT NULL, site_user_id TEXT UNIQUE NOT NULL);
      CREATE TABLE collection (id TEXT PRIMARY KEY, owner_actor_id TEXT NOT NULL, name TEXT NOT NULL, normalized_name TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL, UNIQUE(owner_actor_id, normalized_name));
      CREATE TABLE actor_state (actor_id TEXT PRIMARY KEY, selected_collection_id TEXT, selection_revision INTEGER NOT NULL);
      CREATE TABLE asset (id TEXT PRIMARY KEY, hash TEXT NOT NULL, path TEXT NOT NULL);
      CREATE TABLE collection_asset_ref (collection_id TEXT NOT NULL, asset_id TEXT NOT NULL, PRIMARY KEY(collection_id, asset_id));
      CREATE TABLE receipt (operation_id TEXT PRIMARY KEY, collection_id TEXT NOT NULL);
    `);
  }

  close() { this.database.close(); }

  seed(email, role = 'admin') {
    const normalized = normalizeEmail(email);
    this.database.prepare('INSERT INTO authorized_user(id, email, role) VALUES (?, ?, ?)').run(`authorized:${normalized}`, normalized, role);
  }

  authorize(identity) {
    const normalized = normalizeEmail(identity?.email);
    const row = this.database.prepare('SELECT * FROM authorized_user WHERE site_user_id = ? OR email = ? ORDER BY site_user_id IS NOT NULL DESC LIMIT 1').get(identity?.userId ?? '', normalized);
    const decision = authorizationDecision(identity, row ? {siteUserId: row.site_user_id, disabledAt: null} : null);
    if (decision.status !== 200) return decision;
    const actorId = `actor:${row.id}`;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      if (!row.site_user_id) this.database.prepare('UPDATE authorized_user SET site_user_id = ? WHERE id = ? AND site_user_id IS NULL').run(identity.userId, row.id);
      this.database.prepare('INSERT OR IGNORE INTO actor(id, authorized_user_id, site_user_id) VALUES (?, ?, ?)').run(actorId, row.id, identity.userId);
      this.database.exec('COMMIT');
      return {status: 200, actorId, role: row.role};
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  createCollection(actorId, requestedName, {faultAfterInsert = false} = {}) {
    const parsed = normalizeCollectionName(requestedName);
    if (!parsed.ok) throw new Error(parsed.code);
    const id = `collection:${crypto.randomUUID()}`;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare("INSERT INTO collection VALUES (?, ?, ?, ?, 'active', 1)").run(id, actorId, parsed.name, parsed.normalized);
      if (faultAfterInsert) throw new Error('Injected local transaction fault');
      this.database.prepare(`INSERT INTO actor_state VALUES (?, ?, 1)
        ON CONFLICT(actor_id) DO UPDATE SET selected_collection_id = excluded.selected_collection_id,
        selection_revision = actor_state.selection_revision + 1`).run(actorId, id);
      this.database.prepare('INSERT INTO receipt VALUES (?, ?)').run(`operation:create:${id}`, id);
      this.database.exec('COMMIT');
      return id;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  listCollections(actorId) {
    return this.database.prepare("SELECT id, name, state, revision FROM collection WHERE owner_actor_id = ? AND state != 'erased' ORDER BY normalized_name").all(actorId);
  }

  selectCollection(actorId, collectionId) {
    const row = this.database.prepare("SELECT id FROM collection WHERE id = ? AND owner_actor_id = ? AND state = 'active'").get(collectionId, actorId);
    if (!row) throw new Error('collection.not_found');
    this.database.prepare(`INSERT INTO actor_state VALUES (?, ?, 1)
      ON CONFLICT(actor_id) DO UPDATE SET selected_collection_id = excluded.selected_collection_id,
      selection_revision = actor_state.selection_revision + 1`).run(actorId, collectionId);
    return this.database.prepare('SELECT * FROM actor_state WHERE actor_id = ?').get(actorId);
  }

  async putBlob(actorId, collectionId, id, bytes) {
    const owned = this.database.prepare('SELECT id FROM collection WHERE id = ? AND owner_actor_id = ?').get(collectionId, actorId);
    if (!owned) throw new Error('collection.not_found');
    const hash = await sha256(bytes);
    const path = join(this.blobRoot, hash.slice(7));
    if (!this.database.prepare('SELECT id FROM asset WHERE id = ?').get(id)) {
      writeFileSync(path, bytes);
      this.database.prepare('INSERT INTO asset VALUES (?, ?, ?)').run(id, hash, path);
    }
    this.database.prepare('INSERT OR IGNORE INTO collection_asset_ref VALUES (?, ?)').run(collectionId, id);
    return hash;
  }

  readBlob(actorId, collectionId, id) {
    const row = this.database.prepare(`SELECT asset.path FROM asset
      JOIN collection_asset_ref ON collection_asset_ref.asset_id = asset.id
      JOIN collection ON collection.id = collection_asset_ref.collection_id
      WHERE asset.id = ? AND collection.id = ? AND collection.owner_actor_id = ?`).get(id, collectionId, actorId);
    if (!row) throw new Error('asset.not_found');
    return readFileSync(row.path);
  }

  eraseCollection(actorId, collectionId) {
    const row = this.database.prepare("SELECT id FROM collection WHERE id = ? AND owner_actor_id = ? AND state = 'active'").get(collectionId, actorId);
    if (!row) return false;
    const referenced = this.database.prepare('SELECT asset_id FROM collection_asset_ref WHERE collection_id = ?').all(collectionId);
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare("UPDATE collection SET state = 'erased', revision = revision + 2 WHERE id = ?").run(collectionId);
      this.database.prepare('DELETE FROM collection_asset_ref WHERE collection_id = ?').run(collectionId);
      this.database.exec('COMMIT');
    } catch (error) { this.database.exec('ROLLBACK'); throw error; }
    for (const {asset_id: assetId} of referenced) {
      const remaining = this.database.prepare('SELECT COUNT(*) AS count FROM collection_asset_ref WHERE asset_id = ?').get(assetId).count;
      if (remaining === 0) {
        const asset = this.database.prepare('SELECT path FROM asset WHERE id = ?').get(assetId);
        if (asset) rmSync(asset.path, {force: true});
        this.database.prepare('DELETE FROM asset WHERE id = ?').run(assetId);
      }
    }
    return true;
  }
}
