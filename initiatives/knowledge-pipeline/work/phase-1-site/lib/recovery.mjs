import { canonicalJson, sha256 } from './domain.mjs';

export const RETRY_DELAYS_MS = Object.freeze([60_000, 300_000, 1_200_000]);
export const RETENTION_POLICY = Object.freeze({ daily: 14, monthly: 6 });

const AUTH_FIELD = /authorization|cookie|credential|password|secret|token/iu;
const AUTH_VALUE =
  /(?:authorization:\s*|bearer\s+[a-z0-9]|(?:api[_-]?key|password|secret|token)=)[^\s&]+/iu;
const ID_FIELD = /(?:^id$|Id$)/u;
const IDS_FIELD = /Ids$/u;

function withoutPackageId(pkg) {
  const { packageId: _packageId, ...logical } = pkg;
  return logical;
}

export async function packageIdentity(pkg) {
  return sha256(canonicalJson(withoutPackageId(pkg)));
}

export function assertCredentialFree(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertCredentialFree(item, `${path}[${index}]`),
    );
    return;
  }
  if (typeof value === 'string' && AUTH_VALUE.test(value))
    throw new TypeError(`Authentication material is forbidden at ${path}`);
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (AUTH_FIELD.test(key))
      throw new TypeError(
        `Authentication material is forbidden at ${path}.${key}`,
      );
    assertCredentialFree(item, `${path}.${key}`);
  }
}

export function scheduleOperationId(scheduleId, dueAt) {
  if (!/^schedule:[a-z0-9._:-]+$/u.test(scheduleId))
    throw new TypeError('Schedule id is invalid');
  const timestamp = new Date(dueAt).toISOString();
  return `operation:scheduled-export:${scheduleId.slice(9)}:${timestamp}`;
}

export function hostedScheduleStatus(permissionGranted) {
  return permissionGranted
    ? { active: true, code: 'schedule.hosted.active' }
    : { active: false, code: 'schedule.hosted.permission_required' };
}

export async function runExportCaller({
  caller,
  context,
  requestedScope,
  schedule,
  dueAt,
  operationId,
  exportsByOperation,
  exportScope,
  storeAccepted,
}) {
  if (!['web', 'admin', 'schedule'].includes(caller))
    throw new TypeError('Unknown export caller');
  if (!context?.actorId) throw new Error('identity.required');
  if (caller !== 'web' && context.role !== 'admin')
    throw new Error('admin.required');

  let scope = requestedScope;
  let resolvedOperationId = operationId;
  if (caller === 'schedule') {
    if (!schedule?.active) throw new Error('schedule.inactive');
    scope = schedule.scope;
    resolvedOperationId = scheduleOperationId(schedule.id, dueAt);
  }
  assertCredentialFree({ scope, schedule, operationId: resolvedOperationId });
  if (!scope?.knowledgeSpaceId) throw new Error('export.scope.invalid');

  const duplicate = exportsByOperation.get(resolvedOperationId);
  if (duplicate) return { ...duplicate, duplicate: true };

  const pkg = await exportScope(scope);
  const contentHash = await packageIdentity(pkg);
  const receipt = {
    operationId: resolvedOperationId,
    packageId: pkg.packageId,
    packageHash: contentHash,
    scope,
    status: 'completed',
  };
  assertCredentialFree({ pkg, receipt });
  const accepted = await storeAccepted({ pkg, receipt, caller });
  const result = { pkg, receipt, accepted, duplicate: false };
  exportsByOperation.set(resolvedOperationId, result);
  return result;
}

export async function runDueScheduleTrigger({
  context,
  schedules,
  now,
  ...dependencies
}) {
  if (context?.role !== 'admin') throw new Error('admin.required');
  const due = schedules
    .filter((schedule) => schedule.active && schedule.nextRunAt <= now)
    .sort(
      (left, right) =>
        left.nextRunAt.localeCompare(right.nextRunAt) ||
        left.id.localeCompare(right.id),
    );
  const results = [];
  for (const schedule of due) {
    results.push(
      await runExportCaller({
        ...dependencies,
        caller: 'schedule',
        context,
        schedule,
        dueAt: schedule.nextRunAt,
      }),
    );
  }
  return results;
}

export async function runWithRecoveryRetries({
  attempt,
  wait = async () => {},
  previousSuccess = null,
  notify,
}) {
  const attempts = [];
  for (let index = 0; index <= RETRY_DELAYS_MS.length; index += 1) {
    if (index > 0) await wait(RETRY_DELAYS_MS[index - 1]);
    try {
      const success = await attempt(index + 1);
      attempts.push({ number: index + 1, status: 'completed' });
      return {
        status: 'completed',
        attempts,
        currentSuccess: success,
        previousSuccess,
      };
    } catch (error) {
      attempts.push({
        number: index + 1,
        status: 'failed',
        code: String(error?.code ?? error?.message ?? error),
      });
    }
  }
  await notify({
    code: 'scheduled-export.final-failure',
    attempts: attempts.length,
  });
  return {
    status: 'failed',
    attempts,
    currentSuccess: previousSuccess,
    previousSuccess,
  };
}

export function selectRetainedSuccesses(artifacts, policy = RETENTION_POLICY) {
  const successes = artifacts
    .filter((item) => item.state === 'accepted')
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  const daily = new Map();
  const monthly = new Map();
  for (const artifact of successes) {
    const day = artifact.createdAt.slice(0, 10);
    const month = artifact.createdAt.slice(0, 7);
    if (!daily.has(day) && daily.size < policy.daily) daily.set(day, artifact);
    if (!monthly.has(month) && monthly.size < policy.monthly)
      monthly.set(month, artifact);
  }
  return [
    ...new Map(
      [...daily.values(), ...monthly.values()].map((item) => [item.id, item]),
    ).values(),
  ].sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  );
}

export async function makeKnowledgeSpaceBackup({
  knowledgeSpaceId,
  collectionPackages,
  createdAt,
}) {
  const collections = [...collectionPackages].sort((left, right) =>
    left.scope.collectionId.localeCompare(right.scope.collectionId),
  );
  const logical = {
    format: 'knowledge-pipeline-space/v1',
    createdAt,
    scope: { knowledgeSpaceId },
    collections,
  };
  const identity = await sha256(canonicalJson(logical));
  return { packageId: `package:${identity.slice(7, 39)}`, ...logical };
}

async function remappedId(targetSpaceId, originalId) {
  const digest = await sha256(`${targetSpaceId}\u0000${originalId}`);
  return `${String(originalId).split(':', 1)[0]}:${digest.slice(7, 31)}`;
}

async function remapObject(value, idMap, field = '') {
  if (Array.isArray(value))
    return Promise.all(value.map((item) => remapObject(item, idMap, field)));
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && ID_FIELD.test(field) && idMap.has(value))
      return idMap.get(value);
    return value;
  }
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item) && IDS_FIELD.test(key)) {
      output[key] = item.map((id) => idMap.get(id) ?? id);
    } else {
      output[key] = await remapObject(item, idMap, key);
    }
  }
  return output;
}

export async function copyCollectionSubset(
  pkg,
  { targetSpaceId, targetCollectionId, targetActorId, entityIds },
) {
  if (!targetActorId) throw new Error('copy.target_actor.required');
  const selected = new Set(entityIds);
  const entities = pkg.records.entities.filter((entity) =>
    selected.has(entity.id),
  );
  if (entities.length !== selected.size)
    throw new Error('copy.entity.not_found');
  const versions = pkg.records.entityVersions.filter((version) =>
    selected.has(version.entityId),
  );
  const versionIds = new Set(versions.map((version) => version.id));
  const idMap = new Map();
  for (const originalId of [
    pkg.scope.collectionId,
    ...entities.map((item) => item.id),
    ...versionIds,
  ]) {
    idMap.set(originalId, await remappedId(targetSpaceId, originalId));
  }
  idMap.set(pkg.scope.collectionId, targetCollectionId);

  const warnings = [];
  const relationships = [];
  for (const relationship of pkg.records.relationships) {
    const endpointIds = [
      relationship.fromEntityId,
      relationship.toEntityId,
    ].filter(Boolean);
    if (!endpointIds.some((id) => selected.has(id))) continue;
    if (endpointIds.some((id) => !selected.has(id))) {
      warnings.push({
        code: 'copy.dependency.omitted',
        relationshipId: relationship.id,
      });
      continue;
    }
    idMap.set(
      relationship.id,
      await remappedId(targetSpaceId, relationship.id),
    );
    relationships.push(relationship);
  }
  const sourceOrigin = {
    sourceKnowledgeSpaceId: pkg.scope.knowledgeSpaceId,
    sourceCollectionId: pkg.scope.collectionId,
    aliases: [...idMap.entries()].map(([sourceId, copiedId]) => ({
      sourceId,
      copiedId,
    })),
  };
  const copied = await remapObject(
    {
      ...pkg,
      scope: {
        knowledgeSpaceId: targetSpaceId,
        collectionId: targetCollectionId,
      },
      records: {
        ...pkg.records,
        entities,
        entityVersions: versions,
        relationships,
        activities: [],
        receipts: [],
      },
      assets: pkg.assets.filter(
        (asset) => !asset.entityId || selected.has(asset.entityId),
      ),
      extensions: {
        ...pkg.extensions,
        'siteprep:collection': {
          ...pkg.extensions?.['siteprep:collection'],
          id: targetCollectionId,
          ownerActorId: targetActorId,
        },
        'siteprep:sourceTags': (
          pkg.extensions?.['siteprep:sourceTags'] ?? []
        ).filter((tag) => selected.has(tag.sourceId)),
        'siteprep:reviews': (pkg.extensions?.['siteprep:reviews'] ?? []).filter(
          (record) => !record.sourceId || selected.has(record.sourceId),
        ),
      },
    },
    idMap,
  );
  copied.extensions['siteprep:copyOrigin'] = sourceOrigin;
  const identity = await packageIdentity(copied);
  copied.packageId = `package:${identity.slice(7, 39)}`;
  return { pkg: copied, warnings, idMap };
}

export async function verifyRecoveryPackage(pkg, expectedHash) {
  if (
    !['knowledge-pipeline/v1', 'knowledge-pipeline-space/v1'].includes(
      pkg?.format,
    )
  )
    throw new Error('package.version.unsupported');
  if (expectedHash && (await packageIdentity(pkg)) !== expectedHash)
    throw new Error('package.hash_mismatch');
  const collections =
    pkg.format === 'knowledge-pipeline-space/v1' ? pkg.collections : [pkg];
  for (const candidate of [pkg, ...collections]) {
    const identity = await packageIdentity(candidate);
    if (candidate.packageId !== `package:${identity.slice(7, 39)}`)
      throw new Error('package.identity_mismatch');
  }
  const verifiedVersions = new Set();
  for (const collection of collections) {
    for (const version of collection.records?.entityVersions ?? []) {
      const verificationKey = `${version.contentHash}\u0000${canonicalJson(version.content)}`;
      if (verifiedVersions.has(verificationKey)) continue;
      if (
        (await sha256(canonicalJson(version.content))) !== version.contentHash
      )
        throw new Error('package.version.hash_mismatch');
      verifiedVersions.add(verificationKey);
    }
    for (const asset of collection.assets ?? []) {
      if (!asset.contentHash || (!('content' in asset) && !('bytes' in asset)))
        continue;
      const material =
        'bytes' in asset ? asset.bytes : canonicalJson(asset.content);
      if ((await sha256(material)) !== asset.contentHash)
        throw new Error('package.asset.hash_mismatch');
    }
  }
  return true;
}

export async function restoreAtomically({
  pkg,
  expectedHash,
  createStage,
  commitStage,
  abortStage,
}) {
  await verifyRecoveryPackage(pkg, expectedHash);
  const stage = await createStage();
  try {
    const collections =
      pkg.format === 'knowledge-pipeline-space/v1' ? pkg.collections : [pkg];
    for (const collection of collections)
      await stage.writeCollection(collection);
    const summary = await commitStage(stage);
    return { status: 'completed', summary };
  } catch (error) {
    await abortStage(stage);
    throw error;
  }
}

export async function migrateRecoveryPackage(pkg) {
  if (pkg.format === 'knowledge-pipeline/v1') return structuredClone(pkg);
  if (pkg.format !== 'knowledge-pipeline/v0')
    throw new Error('package.version.unsupported');
  const migrated = structuredClone(pkg);
  migrated.format = 'knowledge-pipeline/v1';
  migrated.assets ??= [];
  migrated.records.relationships ??= [];
  migrated.records.activities ??= [];
  migrated.records.receipts ??= [];
  migrated.extensions ??= {};
  migrated.extensions['siteprep:sourceTags'] ??= [];
  const identity = await packageIdentity(migrated);
  migrated.packageId = `package:${identity.slice(7, 39)}`;
  return migrated;
}

export function eraseCollectionBatch(
  state,
  { batchSize = 1_000, backupChoice = 'retain' } = {},
) {
  if (!state.erasure) {
    state.collection.state = 'tombstoned';
    state.schedules.forEach((schedule) => {
      schedule.active = false;
    });
    const targets = [
      'relationships',
      'versions',
      'entities',
      'assetRefs',
    ].flatMap((group) =>
      state[group]
        .filter((item) => item.collectionId === state.collection.id)
        .map((item) => ({ group, id: item.id })),
    );
    state.erasure = { cursor: 0, targets, backupChoice };
  }
  const page = state.erasure.targets.slice(
    state.erasure.cursor,
    state.erasure.cursor + batchSize,
  );
  for (const target of page)
    state[target.group] = state[target.group].filter(
      (item) => item.id !== target.id,
    );
  state.erasure.cursor += page.length;
  if (state.erasure.cursor < state.erasure.targets.length)
    return { done: false, cursor: state.erasure.cursor };

  if (state.erasure.backupChoice === 'delete')
    state.backups = state.backups.filter(
      (item) => item.collectionId !== state.collection.id,
    );
  const referencedAssets = new Set(state.assetRefs.map((item) => item.assetId));
  state.assets = state.assets.filter((asset) => referencedAssets.has(asset.id));
  state.receipts = state.receipts.filter(
    (item) => item.collectionId !== state.collection.id,
  );
  state.receipts.push({
    id: `receipt:erase:${state.collection.id}`,
    collectionId: state.collection.id,
    type: 'collection-erased',
  });
  state.collection.state = 'erased';
  return { done: true, cursor: state.erasure.cursor };
}

export function pageRows(rows, { after = null, limit = 100 } = {}) {
  const bounded = Math.max(1, Math.min(1_000, Math.trunc(limit)));
  const start =
    after === null
      ? 0
      : Math.max(0, rows.findIndex((row) => row.id === after) + 1);
  const page = rows.slice(start, start + bounded);
  return { rows: page, next: page.length === bounded ? page.at(-1).id : null };
}
