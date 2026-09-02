import {canonicalJson, contentIdentity, sha256} from './canonical.mjs';
import {finding} from './findings.mjs';
import {PACKAGE_LIMITS} from './limits.mjs';

const TOP_LEVEL = new Set([
  'format',
  'packageId',
  'createdAt',
  'scope',
  'records',
  'assets',
  'extensions',
]);
const RECORD_GROUPS = ['entities', 'entityVersions', 'relationships', 'activities', 'receipts'];
const ENTITY_STATES = new Set(['proposed', 'accepted', 'withdrawn', 'archived', 'disputed']);
const RELATIONSHIP_STATES = new Set(['proposed', 'accepted', 'disputed', 'rejected', 'retracted']);

function presentString(value) {
  return typeof value === 'string' && value.length > 0;
}

function validDate(value) {
  return presentString(value) && Number.isFinite(Date.parse(value));
}

function duplicateIds(records, group, findings) {
  const ids = new Set();
  for (const [index, record] of records.entries()) {
    if (!presentString(record?.id)) {
      findings.push(finding('record.id.required', `$.records.${group}[${index}].id`, 'A stable id is required'));
      continue;
    }
    if (ids.has(record.id)) {
      findings.push(finding('record.id.duplicate', `$.records.${group}[${index}].id`, `Duplicate ${group} id ${record.id}`));
    }
    ids.add(record.id);
  }
  return ids;
}

function validateExtensions(extensions, path, findings) {
  if (extensions === undefined) return;
  if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) {
    findings.push(finding('extension.object.required', path, 'Extensions must be an object'));
    return;
  }
  for (const key of Object.keys(extensions)) {
    if (!key.includes(':')) {
      findings.push(finding('extension.namespace.required', `${path}.${key}`, 'Extension keys must be namespaced'));
    }
  }
}

export function validatePackage(pkg, limits = PACKAGE_LIMITS) {
  const findings = [];
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    return [finding('package.object.required', '$', 'Package must be an object')];
  }

  for (const key of Object.keys(pkg)) {
    if (!TOP_LEVEL.has(key)) {
      findings.push(finding('package.field.unknown', `$.${key}`, 'Unknown top-level field is excluded from trusted state', 'warning'));
    }
  }
  if (pkg.format !== 'knowledge-pipeline/v1') {
    findings.push(finding('package.version.unsupported', '$.format', `Unsupported package format ${String(pkg.format)}`));
  }
  if (!presentString(pkg.packageId)) {
    findings.push(finding('package.id.required', '$.packageId', 'Package id is required'));
  }
  if (!validDate(pkg.createdAt)) {
    findings.push(finding('package.date.invalid', '$.createdAt', 'createdAt must be an ISO date-time'));
  }
  if (!presentString(pkg.scope?.knowledgeSpaceId) || !presentString(pkg.scope?.collectionId)) {
    findings.push(finding('package.scope.required', '$.scope', 'Knowledge-space and collection ids are required'));
  }
  validateExtensions(pkg.extensions, '$.extensions', findings);

  const records = pkg.records;
  if (!records || typeof records !== 'object' || Array.isArray(records)) {
    findings.push(finding('package.records.required', '$.records', 'Record groups are required'));
    return findings;
  }
  for (const group of RECORD_GROUPS) {
    if (!Array.isArray(records[group])) {
      findings.push(finding('package.records.array', `$.records.${group}`, `${group} must be an array`));
    }
  }
  if (findings.some(({severity}) => severity === 'error')) return findings;

  const operationCount = RECORD_GROUPS.reduce((count, group) => count + records[group].length, 0);
  if (operationCount > limits.maxOperations) {
    findings.push(finding('package.operations.limit', '$.records', `Package has ${operationCount} records; limit is ${limits.maxOperations}`));
  }

  const entityIds = duplicateIds(records.entities, 'entities', findings);
  const versionIds = duplicateIds(records.entityVersions, 'entityVersions', findings);
  duplicateIds(records.relationships, 'relationships', findings);
  const activityIds = duplicateIds(records.activities, 'activities', findings);
  duplicateIds(records.receipts, 'receipts', findings);
  const versionById = new Map(records.entityVersions.map((version) => [version.id, version]));

  for (const [index, entity] of records.entities.entries()) {
    if (!presentString(entity.type) || !presentString(entity.createdBy) || !validDate(entity.createdAt)) {
      findings.push(finding('entity.fields.invalid', `$.records.entities[${index}]`, 'Entity type, actor, and date are required'));
    }
    if (!versionIds.has(entity.currentVersionId)) {
      findings.push(finding('entity.current_version.missing', `$.records.entities[${index}].currentVersionId`, 'Current version must be present'));
    } else if (versionById.get(entity.currentVersionId)?.entityId !== entity.id) {
      findings.push(finding('entity.current_version.wrong_entity', `$.records.entities[${index}].currentVersionId`, 'Current version belongs to another entity'));
    }
  }

  for (const [index, version] of records.entityVersions.entries()) {
    const path = `$.records.entityVersions[${index}]`;
    if (!entityIds.has(version.entityId)) {
      findings.push(finding('version.entity.missing', `${path}.entityId`, 'Entity version must name a present entity'));
    }
    if (version.previousVersionId && !versionIds.has(version.previousVersionId)) {
      findings.push(finding('version.previous.missing', `${path}.previousVersionId`, 'Previous version must be present'));
    }
    if (version.schemaVersion !== 1 || !ENTITY_STATES.has(version.state)) {
      findings.push(finding('version.fields.invalid', path, 'Entity version schema and state are invalid'));
    }
    if (!presentString(version.createdBy) || !presentString(version.activityId) || !validDate(version.createdAt)) {
      findings.push(finding('version.audit.required', path, 'Entity version actor, activity, and date are required'));
    }
    if (!activityIds.has(version.activityId)) {
      findings.push(finding('version.activity.missing', `${path}.activityId`, 'Entity version activity must be present'));
    }
    validateExtensions(version.extensions, `${path}.extensions`, findings);
    if (Buffer.byteLength(canonicalJson(version.content ?? null)) > limits.maxEntityTextBytes) {
      findings.push(finding('version.content.limit', `${path}.content`, 'Entity content exceeds the configured limit'));
    }
    if (version.contentHash !== contentIdentity(version.content)) {
      findings.push(finding('version.hash.mismatch', `${path}.contentHash`, 'Entity version content hash does not match'));
    }
  }

  for (const [index, relationship] of records.relationships.entries()) {
    const path = `$.records.relationships[${index}]`;
    const missing = !entityIds.has(relationship.fromEntityId) || !entityIds.has(relationship.toEntityId);
    if (missing && relationship.state !== 'proposed') {
      findings.push(finding('relationship.endpoint.missing', path, 'Accepted relationship endpoints must be present'));
    } else if (missing) {
      findings.push(finding('relationship.endpoint.external', path, 'Proposed relationship has an external endpoint', 'warning'));
    }
    if (relationship.fromVersionId && !versionIds.has(relationship.fromVersionId)) {
      findings.push(finding('relationship.version.missing', `${path}.fromVersionId`, 'From version must be present'));
    }
    if (relationship.toVersionId && !versionIds.has(relationship.toVersionId)) {
      findings.push(finding('relationship.version.missing', `${path}.toVersionId`, 'To version must be present'));
    }
    if (!RELATIONSHIP_STATES.has(relationship.state)) {
      findings.push(finding('relationship.state.invalid', `${path}.state`, 'Relationship state is invalid'));
    }
    if (!activityIds.has(relationship.activityId) || !presentString(relationship.createdBy) || !validDate(relationship.createdAt)) {
      findings.push(finding('relationship.audit.required', path, 'Relationship actor, activity, and date must be present'));
    }
    const hashInput = {...relationship};
    delete hashInput.contentHash;
    if (relationship.contentHash !== contentIdentity(hashInput)) {
      findings.push(finding('relationship.hash.mismatch', `${path}.contentHash`, 'Relationship hash does not match'));
    }
  }

  for (const [index, activity] of records.activities.entries()) {
    if (!presentString(activity.type) || !presentString(activity.actorId) || !validDate(activity.createdAt) || !['completed', 'failed'].includes(activity.status)) {
      findings.push(finding('activity.fields.invalid', `$.records.activities[${index}]`, 'Activity type, actor, date, and status are required'));
    }
  }

  for (const [index, receipt] of records.receipts.entries()) {
    const path = `$.records.receipts[${index}]`;
    if (!presentString(receipt.operationId) || !presentString(receipt.packageHash) || !validDate(receipt.createdAt)) {
      findings.push(finding('receipt.fields.invalid', path, 'Receipt operation, package hash, and date are required'));
    }
    if (!activityIds.has(receipt.activityId)) {
      findings.push(finding('receipt.activity.missing', `${path}.activityId`, 'Receipt activity must be present'));
    }
    if (!['restore', 'merge', 'copy', 'migration'].includes(receipt.mode) || !Array.isArray(receipt.createdHashes)) {
      findings.push(finding('receipt.result.invalid', path, 'Receipt mode and created hashes are invalid'));
    }
  }

  if (!Array.isArray(pkg.assets)) {
    findings.push(finding('package.assets.array', '$.assets', 'Assets must be an array'));
  } else {
    for (const [index, asset] of pkg.assets.entries()) {
      const path = `$.assets[${index}]`;
      if (!presentString(asset.path) || !Number.isSafeInteger(asset.size) || asset.size < 0 || !presentString(asset.hash)) {
        findings.push(finding('asset.fields.invalid', path, 'Asset path, non-negative size, and hash are required'));
      }
      if (asset.bytes !== undefined && sha256(Buffer.from(asset.bytes, 'base64')) !== asset.hash) {
        findings.push(finding('asset.hash.mismatch', `${path}.hash`, 'Embedded asset hash does not match'));
      }
      if (asset.redistributable === false && asset.bytes !== undefined) {
        findings.push(finding('asset.rights.ref_only', path, 'Restricted assets must remain references'));
      }
    }
  }

  return findings;
}

export function trustedPackage(pkg) {
  const result = {};
  for (const key of TOP_LEVEL) {
    if (pkg[key] !== undefined) result[key] = pkg[key];
  }
  return result;
}
