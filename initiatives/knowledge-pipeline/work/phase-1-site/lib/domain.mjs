const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;

export function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(typeof value === 'string' ? value.normalize('NFC') : value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON requires finite numbers');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key.normalize('NFC'))}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('Value is not portable JSON');
}

export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().normalize('NFC').toLocaleLowerCase('en-US');
}

export function normalizeCollectionName(value) {
  const name = String(value ?? '').trim().normalize('NFC');
  if (!name || name.length > 80 || CONTROL.test(name) || /^[\\/]+$/u.test(name)) {
    return {ok: false, code: 'collection.name.invalid', name, normalized: ''};
  }
  return {ok: true, code: null, name, normalized: name.toLocaleLowerCase('en-US')};
}

export function authorizationDecision(identity, allowlistRecord) {
  if (!identity?.userId || !identity?.email) return {status: 401, code: 'identity.required'};
  if (!allowlistRecord || allowlistRecord.disabledAt) return {status: 403, code: 'identity.not_authorized'};
  if (allowlistRecord.siteUserId && allowlistRecord.siteUserId !== identity.userId) {
    return {status: 403, code: 'identity.link_conflict'};
  }
  return {status: 200, code: allowlistRecord.siteUserId ? 'identity.authorized' : 'identity.link_required'};
}

export function selectionToken(actorId, collectionId, selectionRevision, collectionRevision) {
  return [actorId, collectionId, selectionRevision, collectionRevision].map((value) => encodeURIComponent(String(value))).join('.');
}

export function erasePreview(collection, counts, selectionRevision) {
  const token = selectionToken(collection.ownerActorId, collection.id, selectionRevision, collection.revision);
  return {
    collectionId: collection.id,
    collectionName: collection.name,
    token,
    counts: {
      entities: counts.entities ?? 0,
      assets: counts.assets ?? 0,
      schedules: counts.schedules ?? 0,
      backups: counts.backups ?? 0,
    },
  };
}

export function confirmErase(preview, submitted) {
  if (submitted.token !== preview.token) return {ok: false, code: 'erase.preview.stale'};
  if (String(submitted.collectionName ?? '').normalize('NFC') !== preview.collectionName) {
    return {ok: false, code: 'erase.name.mismatch'};
  }
  return {ok: true, code: null};
}

export async function makeEmptyBackup({collection, actor, activities, receipts, createdAt}) {
  const logical = {
    format: 'knowledge-pipeline/v1',
    createdAt,
    scope: {knowledgeSpaceId: `space:${actor.id}`, collectionId: collection.id},
    records: {
      entities: [],
      entityVersions: [],
      relationships: [],
      activities,
      receipts,
    },
    assets: [],
    extensions: {
      'siteprep:collection': {
        id: collection.id,
        name: collection.name,
        ownerActorId: actor.id,
        state: collection.state,
        revision: collection.revision,
      },
      'siteprep:configuration': {schemaVersion: 1, stage: 'harvest', blobBinding: 'private'},
    },
  };
  const identity = await sha256(canonicalJson(logical));
  return {packageId: `package:${identity.slice(7, 39)}`, ...logical};
}

export function validateEmptyBackup(pkg, expectedCollectionId) {
  const errors = [];
  if (pkg?.format !== 'knowledge-pipeline/v1') errors.push('package.version.unsupported');
  if (pkg?.scope?.collectionId !== expectedCollectionId) errors.push('package.scope.mismatch');
  for (const group of ['entities', 'entityVersions', 'relationships', 'activities', 'receipts']) {
    if (!Array.isArray(pkg?.records?.[group])) errors.push(`package.records.${group}.invalid`);
  }
  if ((pkg?.records?.entities?.length ?? 0) > 0 || (pkg?.assets?.length ?? 0) > 0) errors.push('package.not_empty');
  return errors;
}

export function privateBlobKey(actorId, collectionId, kind, id) {
  const safe = /^[a-z0-9][a-z0-9._:-]*$/u;
  for (const value of [actorId, collectionId, kind, id]) {
    if (!safe.test(value)) throw new TypeError('Blob key component is unsafe');
  }
  return `private/${actorId}/${collectionId}/${kind}/${id}`;
}
