import {contentIdentity} from './canonical.mjs';
import {CustodyError, finding} from './findings.mjs';
import {FIXED_TIME} from './fixture.mjs';

export function migrateV0(oldPackage, {backupVerified = false} = {}) {
  if (!backupVerified) {
    throw new CustodyError([finding('migration.backup.required', '$.backup', 'Verified pre-migration restore is required')]);
  }
  if (oldPackage?.format !== 'knowledge-pipeline/v0' || !Array.isArray(oldPackage.items)) {
    throw new CustodyError([finding('migration.source.unsupported', '$.format', 'Only knowledge-pipeline/v0 is supported')]);
  }
  const activity = {
    id: 'activity:migration-v0-v1',
    type: 'schema-migration',
    actorId: 'actor:migration',
    createdAt: FIXED_TIME,
    status: 'completed',
    details: {from: 'knowledge-pipeline/v0', to: 'knowledge-pipeline/v1'},
  };
  const entities = [];
  const entityVersions = [];
  for (const item of oldPackage.items) {
    const entityId = `source:${item.id}`;
    const versionId = `${entityId}:v1`;
    const content = {title: item.title, originalUrl: item.url, captureState: 'metadata-only'};
    entities.push({id: entityId, type: 'source', createdAt: FIXED_TIME, createdBy: 'actor:migration', currentVersionId: versionId});
    entityVersions.push({
      id: versionId,
      entityId,
      schemaVersion: 1,
      createdAt: FIXED_TIME,
      createdBy: 'actor:migration',
      activityId: activity.id,
      previousVersionId: null,
      state: 'accepted',
      content,
      contentHash: contentIdentity(content),
    });
  }
  const records = {entities, entityVersions, relationships: [], activities: [activity], receipts: []};
  const assets = [];
  const scope = {...oldPackage.scope};
  const packageHash = contentIdentity({scope, records, assets});
  const receipt = {
    id: 'receipt:migration-v0-v1',
    operationId: 'operation:migration-v0-v1',
    packageHash,
    activityId: activity.id,
    createdAt: FIXED_TIME,
    mode: 'migration',
    createdHashes: [...entities, ...entityVersions, activity].map(contentIdentity).sort(),
  };
  records.receipts.push(receipt);
  const identity = contentIdentity({scope, records, assets});
  return {
    format: 'knowledge-pipeline/v1',
    packageId: `package:${identity.slice(7, 39)}`,
    createdAt: FIXED_TIME,
    scope,
    records,
    assets,
    extensions: {'siteprep:migration': {sourceFormat: oldPackage.format, sourceHash: contentIdentity(oldPackage)}},
  };
}
