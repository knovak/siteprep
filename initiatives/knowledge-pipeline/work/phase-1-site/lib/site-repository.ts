import { env } from 'cloudflare:workers';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import {
  authorizationDecision,
  canonicalJson,
  erasePreview,
  makeCollectionBackup,
  normalizeCollectionName,
  normalizeEmail,
  privateBlobKey,
  sha256,
  validateCollectionBackup,
} from './domain.mjs';
import { makeHarvestPreview } from './harvest.mjs';
import {commitProposalState, makeWorkPacket, newReviewState, previewProposal} from './review.mjs';

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

// Older Harvest-only operations must never claim to back up, modify, or erase
// the complete workspace while leaving its accepted snapshots behind.
async function requireLegacyHarvest(collectionId: string) {
  const snapshot = await db().prepare('SELECT revision FROM workflow_snapshot WHERE collection_id=? LIMIT 1').bind(collectionId).first();
  if (snapshot) throw new AccessError(409, 'workflow.use_workspace', 'This collection uses the complete workspace. Use its Backup tab; legacy Harvest operations and erasure are unavailable.');
}

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
    db().prepare(`UPDATE proposal_review SET state = 'invalidated'
      WHERE actor_id = ? AND state = 'pending'`).bind(context.actorId),
  ]);
}

export async function collectionCounts(context: AuthorizedContext, collectionId: string) {
  const collection = await db().prepare('SELECT id FROM collection WHERE id = ? AND owner_actor_id = ?')
    .bind(collectionId, context.actorId).first();
  if (!collection) throw new AccessError(404, 'collection.not_found', 'Collection is unavailable');
  const [entities, assets, backups] = await db().batch([
    db().prepare('SELECT COUNT(*) AS count FROM source_record WHERE collection_id = ?').bind(collectionId),
    db().prepare('SELECT COUNT(*) AS count FROM collection_asset_ref WHERE collection_id = ?').bind(collectionId),
    db().prepare('SELECT COUNT(*) AS count FROM backup WHERE collection_id = ?').bind(collectionId),
  ]);
  return {
    entities: Number((entities.results?.[0] as any)?.count ?? 0),
    schedules: 0,
    assets: Number((assets.results?.[0] as any)?.count ?? 0),
    backups: Number((backups.results?.[0] as any)?.count ?? 0),
  };
}

async function selectedCollection(context: AuthorizedContext, collectionId: string): Promise<{collection: CollectionRecord; selectionRevision: number}> {
  const selected = await currentSelection(context);
  if (!selected.collection || selected.collection.id !== collectionId) {
    throw new AccessError(409, 'collection.selection.changed', 'Select the collection again before changing Harvest state');
  }
  return {collection: selected.collection, selectionRevision: selected.selectionRevision};
}

export async function previewHarvest(context: AuthorizedContext, collectionId: string, kind: string, payload: unknown) {
  await requireLegacyHarvest(collectionId);
  const selected = await selectedCollection(context, collectionId);
  let preview;
  try { preview = await makeHarvestPreview(kind, payload); }
  catch (error) { throw new AccessError(409, 'harvest.input.invalid', String((error as Error)?.message ?? error)); }
  const blocking = preview.findings.find(({severity}: any) => severity === 'error');
  if (blocking) throw new AccessError(409, blocking.code, blocking.message);
  if (preview.operations.sources.length > 100) throw new AccessError(409, 'harvest.batch.too_large', 'Hosted previews are limited to 100 sources per commit');
  const id = `preview:${crypto.randomUUID()}`;
  const at = now();
  await db().batch([
    db().prepare("UPDATE import_preview SET state = 'invalidated' WHERE actor_id = ? AND state = 'pending'").bind(context.actorId),
    db().prepare(`INSERT INTO import_preview
      (id, actor_id, collection_id, selection_revision, collection_revision, package_hash,
       intake_kind, operations_json, findings_json, state, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
      .bind(
        id,
        context.actorId,
        collectionId,
        selected.selectionRevision,
        selected.collection.revision,
        preview.contentHash,
        kind,
        JSON.stringify(preview.operations),
        JSON.stringify(preview.findings),
        at,
      ),
  ]);
  return {id, ...preview};
}

export async function listHarvestPreviews(context: AuthorizedContext, collectionId: string) {
  await selectedCollection(context, collectionId);
  const result = await db().prepare(`SELECT id, package_hash, intake_kind, operations_json, findings_json, created_at
    FROM import_preview WHERE actor_id = ? AND collection_id = ? AND state = 'pending'
    ORDER BY created_at DESC LIMIT 5`).bind(context.actorId, collectionId).all();
  return result.results.map((row: any) => {
    const operations = JSON.parse(row.operations_json);
    const findings = JSON.parse(row.findings_json || '[]');
    return {
      id: row.id,
      contentHash: row.package_hash,
      kind: row.intake_kind,
      createdAt: row.created_at,
      findings,
      counts: {
        sources: operations.sources.length,
        withBodies: operations.sources.filter((source: any) => source.body).length,
        restricted: operations.sources.filter((source: any) => source.rightsState === 'restricted').length,
        unknownRights: operations.sources.filter((source: any) => source.rightsState === 'unknown').length,
        tags: new Set(operations.sources.flatMap((source: any) => source.tags.map((item: any) => item.key))).size,
        dependencyProposals: operations.sources.reduce((sum: number, source: any) => sum + source.dependencies.length, 0),
        nativeActivities: operations.activities?.length ?? 0,
      },
    };
  });
}

async function sourceForAliases(collectionId: string, source: any) {
  const sourceIds = new Set<string>();
  const canonical = await db().prepare('SELECT id FROM source_record WHERE collection_id = ? AND canonical_key = ?')
    .bind(collectionId, source.canonicalKey).first<any>();
  if (canonical?.id) sourceIds.add(canonical.id);
  for (const alias of source.aliases) {
    const row = await db().prepare('SELECT source_id FROM external_alias WHERE collection_id = ? AND namespace = ? AND alias_key = ?')
      .bind(collectionId, alias.namespace, alias.key).first<any>();
    if (row?.source_id) sourceIds.add(row.source_id);
  }
  if (sourceIds.size > 1) throw new AccessError(409, 'harvest.alias.conflict', 'Incoming aliases already identify different accepted sources');
  return [...sourceIds][0] ?? null;
}

export async function commitHarvest(context: AuthorizedContext, collectionId: string, previewId: string) {
  await requireLegacyHarvest(collectionId);
  const selected = await selectedCollection(context, collectionId);
  const row = await db().prepare(`SELECT * FROM import_preview
    WHERE id = ? AND actor_id = ? AND collection_id = ?`).bind(previewId, context.actorId, collectionId).first<any>();
  if (!row) throw new AccessError(404, 'harvest.preview.not_found', 'Harvest preview is unavailable');
  if (row.state === 'invalidated') throw new AccessError(409, 'harvest.preview.stale', 'Harvest preview was invalidated by a collection change');
  if (row.selection_revision !== selected.selectionRevision || row.collection_revision !== selected.collection.revision) {
    throw new AccessError(409, 'harvest.preview.stale', 'Collection or selection changed after the preview');
  }
  const operationId = `harvest:${row.package_hash}`;
  const existingReceipt = await db().prepare('SELECT id FROM receipt WHERE collection_id = ? AND operation_id = ?')
    .bind(collectionId, operationId).first<any>();
  if (existingReceipt) {
    await db().prepare("UPDATE import_preview SET state = 'committed' WHERE id = ?").bind(previewId).run();
    return {duplicate: true, receiptId: existingReceipt.id};
  }
  const operations = JSON.parse(row.operations_json);
  if (!Array.isArray(operations.sources) || !operations.sources.length || operations.sources.length > 100) {
    throw new AccessError(409, 'harvest.preview.invalid', 'Harvest preview operation count is invalid');
  }
  const statements = [];
  const at = now();
  let created = 0;
  let updated = 0;
  for (const source of operations.sources) {
    const existingSourceId = await sourceForAliases(collectionId, source);
    const sourceId = existingSourceId ?? `source:${await shortHash(`${collectionId}:${source.canonicalKey}`)}`;
    if (existingSourceId) updated += 1;
    else created += 1;
    const contentHash = await sha256(canonicalJson(source));
    const versionId = `version:${contentHash.slice(7, 39)}`;
    statements.push(
      db().prepare(`INSERT OR IGNORE INTO source_record
        (id, collection_id, canonical_key, current_version_id, state, created_at)
        VALUES (?, ?, ?, NULL, 'active', ?)`).bind(sourceId, collectionId, source.canonicalKey, at),
    );
    for (const alias of source.aliases) statements.push(
      db().prepare(`INSERT OR IGNORE INTO external_alias
        (collection_id, source_id, namespace, alias_key, created_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(collectionId, sourceId, alias.namespace, alias.key, at),
    );
    statements.push(
      db().prepare(`INSERT OR IGNORE INTO source_version
        (id, source_id, content_hash, title, url, source_kind, body_state, rights_state,
         capture_state, source_updated_at, content_json, created_by_actor_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          versionId, sourceId, contentHash, source.title, source.url, source.sourceKind,
          source.bodyState, source.rightsState, source.captureState, source.sourceUpdatedAt,
          JSON.stringify(source), context.actorId, at,
        ),
      db().prepare("UPDATE source_record SET current_version_id = ?, state = 'active' WHERE id = ? AND collection_id = ?")
        .bind(versionId, sourceId, collectionId),
    );
    for (const item of source.tags) statements.push(
      db().prepare(`INSERT OR IGNORE INTO source_tag
        (source_id, label, tag_key, status, type, stage, created_at, archived_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`)
        .bind(sourceId, item.label, item.key, item.status, item.type, item.stage, at),
    );
    for (const proposal of source.dependencies) statements.push(
      db().prepare(`INSERT OR IGNORE INTO dependency_proposal
        (id, collection_id, source_id, relation_type, target_namespace, target_key, state, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'proposed', ?)`)
        .bind(`dependency:${crypto.randomUUID()}`, collectionId, sourceId, proposal.type, proposal.targetNamespace, proposal.targetKey, at),
    );
  }
  for (const [index, nativeActivity] of (operations.activities ?? []).entries()) statements.push(
    db().prepare(`INSERT OR IGNORE INTO activity
      (id, collection_id, actor_id, type, status, created_at, details_json)
      VALUES (?, ?, ?, 'native-harvest-run', 'completed', ?, ?)`)
      .bind(
        `activity:native:${row.package_hash.slice(7, 23)}:${index}`,
        collectionId,
        context.actorId,
        nativeActivity.createdAt ?? at,
        JSON.stringify(nativeActivity),
      ),
  );
  const activityId = `activity:${crypto.randomUUID()}`;
  const receiptId = `receipt:${crypto.randomUUID()}`;
  statements.push(
    db().prepare('UPDATE collection SET revision = revision + 1 WHERE id = ? AND owner_actor_id = ? AND state = ? AND revision = ?')
      .bind(collectionId, context.actorId, 'active', selected.collection.revision),
    db().prepare(`INSERT INTO activity
      (id, collection_id, actor_id, type, status, created_at, details_json)
      VALUES (?, ?, ?, 'harvest-commit', 'completed', ?, ?)`)
      .bind(activityId, collectionId, context.actorId, at, JSON.stringify({kind: row.intake_kind, sources: operations.sources.length, created, updated})),
    db().prepare(`INSERT INTO receipt
      (id, collection_id, activity_id, operation_id, package_hash, mode, created_at, result_json)
      VALUES (?, ?, ?, ?, ?, 'merge', ?, ?)`)
      .bind(receiptId, collectionId, activityId, operationId, row.package_hash, at, JSON.stringify({kind: row.intake_kind, sources: operations.sources.length, created, updated})),
    db().prepare("UPDATE import_preview SET state = 'committed' WHERE id = ? AND state = 'pending'").bind(previewId),
  );
  await db().batch(statements);
  return {duplicate: false, receiptId, created, updated};
}

export async function listHarvestSources(context: AuthorizedContext, collectionId: string, limit = 100) {
  await selectedCollection(context, collectionId);
  const bounded = Math.max(1, Math.min(100, Math.trunc(limit)));
  const result = await db().prepare(`SELECT source_record.id, source_record.current_version_id, source_record.state, source_record.created_at,
      source_version.title, source_version.url, source_version.source_kind, source_version.body_state,
      source_version.rights_state, source_version.capture_state, source_version.source_updated_at,
      source_version.content_hash, source_version.content_json, source_version.created_at AS version_created_at
    FROM source_record JOIN source_version ON source_version.id = source_record.current_version_id
    WHERE source_record.collection_id = ? ORDER BY source_version.created_at DESC, source_record.id LIMIT ?`)
    .bind(collectionId, bounded).all();
  const sources = result.results as any[];
  if (!sources.length) return [];
  const placeholders = sources.map(() => '?').join(', ');
  const tagRows = await db().prepare(`SELECT source_id, label, status, type, stage, archived_at
    FROM source_tag WHERE source_id IN (${placeholders}) ORDER BY tag_key, status`).bind(...sources.map(({id}) => id)).all();
  const bySource = new Map<string, any[]>();
  for (const item of tagRows.results as any[]) {
    const values = bySource.get(item.source_id) ?? [];
    values.push(item);
    bySource.set(item.source_id, values);
  }
  return sources.map((source) => ({
    ...source,
    content: JSON.parse(source.content_json),
    externalJudgement: JSON.parse(source.content_json).externalJudgement ?? null,
    tags: bySource.get(source.id) ?? [],
  }));
}

export async function createWorkPacket(context: AuthorizedContext, collectionId: string, selectedSourceIds: string[]) {
  await requireLegacyHarvest(collectionId);
  const selected = await selectedCollection(context, collectionId);
  const sources = await listHarvestSources(context, collectionId, 100);
  let packet;
  try {
    packet = await makeWorkPacket({
      collection: {...selected.collection, selectionRevision: selected.selectionRevision},
      actorId: context.actorId,
      sources,
      selectedSourceIds,
      omittedDependencies: sources.filter(({id}: any) => !selectedSourceIds.includes(id)).map(({id}: any) => ({id, reason: 'not selected for this bounded packet'})),
      maxSources: 100,
    });
  } catch (error) {
    throw new AccessError(409, 'review.work_packet.invalid', String((error as Error)?.message ?? error));
  }
  await db().prepare(`INSERT INTO work_packet
    (id, collection_id, actor_id, selection_revision, collection_revision, package_hash, package_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(packet.packageId, collectionId, context.actorId, selected.selectionRevision, selected.collection.revision, packet.packageHash, JSON.stringify(packet), packet.createdAt).run();
  return packet;
}

export async function listWorkPackets(context: AuthorizedContext, collectionId: string, limit = 10) {
  await selectedCollection(context, collectionId);
  const bounded = Math.max(1, Math.min(20, Math.trunc(limit)));
  const result = await db().prepare(`SELECT id, package_hash, package_json, created_at FROM work_packet
    WHERE collection_id = ? AND actor_id = ? ORDER BY created_at DESC, id LIMIT ?`)
    .bind(collectionId, context.actorId, bounded).all();
  return (result.results as any[]).map((row) => ({...row, packet: JSON.parse(row.package_json)}));
}

export async function readWorkPacket(context: AuthorizedContext, collectionId: string, workPacketId: string) {
  await selectedCollection(context, collectionId);
  const row = await db().prepare(`SELECT package_json FROM work_packet
    WHERE id = ? AND collection_id = ? AND actor_id = ?`)
    .bind(workPacketId, collectionId, context.actorId).first<any>();
  if (!row) throw new AccessError(404, 'review.work_packet.not_found', 'Work packet is unavailable');
  return row.package_json as string;
}

export async function importReviewProposal(context: AuthorizedContext, collectionId: string, workPacketId: string, proposal: unknown) {
  await requireLegacyHarvest(collectionId);
  const selected = await selectedCollection(context, collectionId);
  const row = await db().prepare(`SELECT package_json FROM work_packet
    WHERE id = ? AND collection_id = ? AND actor_id = ?`)
    .bind(workPacketId, collectionId, context.actorId).first<any>();
  if (!row) throw new AccessError(404, 'review.work_packet.not_found', 'Work packet is unavailable');
  const packet = JSON.parse(row.package_json);
  const sources = await listHarvestSources(context, collectionId, 100);
  const preview = previewProposal(packet, proposal, {
    collectionId,
    collectionRevision: selected.collection.revision,
    selectionRevision: selected.selectionRevision,
    sources,
  });
  if (!preview.proposalId) throw new AccessError(409, 'review.proposal.id_missing', 'Proposal id is required');
  const id = `proposal-review:${crypto.randomUUID()}`;
  await db().prepare(`INSERT INTO proposal_review
    (id, collection_id, actor_id, work_packet_id, proposal_id, proposal_json, preview_json, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
    .bind(id, collectionId, context.actorId, workPacketId, preview.proposalId, JSON.stringify(proposal), JSON.stringify(preview), now()).run();
  return {id, preview};
}

export async function listReviewPreviews(context: AuthorizedContext, collectionId: string, limit = 10) {
  await selectedCollection(context, collectionId);
  const bounded = Math.max(1, Math.min(20, Math.trunc(limit)));
  const result = await db().prepare(`SELECT id, proposal_id, preview_json, created_at FROM proposal_review
    WHERE collection_id = ? AND actor_id = ? AND state = 'pending' ORDER BY created_at DESC, id LIMIT ?`)
    .bind(collectionId, context.actorId, bounded).all();
  return (result.results as any[]).map((row) => ({...row, preview: JSON.parse(row.preview_json)}));
}

export async function commitReviewProposal(context: AuthorizedContext, collectionId: string, reviewId: string, acceptedOperationIds: string[], rationaleEdits: Record<string, string>) {
  await requireLegacyHarvest(collectionId);
  const selected = await selectedCollection(context, collectionId);
  const row = await db().prepare(`SELECT proposal_review.*, work_packet.package_json
    FROM proposal_review JOIN work_packet ON work_packet.id = proposal_review.work_packet_id
    WHERE proposal_review.id = ? AND proposal_review.collection_id = ? AND proposal_review.actor_id = ? AND proposal_review.state = 'pending'`)
    .bind(reviewId, collectionId, context.actorId).first<any>();
  if (!row) throw new AccessError(404, 'review.proposal.not_found', 'Pending proposal review is unavailable');
  const packet = JSON.parse(row.package_json);
  const proposal = JSON.parse(row.proposal_json);
  const sources = await listHarvestSources(context, collectionId, 100);
  const freshPreview = previewProposal(packet, proposal, {
    collectionId,
    collectionRevision: selected.collection.revision,
    selectionRevision: selected.selectionRevision,
    sources,
  });
  let result;
  try {
    result = await commitProposalState(newReviewState(), freshPreview, {
      actor: {id: context.actorId, kind: 'human'},
      acceptedOperationIds,
      rationaleEdits,
    });
  } catch (error) {
    throw new AccessError(409, 'review.proposal.commit_refused', String((error as Error)?.message ?? error));
  }
  const accepted = new Set(acceptedOperationIds);
  const statements = [];
  for (const operation of freshPreview.operations.filter(({id}: any) => accepted.has(id))) {
    const rationale = String(rationaleEdits[operation.id] ?? operation.payload.rationale ?? '').trim();
    statements.push(db().prepare(`INSERT INTO review_record
      (id, collection_id, source_id, source_version_hash, kind, payload_json, rationale,
       proposed_by_json, process_version, accepted_by_actor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        `review-record:${crypto.randomUUID()}`, collectionId, operation.sourceId ?? null,
        operation.baseVersionHash ?? null, operation.type, JSON.stringify(operation.payload), rationale,
        JSON.stringify(freshPreview.proposer), freshPreview.proposer?.processVersion ?? 'unknown', context.actorId, result.receipt.createdAt,
      ));
    if (operation.type === 'tag') statements.push(db().prepare(`INSERT OR IGNORE INTO source_tag
      (source_id, label, tag_key, status, type, stage, created_at, archived_at)
      VALUES (?, ?, ?, 'accepted', 'llm-review', 'tag', ?, NULL)`)
      .bind(operation.sourceId, operation.payload.tag, String(operation.payload.tag).trim().toLocaleLowerCase('en-US'), result.receipt.createdAt));
  }
  const activityId = `activity:${crypto.randomUUID()}`;
  statements.push(
    db().prepare('UPDATE collection SET revision = revision + 1 WHERE id = ? AND owner_actor_id = ? AND state = ? AND revision = ?')
      .bind(collectionId, context.actorId, 'active', selected.collection.revision),
    db().prepare(`INSERT INTO activity (id, collection_id, actor_id, type, status, created_at, details_json)
      VALUES (?, ?, ?, 'proposal-review', 'completed', ?, ?)`)
      .bind(activityId, collectionId, context.actorId, result.receipt.createdAt, JSON.stringify({proposalId: freshPreview.proposalId, accepted: accepted.size, rejected: freshPreview.operations.length - accepted.size})),
    db().prepare(`INSERT INTO receipt (id, collection_id, activity_id, operation_id, package_hash, mode, created_at, result_json)
      VALUES (?, ?, ?, ?, ?, 'selective-review', ?, ?)`)
      .bind(result.receipt.receiptId, collectionId, activityId, `proposal:${freshPreview.proposalId}`, result.receipt.receiptHash, result.receipt.createdAt, JSON.stringify(result.receipt)),
    db().prepare("UPDATE proposal_review SET state = 'committed' WHERE id = ? AND state = 'pending'").bind(reviewId),
  );
  await db().batch(statements);
  return result.receipt;
}

export async function listReviewRecords(context: AuthorizedContext, collectionId: string, limit = 50) {
  await selectedCollection(context, collectionId);
  const result = await db().prepare(`SELECT * FROM review_record WHERE collection_id = ?
    ORDER BY created_at DESC, id LIMIT ?`).bind(collectionId, Math.max(1, Math.min(100, Math.trunc(limit)))).all();
  return (result.results as any[]).map((row) => ({...row, payload: JSON.parse(row.payload_json), proposedBy: JSON.parse(row.proposed_by_json)}));
}

export async function listReviewReceipts(context: AuthorizedContext, collectionId: string, limit = 20) {
  await selectedCollection(context, collectionId);
  const result = await db().prepare(`SELECT receipt.id, receipt.created_at, receipt.result_json
    FROM receipt JOIN activity ON activity.id = receipt.activity_id
    WHERE receipt.collection_id = ? AND activity.type = 'proposal-review'
    ORDER BY receipt.created_at DESC, receipt.id LIMIT ?`)
    .bind(collectionId, Math.max(1, Math.min(100, Math.trunc(limit)))).all();
  return (result.results as any[]).map((row) => ({...row, receipt: JSON.parse(row.result_json)}));
}

export async function readReviewReceipt(context: AuthorizedContext, collectionId: string, receiptId: string) {
  await selectedCollection(context, collectionId);
  const row = await db().prepare(`SELECT receipt.result_json FROM receipt
    JOIN activity ON activity.id = receipt.activity_id
    JOIN collection ON collection.id = receipt.collection_id
    WHERE receipt.id = ? AND receipt.collection_id = ? AND collection.owner_actor_id = ?
      AND activity.type = 'proposal-review'`)
    .bind(receiptId, collectionId, context.actorId).first<any>();
  if (!row) throw new AccessError(404, 'review.receipt.not_found', 'Review receipt is unavailable');
  return row.result_json as string;
}

export async function tagInventory(context: AuthorizedContext, collectionId: string) {
  await selectedCollection(context, collectionId);
  const [result, total] = await db().batch([
    db().prepare(`SELECT source_tag.label, source_tag.tag_key, source_tag.status,
      source_tag.type, source_tag.stage, COUNT(DISTINCT source_tag.source_id) AS sources,
      SUM(CASE WHEN source_tag.archived_at IS NULL THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN source_tag.archived_at IS NOT NULL THEN 1 ELSE 0 END) AS archived
    FROM source_tag JOIN source_record ON source_record.id = source_tag.source_id
    WHERE source_record.collection_id = ?
    GROUP BY source_tag.label, source_tag.tag_key, source_tag.status, source_tag.type, source_tag.stage
    ORDER BY source_tag.tag_key, source_tag.status`).bind(collectionId),
    db().prepare("SELECT COUNT(*) AS count FROM source_record WHERE collection_id = ? AND state = 'active'").bind(collectionId),
  ]);
  const totalSources = Number((total.results?.[0] as any)?.count ?? 0);
  return (result.results as any[]).map((item) => ({
    ...item,
    percentage: totalSources ? (Number(item.sources) / totalSources) * 100 : 0,
    vocabulary_status: item.status === 'accepted' ? 'recognized' : 'proposed',
  }));
}

export async function harvestCounts(context: AuthorizedContext, collectionId: string) {
  await selectedCollection(context, collectionId);
  const [sources, tags, receipts] = await db().batch([
    db().prepare('SELECT COUNT(*) AS count FROM source_record WHERE collection_id = ?').bind(collectionId),
    db().prepare(`SELECT COUNT(DISTINCT source_tag.tag_key) AS count FROM source_tag
      JOIN source_record ON source_record.id = source_tag.source_id WHERE source_record.collection_id = ?`).bind(collectionId),
    db().prepare(`SELECT COUNT(*) AS count FROM receipt JOIN activity ON activity.id = receipt.activity_id
      WHERE receipt.collection_id = ? AND activity.type = 'harvest-commit'`).bind(collectionId),
  ]);
  return {
    sources: Number((sources.results?.[0] as any)?.count ?? 0),
    tags: Number((tags.results?.[0] as any)?.count ?? 0),
    receipts: Number((receipts.results?.[0] as any)?.count ?? 0),
  };
}

export async function listHarvestReceipts(context: AuthorizedContext, collectionId: string, limit = 20) {
  await selectedCollection(context, collectionId);
  const bounded = Math.max(1, Math.min(100, Math.trunc(limit)));
  const result = await db().prepare(`SELECT receipt.id, receipt.operation_id, receipt.package_hash,
      receipt.created_at, receipt.result_json, activity.details_json
    FROM receipt JOIN activity ON activity.id = receipt.activity_id
    WHERE receipt.collection_id = ? AND activity.type = 'harvest-commit'
    ORDER BY receipt.created_at DESC, receipt.id LIMIT ?`).bind(collectionId, bounded).all();
  return (result.results as any[]).map((row) => ({
    ...row,
    result: JSON.parse(row.result_json),
    activity: JSON.parse(row.details_json),
  }));
}

export async function previewErase(context: AuthorizedContext, collectionId: string) {
  await requireLegacyHarvest(collectionId);
  const selected = await currentSelection(context);
  if (!selected.collection || selected.collection.id !== collectionId) throw new AccessError(409, 'collection.selection.changed', 'Select the collection again before erasing it');
  return erasePreview(selected.collection, await collectionCounts(context, collectionId), selected.selectionRevision);
}

export async function tombstoneAndErase(context: AuthorizedContext, collectionId: string, expectedRevision: number) {
  await requireLegacyHarvest(collectionId);
  const at = now();
  const activityId = `activity:${crypto.randomUUID()}`;
  const result = await db().batch([
    db().prepare(`UPDATE collection SET state = 'tombstoned', tombstoned_at = ?, revision = revision + 1
      WHERE id = ? AND owner_actor_id = ? AND state = 'active' AND revision = ?`)
      .bind(at, collectionId, context.actorId, expectedRevision),
    db().prepare("UPDATE import_preview SET state = 'invalidated' WHERE collection_id = ? AND state = 'pending'").bind(collectionId),
    db().prepare("UPDATE proposal_review SET state = 'invalidated' WHERE collection_id = ? AND state = 'pending'").bind(collectionId),
    db().prepare('DELETE FROM work_packet WHERE collection_id = ?').bind(collectionId),
    db().prepare('DELETE FROM review_record WHERE collection_id = ?').bind(collectionId),
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

async function portableHarvestRecords(collectionId: string) {
  const [sourceRows, versionRows, aliasRows, tagRows, dependencyRows, reviewRows] = await db().batch([
    db().prepare(`SELECT id, canonical_key, current_version_id, state, created_at
      FROM source_record WHERE collection_id = ? ORDER BY id`).bind(collectionId),
    db().prepare(`SELECT source_version.* FROM source_version
      JOIN source_record ON source_record.id = source_version.source_id
      WHERE source_record.collection_id = ? ORDER BY source_version.source_id, source_version.created_at, source_version.id`).bind(collectionId),
    db().prepare(`SELECT source_id, namespace, alias_key, created_at
      FROM external_alias WHERE collection_id = ? ORDER BY source_id, namespace, alias_key`).bind(collectionId),
    db().prepare(`SELECT source_tag.* FROM source_tag
      JOIN source_record ON source_record.id = source_tag.source_id
      WHERE source_record.collection_id = ? ORDER BY source_tag.source_id, source_tag.tag_key, source_tag.status`).bind(collectionId),
    db().prepare(`SELECT id, source_id, relation_type, target_namespace, target_key, state, created_at
      FROM dependency_proposal WHERE collection_id = ? ORDER BY id`).bind(collectionId),
    db().prepare(`SELECT * FROM review_record WHERE collection_id = ? ORDER BY created_at, id`).bind(collectionId),
  ]);
  const versionsBySource = new Map<string, any[]>();
  for (const row of versionRows.results as any[]) {
    const values = versionsBySource.get(row.source_id) ?? [];
    values.push({
      id: row.id,
      contentHash: row.content_hash,
      content: JSON.parse(row.content_json),
      actorId: row.created_by_actor_id,
      createdAt: row.created_at,
    });
    versionsBySource.set(row.source_id, values);
  }
  const aliasesBySource = new Map<string, any[]>();
  for (const row of aliasRows.results as any[]) {
    const values = aliasesBySource.get(row.source_id) ?? [];
    values.push({namespace: row.namespace, key: row.alias_key, createdAt: row.created_at});
    aliasesBySource.set(row.source_id, values);
  }
  const tagsBySource = new Map<string, any[]>();
  for (const row of tagRows.results as any[]) {
    const values = tagsBySource.get(row.source_id) ?? [];
    values.push({
      label: row.label,
      key: row.tag_key,
      status: row.status,
      type: row.type,
      stage: row.stage,
      createdAt: row.created_at,
      archivedAt: row.archived_at,
    });
    tagsBySource.set(row.source_id, values);
  }
  return {
    sourceRecords: (sourceRows.results as any[]).map((row) => ({
      id: row.id,
      canonicalKey: row.canonical_key,
      currentVersionId: row.current_version_id,
      state: row.state,
      createdAt: row.created_at,
      aliases: aliasesBySource.get(row.id) ?? [],
      versions: versionsBySource.get(row.id) ?? [],
      tags: tagsBySource.get(row.id) ?? [],
    })),
    dependencyProposals: (dependencyRows.results as any[]).map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      type: row.relation_type,
      targetNamespace: row.target_namespace,
      targetKey: row.target_key,
      state: row.state,
      createdAt: row.created_at,
    })),
    reviewRecords: (reviewRows.results as any[]).map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceVersionHash: row.source_version_hash,
      kind: row.kind,
      payload: JSON.parse(row.payload_json),
      rationale: row.rationale,
      proposedBy: JSON.parse(row.proposed_by_json),
      processVersion: row.process_version,
      acceptedByActorId: row.accepted_by_actor_id,
      createdAt: row.created_at,
    })),
  };
}

export async function createCurrentBackup(context: AuthorizedContext, collectionId: string) {
  await requireLegacyHarvest(collectionId);
  const audit = await collectionAudit(context, collectionId);
  if (audit.collection.state !== 'active') throw new AccessError(409, 'collection.not_active', 'Only an active collection can be backed up');
  const createdAt = now();
  const harvest = await portableHarvestRecords(collectionId);
  const pkg = await makeCollectionBackup({
    collection: audit.collection,
    actor: {id: context.actorId},
    activities: audit.activities.map(portableActivity),
    receipts: audit.receipts.map(portableReceipt),
    ...harvest,
    createdAt,
  } as any);
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

export async function restoreCollectionBackup(context: AuthorizedContext, collectionId: string, backupId: string) {
  await requireLegacyHarvest(collectionId);
  const bytes = await readBackupBytes(context, collectionId, backupId);
  const files = unzipSync(bytes);
  if (!files['manifest.json']) throw new AccessError(409, 'backup.manifest_missing', 'Backup manifest is missing');
  const pkg = JSON.parse(strFromU8(files['manifest.json']));
  const errors = validateCollectionBackup(pkg, collectionId);
  if (errors.length) throw new AccessError(409, errors[0], 'Backup cannot restore into this collection');
  for (const version of pkg.records.entityVersions) {
    if (await sha256(canonicalJson(version.content)) !== version.contentHash) {
      throw new AccessError(409, 'backup.source_version.hash_mismatch', 'A source version checksum does not match');
    }
  }
  for (const entity of pkg.records.entities) {
    for (const alias of entity.aliases ?? []) {
      const existingAlias = await db().prepare(`SELECT source_id FROM external_alias
        WHERE collection_id = ? AND namespace = ? AND alias_key = ?`)
        .bind(collectionId, alias.namespace, alias.key).first<any>();
      if (existingAlias && existingAlias.source_id !== entity.id) {
        throw new AccessError(409, 'backup.alias.conflict', 'A source alias already belongs to another source');
      }
    }
  }
  const operationId = `operation:restore:${backupId}`;
  const existing = await db().prepare('SELECT id FROM receipt WHERE collection_id = ? AND operation_id = ?')
    .bind(collectionId, operationId).first();
  if (existing) return {duplicate: true, packageId: pkg.packageId};
  const at = now();
  const activityId = `activity:${crypto.randomUUID()}`;
  const receiptId = `receipt:${crypto.randomUUID()}`;
  const statements = [];
  for (const entity of pkg.records.entities) {
    statements.push(db().prepare(`INSERT OR IGNORE INTO source_record
      (id, collection_id, canonical_key, current_version_id, state, created_at)
      VALUES (?, ?, ?, NULL, ?, ?)`).bind(entity.id, collectionId, entity.canonicalKey, entity.state, entity.createdAt));
    for (const alias of entity.aliases ?? []) statements.push(db().prepare(`INSERT OR IGNORE INTO external_alias
      (collection_id, source_id, namespace, alias_key, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(collectionId, entity.id, alias.namespace, alias.key, alias.createdAt ?? entity.createdAt));
  }
  for (const version of pkg.records.entityVersions) {
    const content = version.content;
    statements.push(db().prepare(`INSERT OR IGNORE INTO source_version
      (id, source_id, content_hash, title, url, source_kind, body_state, rights_state,
       capture_state, source_updated_at, content_json, created_by_actor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        version.id, version.entityId, version.contentHash, content.title, content.url, content.sourceKind,
        content.bodyState, content.rightsState, content.captureState, content.sourceUpdatedAt,
        JSON.stringify(content), version.actorId, version.createdAt,
      ));
  }
  for (const entity of pkg.records.entities) statements.push(db().prepare(`UPDATE source_record
    SET current_version_id = ?, state = ? WHERE id = ? AND collection_id = ?`)
    .bind(entity.currentVersionId, entity.state, entity.id, collectionId));
  for (const item of pkg.extensions['siteprep:sourceTags']) statements.push(db().prepare(`INSERT OR IGNORE INTO source_tag
    (source_id, label, tag_key, status, type, stage, created_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(item.sourceId, item.label, item.key, item.status, item.type, item.stage, item.createdAt, item.archivedAt));
  for (const relationship of pkg.records.relationships) statements.push(db().prepare(`INSERT OR IGNORE INTO dependency_proposal
    (id, collection_id, source_id, relation_type, target_namespace, target_key, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(relationship.id, collectionId, relationship.fromEntityId, relationship.type, relationship.targetNamespace, relationship.targetKey, relationship.state, relationship.createdAt));
  for (const record of pkg.extensions['siteprep:reviews'] ?? []) statements.push(db().prepare(`INSERT OR IGNORE INTO review_record
    (id, collection_id, source_id, source_version_hash, kind, payload_json, rationale,
     proposed_by_json, process_version, accepted_by_actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(record.id, collectionId, record.sourceId, record.sourceVersionHash, record.kind, JSON.stringify(record.payload), record.rationale, JSON.stringify(record.proposedBy), record.processVersion, record.acceptedByActorId, record.createdAt));
  statements.push(
    db().prepare("UPDATE collection SET revision = revision + 1 WHERE id = ? AND owner_actor_id = ? AND state = 'active'")
      .bind(collectionId, context.actorId),
    db().prepare(`INSERT INTO activity
      (id, collection_id, actor_id, type, status, created_at, details_json)
      VALUES (?, ?, ?, 'collection-restore', 'completed', ?, ?)`)
      .bind(activityId, collectionId, context.actorId, at, JSON.stringify({backupId, packageId: pkg.packageId, sources: pkg.records.entities.length})),
    db().prepare(`INSERT INTO receipt
      (id, collection_id, activity_id, operation_id, package_hash, mode, created_at, result_json)
      VALUES (?, ?, ?, ?, ?, 'restore', ?, ?)`)
      .bind(receiptId, collectionId, activityId, operationId, await sha256(bytes), at, JSON.stringify({backupId, sources: pkg.records.entities.length})),
  );
  await db().batch(statements);
  return {duplicate: false, packageId: pkg.packageId, sources: pkg.records.entities.length};
}

export const restoreEmptyBackup = restoreCollectionBackup;

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
