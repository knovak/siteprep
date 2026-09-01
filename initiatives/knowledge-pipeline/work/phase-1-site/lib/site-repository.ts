import { env } from 'cloudflare:workers';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import {
  authorizationDecision,
  canonicalJson,
  erasePreview,
  makeEmptyBackup,
  normalizeCollectionName,
  normalizeEmail,
  privateBlobKey,
  sha256,
  validateEmptyBackup,
} from './domain.mjs';

export type AuthorizedContext = {
  actorId: string;
  authorizedUserId: string;
  email: string;
  role: 'admin' | 'user';
  siteUserId: string;
};

export type CollectionRecord = {
  id: string;
  ownerActorId: string;
  name: string;
  normalizedName: string;
  state: 'active' | 'tombstoned' | 'erased';
  revision: number;
  createdAt: string;
};

type AllowlistRow = {
  id: string;
  normalized_email: string;
  site_user_id: string | null;
  role: 'admin' | 'user';
  disabled_at: string | null;
};

export class AccessError extends Error {
  constructor(public status: 401 | 403 | 404 | 409, public code: string, message: string) {
    super(message);
    this.name = 'AccessError';
  }
}

const now = () => new Date().toISOString();
const db = () => env.DB;
const shortHash = async (value: string) => (await sha256(value)).slice(7, 31);

async function seedAdministrator() {
  const configured = normalizeEmail(env.KNOWLEDGE_PIPELINE_ADMIN_EMAIL);
  if (!configured) return;
  const count = await db().prepare('SELECT COUNT(*) AS count FROM authorized_user').first<{count: number}>();
  if (Number(count?.count ?? 0) > 0) return;
  const at = now();
  const id = `authorized:${await shortHash(configured)}`;
  const systemActor = 'actor:deployment-bootstrap';
  await db().batch([
    db().prepare(`INSERT INTO authorized_user
      (id, normalized_email, site_user_id, role, created_at, created_by_actor_id, disabled_at)
      VALUES (?, ?, NULL, 'admin', ?, ?, NULL)`).bind(id, configured, at, systemActor),
    db().prepare(`INSERT INTO activity
      (id, collection_id, actor_id, type, status, created_at, details_json)
      VALUES (?, NULL, ?, 'administrator-bootstrap', 'completed', ?, ?)`)
      .bind(`activity:bootstrap:${await shortHash(`${configured}:${at}`)}`, systemActor, at, JSON.stringify({authorizedUserId: id})),
  ]);
}

export async function authorizeUser(user: ChatGPTUser): Promise<AuthorizedContext> {
  if (!user.userId || !user.email) throw new AccessError(401, 'identity.required', 'Complete trusted identity is required');
  await seedAdministrator();
  const email = normalizeEmail(user.email);
  let row = await db().prepare('SELECT * FROM authorized_user WHERE site_user_id = ?').bind(user.userId).first<AllowlistRow>();
  if (!row) row = await db().prepare('SELECT * FROM authorized_user WHERE normalized_email = ?').bind(email).first<AllowlistRow>();
  const decision = authorizationDecision({userId: user.userId, email}, row ? {siteUserId: row.site_user_id, disabledAt: row.disabled_at} : null);
  if (decision.status !== 200 || !row) throw new AccessError(decision.status as 401 | 403, decision.code, 'This identity is not authorized for Knowledge Pipeline');

  const actorId = `actor:${await shortHash(row.id)}`;
  if (!row.site_user_id) {
    const at = now();
    try {
      await db().batch([
        db().prepare('UPDATE authorized_user SET site_user_id = ? WHERE id = ? AND site_user_id IS NULL').bind(user.userId, row.id),
        db().prepare(`INSERT OR IGNORE INTO actor
          (id, authorized_user_id, normalized_email, site_user_id, role, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(actorId, row.id, email, user.userId, row.role, at),
        db().prepare(`INSERT INTO activity
          (id, collection_id, actor_id, type, status, created_at, details_json)
          VALUES (?, NULL, ?, 'identity-link', 'completed', ?, ?)`)
          .bind(`activity:identity-link:${await shortHash(`${row.id}:${user.userId}`)}`, actorId, at, JSON.stringify({authorizedUserId: row.id})),
      ]);
    } catch {
      throw new AccessError(409, 'identity.link_conflict', 'This allowlist row is already linked to another Site identity');
    }
  } else {
    await db().prepare(`INSERT OR IGNORE INTO actor
      (id, authorized_user_id, normalized_email, site_user_id, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(actorId, row.id, email, user.userId, row.role, now()).run();
  }
  return {actorId, authorizedUserId: row.id, email, role: row.role, siteUserId: user.userId};
}

function mapCollection(row: any): CollectionRecord {
  return {
    id: row.id,
    ownerActorId: row.owner_actor_id,
    name: row.name,
    normalizedName: row.normalized_name,
    state: row.state,
    revision: Number(row.revision),
    createdAt: row.created_at,
  };
}

export async function listCollections(context: AuthorizedContext) {
  const result = await db().prepare(`SELECT * FROM collection
    WHERE owner_actor_id = ? AND state != 'erased' ORDER BY normalized_name`)
    .bind(context.actorId).all();
  return result.results.map(mapCollection);
}

export async function currentSelection(context: AuthorizedContext) {
  const state = await db().prepare('SELECT * FROM actor_state WHERE actor_id = ?').bind(context.actorId).first<any>();
  if (!state?.selected_collection_id) return {collection: null, selectionRevision: Number(state?.selection_revision ?? 0)};
  const row = await db().prepare(`SELECT * FROM collection
    WHERE id = ? AND owner_actor_id = ? AND state = 'active'`)
    .bind(state.selected_collection_id, context.actorId).first();
  return {collection: row ? mapCollection(row) : null, selectionRevision: Number(state.selection_revision)};
}

export async function createCollection(context: AuthorizedContext, requestedName: unknown) {
  const parsed = normalizeCollectionName(requestedName);
  if (!parsed.ok) throw new AccessError(409, parsed.code, 'Collection name is invalid');
  const id = `collection:${crypto.randomUUID()}`;
  const at = now();
  const activityId = `activity:${crypto.randomUUID()}`;
  const receiptId = `receipt:${crypto.randomUUID()}`;
  const operationId = `operation:${crypto.randomUUID()}`;
  try {
    await db().batch([
      db().prepare(`INSERT INTO collection
        (id, owner_actor_id, name, normalized_name, state, revision, created_at)
        VALUES (?, ?, ?, ?, 'active', 1, ?)`)
        .bind(id, context.actorId, parsed.name, parsed.normalized, at),
      db().prepare(`INSERT INTO activity
        (id, collection_id, actor_id, type, status, created_at, details_json)
        VALUES (?, ?, ?, 'collection-create', 'completed', ?, ?)`)
        .bind(activityId, id, context.actorId, at, JSON.stringify({name: parsed.name})),
      db().prepare(`INSERT INTO receipt
        (id, collection_id, activity_id, operation_id, package_hash, mode, created_at, result_json)
        VALUES (?, ?, ?, ?, 'sha256:genesis', 'merge', ?, ?)`)
        .bind(receiptId, id, activityId, operationId, at, JSON.stringify({createdCollectionId: id})),
      db().prepare(`INSERT INTO actor_state (actor_id, selected_collection_id, selection_revision, updated_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(actor_id) DO UPDATE SET selected_collection_id = excluded.selected_collection_id,
          selection_revision = actor_state.selection_revision + 1, updated_at = excluded.updated_at`)
        .bind(context.actorId, id, at),
    ]);
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new AccessError(409, 'collection.name.duplicate', 'A collection with this name already exists');
    throw error;
  }
  return id;
}

export async function selectCollection(context: AuthorizedContext, collectionId: string) {
  const row = await db().prepare(`SELECT id FROM collection
    WHERE id = ? AND owner_actor_id = ? AND state = 'active'`)
    .bind(collectionId, context.actorId).first();
  if (!row) throw new AccessError(404, 'collection.not_found', 'Collection is unavailable');
  const at = now();
  await db().batch([
    db().prepare(`INSERT INTO actor_state (actor_id, selected_collection_id, selection_revision, updated_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(actor_id) DO UPDATE SET selected_collection_id = excluded.selected_collection_id,
        selection_revision = actor_state.selection_revision + 1, updated_at = excluded.updated_at`)
      .bind(context.actorId, collectionId, at),
    db().prepare(`UPDATE import_preview SET state = 'invalidated'
      WHERE actor_id = ? AND state = 'pending'`).bind(context.actorId),
  ]);
}

export async function collectionCounts(context: AuthorizedContext, collectionId: string) {
  const collection = await db().prepare('SELECT id FROM collection WHERE id = ? AND owner_actor_id = ?')
    .bind(collectionId, context.actorId).first();
  if (!collection) throw new AccessError(404, 'collection.not_found', 'Collection is unavailable');
  const [assets, backups] = await db().batch([
    db().prepare('SELECT COUNT(*) AS count FROM collection_asset_ref WHERE collection_id = ?').bind(collectionId),
    db().prepare('SELECT COUNT(*) AS count FROM backup WHERE collection_id = ?').bind(collectionId),
  ]);
  return {entities: 0, schedules: 0, assets: Number((assets.results?.[0] as any)?.count ?? 0), backups: Number((backups.results?.[0] as any)?.count ?? 0)};
}

export async function previewErase(context: AuthorizedContext, collectionId: string) {
  const selected = await currentSelection(context);
  if (!selected.collection || selected.collection.id !== collectionId) throw new AccessError(409, 'collection.selection.changed', 'Select the collection again before erasing it');
  return erasePreview(selected.collection, await collectionCounts(context, collectionId), selected.selectionRevision);
}

export async function tombstoneAndErase(context: AuthorizedContext, collectionId: string, expectedRevision: number) {
  const at = now();
  const activityId = `activity:${crypto.randomUUID()}`;
  const result = await db().batch([
    db().prepare(`UPDATE collection SET state = 'tombstoned', tombstoned_at = ?, revision = revision + 1
      WHERE id = ? AND owner_actor_id = ? AND state = 'active' AND revision = ?`)
      .bind(at, collectionId, context.actorId, expectedRevision),
    db().prepare("UPDATE import_preview SET state = 'invalidated' WHERE collection_id = ? AND state = 'pending'").bind(collectionId),
    db().prepare('DELETE FROM collection_asset_ref WHERE collection_id = ?').bind(collectionId),
    db().prepare(`INSERT INTO activity
      (id, collection_id, actor_id, type, status, created_at, details_json)
      VALUES (?, ?, ?, 'collection-erase', 'completed', ?, ?)`)
      .bind(activityId, collectionId, context.actorId, at, JSON.stringify({requestDriven: true})),
  ]);
  if (Number(result[0].meta.changes ?? 0) !== 1) throw new AccessError(409, 'erase.preview.stale', 'Collection changed after erase preview');
  await db().batch([
    db().prepare("UPDATE collection SET state = 'erased', erased_at = ?, revision = revision + 1 WHERE id = ? AND owner_actor_id = ? AND state = 'tombstoned'")
      .bind(now(), collectionId, context.actorId),
    db().prepare('UPDATE actor_state SET selected_collection_id = NULL, selection_revision = selection_revision + 1, updated_at = ? WHERE actor_id = ? AND selected_collection_id = ?')
      .bind(now(), context.actorId, collectionId),
  ]);
}

export async function collectionAudit(context: AuthorizedContext, collectionId: string) {
  const collection = await db().prepare('SELECT * FROM collection WHERE id = ? AND owner_actor_id = ?')
    .bind(collectionId, context.actorId).first();
  if (!collection) throw new AccessError(404, 'collection.not_found', 'Collection is unavailable');
  const [activities, receipts] = await db().batch([
    db().prepare('SELECT * FROM activity WHERE collection_id = ? ORDER BY created_at, id').bind(collectionId),
    db().prepare('SELECT * FROM receipt WHERE collection_id = ? ORDER BY created_at, id').bind(collectionId),
  ]);
  return {collection: mapCollection(collection), activities: activities.results, receipts: receipts.results};
}

function portableActivity(row: any) {
  return {
    id: row.id,
    type: row.type,
    actorId: row.actor_id,
    createdAt: row.created_at,
    status: row.status,
    details: JSON.parse(row.details_json),
  };
}

function portableReceipt(row: any) {
  return {
    id: row.id,
    operationId: row.operation_id,
    packageHash: row.package_hash,
    activityId: row.activity_id,
    createdAt: row.created_at,
    mode: row.mode,
    createdHashes: [],
    result: JSON.parse(row.result_json),
  };
}

export async function createCurrentBackup(context: AuthorizedContext, collectionId: string) {
  const audit = await collectionAudit(context, collectionId);
  if (audit.collection.state !== 'active') throw new AccessError(409, 'collection.not_active', 'Only an active collection can be backed up');
  const createdAt = now();
  const pkg = await makeEmptyBackup({
    collection: audit.collection,
    actor: {id: context.actorId},
    activities: audit.activities.map(portableActivity),
    receipts: audit.receipts.map(portableReceipt),
    createdAt,
  });
  const manifest = strToU8(canonicalJson(pkg));
  const bytes = zipSync({'manifest.json': manifest}, {level: 0});
  const contentHash = await sha256(bytes);
  const backupId = `backup:${crypto.randomUUID()}`;
  const objectKey = privateBlobKey(context.actorId, collectionId, 'backup', backupId);
  await env.FILES.put(objectKey, bytes, {httpMetadata: {contentType: 'application/zip'}, customMetadata: {collectionId, contentHash, packageId: pkg.packageId}});
  const activityId = `activity:${crypto.randomUUID()}`;
  const receiptId = `receipt:${crypto.randomUUID()}`;
  const operationId = `operation:${crypto.randomUUID()}`;
  try {
    await db().batch([
      db().prepare(`INSERT INTO backup
        (id, collection_id, actor_id, object_key, package_id, content_hash, byte_size, state, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'accepted', ?)`)
        .bind(backupId, collectionId, context.actorId, objectKey, pkg.packageId, contentHash, bytes.byteLength, createdAt),
      db().prepare(`INSERT INTO activity
        (id, collection_id, actor_id, type, status, created_at, details_json)
        VALUES (?, ?, ?, 'collection-export', 'completed', ?, ?)`)
        .bind(activityId, collectionId, context.actorId, createdAt, JSON.stringify({backupId, packageId: pkg.packageId})),
      db().prepare(`INSERT INTO receipt
        (id, collection_id, activity_id, operation_id, package_hash, mode, created_at, result_json)
        VALUES (?, ?, ?, ?, ?, 'merge', ?, ?)`)
        .bind(receiptId, collectionId, activityId, operationId, contentHash, createdAt, JSON.stringify({backupId, objectKey: 'private'})),
    ]);
  } catch (error) {
    await env.FILES.delete(objectKey);
    throw error;
  }
  return {backupId, packageId: pkg.packageId, contentHash, byteSize: bytes.byteLength};
}

export async function listBackups(context: AuthorizedContext, collectionId: string) {
  const collection = await db().prepare('SELECT id FROM collection WHERE id = ? AND owner_actor_id = ?')
    .bind(collectionId, context.actorId).first();
  if (!collection) throw new AccessError(404, 'collection.not_found', 'Collection is unavailable');
  const result = await db().prepare(`SELECT id, package_id, content_hash, byte_size, state, created_at
    FROM backup WHERE collection_id = ? ORDER BY created_at DESC`).bind(collectionId).all();
  return result.results;
}

async function ownedBackup(context: AuthorizedContext, collectionId: string, backupId: string) {
  const row = await db().prepare(`SELECT backup.* FROM backup
    JOIN collection ON collection.id = backup.collection_id
    WHERE backup.id = ? AND backup.collection_id = ? AND collection.owner_actor_id = ?`)
    .bind(backupId, collectionId, context.actorId).first<any>();
  if (!row) throw new AccessError(404, 'backup.not_found', 'Backup is unavailable');
  return row;
}

export async function readBackupBytes(context: AuthorizedContext, collectionId: string, backupId: string) {
  const row = await ownedBackup(context, collectionId, backupId);
  const object = await env.FILES.get(row.object_key);
  if (!object) throw new AccessError(404, 'backup.object_missing', 'Private backup object is missing');
  const bytes = new Uint8Array(await object.arrayBuffer());
  if (await sha256(bytes) !== row.content_hash) throw new AccessError(409, 'backup.hash_mismatch', 'Private backup checksum does not match');
  return bytes;
}

export async function restoreEmptyBackup(context: AuthorizedContext, collectionId: string, backupId: string) {
  const bytes = await readBackupBytes(context, collectionId, backupId);
  const files = unzipSync(bytes);
  if (!files['manifest.json']) throw new AccessError(409, 'backup.manifest_missing', 'Backup manifest is missing');
  const pkg = JSON.parse(strFromU8(files['manifest.json']));
  const errors = validateEmptyBackup(pkg, collectionId);
  if (errors.length) throw new AccessError(409, errors[0], 'Backup cannot restore into this collection');
  const operationId = `operation:restore:${backupId}`;
  const existing = await db().prepare('SELECT id FROM receipt WHERE collection_id = ? AND operation_id = ?')
    .bind(collectionId, operationId).first();
  if (existing) return {duplicate: true, packageId: pkg.packageId};
  const at = now();
  const activityId = `activity:${crypto.randomUUID()}`;
  const receiptId = `receipt:${crypto.randomUUID()}`;
  await db().batch([
    db().prepare(`INSERT INTO activity
      (id, collection_id, actor_id, type, status, created_at, details_json)
      VALUES (?, ?, ?, 'collection-restore', 'completed', ?, ?)`)
      .bind(activityId, collectionId, context.actorId, at, JSON.stringify({backupId, packageId: pkg.packageId})),
    db().prepare(`INSERT INTO receipt
      (id, collection_id, activity_id, operation_id, package_hash, mode, created_at, result_json)
      VALUES (?, ?, ?, ?, ?, 'restore', ?, ?)`)
      .bind(receiptId, collectionId, activityId, operationId, await sha256(bytes), at, JSON.stringify({backupId, emptyState: true})),
  ]);
  return {duplicate: false, packageId: pkg.packageId};
}

export async function listAuthorizedUsers(context: AuthorizedContext) {
  if (context.role !== 'admin') throw new AccessError(403, 'admin.required', 'Administrator role is required');
  const result = await db().prepare('SELECT id, normalized_email, site_user_id, role, created_at, disabled_at FROM authorized_user ORDER BY normalized_email').all();
  return result.results;
}

export async function addAuthorizedUser(context: AuthorizedContext, emailValue: unknown, role: 'admin' | 'user') {
  if (context.role !== 'admin') throw new AccessError(403, 'admin.required', 'Administrator role is required');
  const email = normalizeEmail(emailValue);
  if (!email || !email.includes('@') || !['admin', 'user'].includes(role)) throw new AccessError(409, 'authorized_user.invalid', 'Email and role are required');
  const id = `authorized:${await shortHash(email)}`;
  await db().prepare(`INSERT INTO authorized_user
    (id, normalized_email, site_user_id, role, created_at, created_by_actor_id, disabled_at)
    VALUES (?, ?, NULL, ?, ?, ?, NULL)`)
    .bind(id, email, role, now(), context.actorId).run();
}

export async function adminCollectionPreview(context: AuthorizedContext) {
  if (context.role !== 'admin') throw new AccessError(403, 'admin.required', 'Administrator role is required');
  const result = await db().prepare(`SELECT collection.id, collection.name, collection.state, actor.normalized_email AS owner_email
    FROM collection JOIN actor ON actor.id = collection.owner_actor_id ORDER BY owner_email, collection.normalized_name`).all();
  return result.results;
}

export function responseForError(error: unknown) {
  if (error instanceof AccessError) return Response.json({error: error.code}, {status: error.status});
  console.error(error);
  return Response.json({error: 'internal.error'}, {status: 500});
}
