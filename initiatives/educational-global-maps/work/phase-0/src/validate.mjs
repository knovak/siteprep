import {contentIdentity, deepClone, sha256} from './canonical.mjs';
import {finding} from './findings.mjs';

const SCHEMAS = Object.freeze({
  'educational-global-maps/dataset-descriptor/v1': {
    required: ['title', 'provider', 'sourceUrl', 'rights', 'measure', 'space', 'time', 'access', 'version', 'capabilities'],
  },
  'educational-global-maps/prepared-revision/v1': {
    required: ['descriptorRef', 'upstreamVersion', 'preparedAt', 'preparation', 'geographyRef', 'artifactRefs', 'measure', 'time', 'rights'],
    refs: ['descriptorRef', 'geographyRef'],
    assetRefs: ['artifactRefs'],
  },
  'educational-global-maps/geography-set/v1': {
    required: ['title', 'version', 'places', 'geometryAssetRef', 'rights'],
    assetRefs: ['geometryAssetRef'],
  },
  'educational-global-maps/crosswalk/v1': {
    required: ['fromGeographyRef', 'toGeographyRef', 'method', 'reviewStatus', 'matches'],
    refs: ['fromGeographyRef', 'toGeographyRef'],
  },
  'educational-global-maps/layer/v1': {
    required: ['profile', 'preparedRevisionRef', 'geographyRef', 'artifactRef', 'encoding', 'statusSemantics', 'projections'],
    refs: ['preparedRevisionRef', 'geographyRef'],
    assetRefs: ['artifactRef'],
  },
  'educational-global-maps/scene/v1': {
    required: ['title', 'period', 'projection', 'camera', 'layers', 'citations', 'intentRevision'],
    refs: ['layers'],
  },
  'educational-global-maps/session-snapshot/v1': {
    required: ['sessionId', 'sceneRef', 'acceptedRevision', 'state'],
    refs: ['sceneRef'],
  },
  'educational-global-maps/intent/v1': {
    required: ['intentId', 'sessionId', 'baseRevision', 'type', 'payload'],
  },
  'educational-global-maps/spherical-report/v1': {
    required: ['sceneRef', 'status', 'findings'],
    refs: ['sceneRef'],
  },
});

const ENVELOPE_FIELDS = new Set(['schema', 'id', 'content']);
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const PROFILES = new Set(['place-time-series', 'origin-destination-flow', 'points-events', 'raster-frame']);
const PROJECTIONS = new Set(['equal-earth', 'airocean', 'population-cartogram']);

function valuesAt(content, fields) {
  return fields.flatMap((field) => {
    const value = content[field];
    return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  });
}

export function objectIdentity(object) {
  return contentIdentity({schema: object.schema, id: object.id, content: object.content});
}

export function validateObject(object, path = '$') {
  const findings = [];
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    return [finding('object.type', path, 'Canonical object must be an object')];
  }
  for (const key of Object.keys(object)) {
    if (!ENVELOPE_FIELDS.has(key)) findings.push(finding('object.field.unknown', `${path}.${key}`, `Unknown envelope field ${key}`));
  }
  for (const key of ENVELOPE_FIELDS) {
    if (!(key in object)) findings.push(finding('object.field.required', `${path}.${key}`, `Required field ${key} is absent`));
  }
  if (typeof object.id !== 'string' || !/^[a-z-]+:[a-z0-9][a-z0-9._:-]*$/u.test(object.id)) {
    findings.push(finding('object.id.invalid', `${path}.id`, 'Object id must be a stable namespaced id'));
  }
  if (typeof object.schema !== 'string') {
    findings.push(finding('schema.required', `${path}.schema`, 'Object schema is required'));
    return findings;
  }
  if (/\/v(?:[2-9]|\d{2,})$/u.test(object.schema)) {
    findings.push(finding('schema.future', `${path}.schema`, `Unsupported future schema ${object.schema}`));
    return findings;
  }
  const contract = SCHEMAS[object.schema];
  if (!contract) {
    findings.push(finding('schema.unsupported', `${path}.schema`, `Unsupported schema ${object.schema}`));
    return findings;
  }
  if (!object.content || typeof object.content !== 'object' || Array.isArray(object.content)) {
    findings.push(finding('object.content.type', `${path}.content`, 'Object content must be an object'));
    return findings;
  }
  const allowed = new Set(contract.required);
  for (const key of Object.keys(object.content)) {
    if (!allowed.has(key)) findings.push(finding('object.content.unknown', `${path}.content.${key}`, `Unknown ${object.schema} field ${key}`));
  }
  for (const key of contract.required) {
    if (!(key in object.content)) findings.push(finding('object.content.required', `${path}.content.${key}`, `Required field ${key} is absent`));
  }
  if (object.content.preparedAt !== undefined && !TIMESTAMP.test(object.content.preparedAt)) {
    findings.push(finding('time.timestamp.noncanonical', `${path}.content.preparedAt`, 'Timestamp must use UTC millisecond precision'));
  }
  if (object.schema.endsWith('/layer/v1')) {
    if (!PROFILES.has(object.content.profile)) findings.push(finding('layer.profile.unsupported', `${path}.content.profile`, 'Unsupported data profile'));
    for (const projection of object.content.projections ?? []) {
      if (!PROJECTIONS.has(projection)) findings.push(finding('layer.projection.unsupported', `${path}.content.projections`, `Unknown projection ${projection}`));
    }
  }
  if (object.schema.endsWith('/scene/v1')) {
    if (!PROJECTIONS.has(object.content.projection)) findings.push(finding('scene.projection.unsupported', `${path}.content.projection`, 'Unsupported projection'));
    if (!Number.isSafeInteger(object.content.intentRevision) || object.content.intentRevision < 0) {
      findings.push(finding('scene.revision.invalid', `${path}.content.intentRevision`, 'Intent revision must be a non-negative safe integer'));
    }
  }
  return findings;
}

export function validateInventory(inventory) {
  const findings = [];
  if (!inventory || !Array.isArray(inventory.objects) || !Array.isArray(inventory.assets)) {
    return [finding('inventory.shape', '$', 'Inventory requires object and asset arrays')];
  }
  const objectIds = new Map();
  inventory.objects.forEach((object, index) => {
    findings.push(...validateObject(object, `$.objects[${index}]`));
    if (objectIds.has(object.id)) findings.push(finding('inventory.object.duplicate', `$.objects[${index}].id`, `Duplicate object id ${object.id}`));
    objectIds.set(object.id, object);
  });
  const assetIds = new Map();
  inventory.assets.forEach((asset, index) => {
    const path = `$.assets[${index}]`;
    if (!asset || typeof asset !== 'object') { findings.push(finding('asset.type', path, 'Asset must be an object')); return; }
    for (const required of ['id', 'path', 'mediaType', 'size', 'hash', 'redistributable', 'rights']) {
      if (!(required in asset)) findings.push(finding('asset.field.required', `${path}.${required}`, `Required asset field ${required} is absent`));
    }
    if (assetIds.has(asset.id)) findings.push(finding('asset.id.duplicate', `${path}.id`, `Duplicate asset id ${asset.id}`));
    assetIds.set(asset.id, asset);
    if (asset.bytes !== undefined) {
      const bytes = Buffer.from(asset.bytes, 'base64');
      if (bytes.byteLength !== asset.size || sha256(bytes) !== asset.hash) findings.push(finding('asset.checksum.mismatch', path, `Asset ${asset.id} bytes do not match size and checksum`));
      if (asset.redistributable === false) findings.push(finding('asset.rights.restricted_bytes', path, `Restricted asset ${asset.id} may not carry bytes`));
    }
  });
  inventory.objects.forEach((object, index) => {
    const contract = SCHEMAS[object.schema];
    if (!contract || !object.content) return;
    for (const reference of valuesAt(object.content, contract.refs ?? [])) {
      if (!objectIds.has(reference)) findings.push(finding('reference.object.missing', `$.objects[${index}]`, `Exact object reference ${reference} is absent`));
    }
    for (const reference of valuesAt(object.content, contract.assetRefs ?? [])) {
      if (!assetIds.has(reference)) findings.push(finding('reference.asset.missing', `$.objects[${index}]`, `Exact asset reference ${reference} is absent`));
    }
  });
  return findings;
}

export function trustedInventory(inventory) {
  return deepClone({
    objects: [...inventory.objects].sort((a, b) => a.id.localeCompare(b.id)),
    assets: [...inventory.assets].sort((a, b) => a.id.localeCompare(b.id)),
  });
}
