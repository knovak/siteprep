import {DatabaseSync} from 'node:sqlite';
import {canonicalJson, contentIdentity, deepClone} from './canonical.mjs';
import {assertNoErrors, CustodyError, finding} from './findings.mjs';
import {trustedPackage, validatePackage} from './validate.mjs';

const TABLES = Object.freeze({
  entities: 'entity',
  entityVersions: 'entity_version',
  relationships: 'relationship',
  activities: 'activity',
  receipts: 'receipt',
});

function scopeKey(scope) {
  return `${scope.knowledgeSpaceId}\u001f${scope.collectionId}`;
}

function shortIdentity(value) {
  return contentIdentity(value).slice('sha256:'.length, 'sha256:'.length + 24);
}

function remapId(kind, id, targetScope) {
  return `${kind}:copy:${shortIdentity({id, targetScope})}`;
}

function recalculateRelationshipHash(relationship) {
  const hashInput = {...relationship};
  delete hashInput.contentHash;
  return {...relationship, contentHash: contentIdentity(hashInput)};
}

export function copyPackage(pkg, targetScope) {
  const source = deepClone(pkg);
  const entityIds = new Map(source.records.entities.map(({id}) => [id, remapId('entity', id, targetScope)]));
  const versionIds = new Map(source.records.entityVersions.map(({id}) => [id, remapId('version', id, targetScope)]));
  const activityIds = new Map(source.records.activities.map(({id}) => [id, remapId('activity', id, targetScope)]));
  const receiptIds = new Map(source.records.receipts.map(({id}) => [id, remapId('receipt', id, targetScope)]));

  source.scope = deepClone(targetScope);
  source.records.entities = source.records.entities.map((entity) => ({
    ...entity,
    id: entityIds.get(entity.id),
    currentVersionId: versionIds.get(entity.currentVersionId),
  }));
  source.records.entityVersions = source.records.entityVersions.map((version) => ({
    ...version,
    id: versionIds.get(version.id),
    entityId: entityIds.get(version.entityId),
    previousVersionId: version.previousVersionId ? versionIds.get(version.previousVersionId) : null,
    activityId: activityIds.get(version.activityId) ?? version.activityId,
  }));
  source.records.relationships = source.records.relationships.map((relationship) => recalculateRelationshipHash({
    ...relationship,
    id: remapId('relationship', relationship.id, targetScope),
    fromEntityId: entityIds.get(relationship.fromEntityId) ?? relationship.fromEntityId,
    toEntityId: entityIds.get(relationship.toEntityId) ?? relationship.toEntityId,
    fromVersionId: relationship.fromVersionId ? versionIds.get(relationship.fromVersionId) : null,
    toVersionId: relationship.toVersionId ? versionIds.get(relationship.toVersionId) : null,
    activityId: activityIds.get(relationship.activityId) ?? relationship.activityId,
  }));
  source.records.activities = source.records.activities.map((activity) => ({
    ...activity,
    id: activityIds.get(activity.id),
  }));
  source.records.receipts = source.records.receipts.map((receipt) => ({
    ...receipt,
    id: receiptIds.get(receipt.id),
    operationId: remapId('operation', receipt.operationId, targetScope),
    activityId: activityIds.get(receipt.activityId) ?? receipt.activityId,
  }));
  source.packageId = `package:copy:${shortIdentity({source: pkg.packageId, targetScope})}`;
  return source;
}

export class CustodyRepository {
  constructor(path = ':memory:', options = {}) {
    this.database = new DatabaseSync(path);
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS entity (
        scope_key TEXT NOT NULL,
        id TEXT NOT NULL,
        json TEXT NOT NULL,
        PRIMARY KEY (scope_key, id)
      );
      CREATE TABLE IF NOT EXISTS entity_version (
        scope_key TEXT NOT NULL,
        id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        json TEXT NOT NULL,
        PRIMARY KEY (scope_key, id)
      );
      CREATE TABLE IF NOT EXISTS relationship (
        scope_key TEXT NOT NULL,
        id TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        json TEXT NOT NULL,
        PRIMARY KEY (scope_key, id)
      );
      CREATE TABLE IF NOT EXISTS activity (
        scope_key TEXT NOT NULL,
        id TEXT NOT NULL,
        portable INTEGER NOT NULL DEFAULT 1,
        json TEXT NOT NULL,
        PRIMARY KEY (scope_key, id)
      );
      CREATE TABLE IF NOT EXISTS receipt (
        scope_key TEXT NOT NULL,
        id TEXT NOT NULL,
        portable INTEGER NOT NULL DEFAULT 1,
        json TEXT NOT NULL,
        PRIMARY KEY (scope_key, id)
      );
      CREATE TABLE IF NOT EXISTS operation (
        scope_key TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        package_hash TEXT NOT NULL,
        preview_hash TEXT NOT NULL,
        receipt_json TEXT NOT NULL,
        PRIMARY KEY (scope_key, operation_id)
      );
      CREATE TABLE IF NOT EXISTS asset (
        scope_key TEXT NOT NULL,
        path TEXT NOT NULL,
        hash TEXT NOT NULL,
        size INTEGER NOT NULL,
        redistributable INTEGER NOT NULL,
        json TEXT NOT NULL,
        PRIMARY KEY (scope_key, path)
      );
    `);
  }

  close() {
    this.database.close();
  }

  count(scope, table) {
    return Number(this.database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE scope_key = ?`).get(scopeKey(scope)).count);
  }

  inventory(scope, {portableOnly = false} = {}) {
    const key = scopeKey(scope);
    const result = {};
    for (const [group, table] of Object.entries(TABLES)) {
      const portable = portableOnly && ['activity', 'receipt'].includes(table) ? ' AND portable = 1' : '';
      result[group] = this.database
        .prepare(`SELECT json FROM ${table} WHERE scope_key = ?${portable} ORDER BY id`)
        .all(key)
        .map(({json}) => JSON.parse(json));
    }
    result.assets = this.database
      .prepare('SELECT json FROM asset WHERE scope_key = ? ORDER BY path')
      .all(key)
      .map(({json}) => JSON.parse(json));
    return result;
  }

  currentFingerprint(scope) {
    const rows = this.database
      .prepare('SELECT id, json FROM entity WHERE scope_key = ? ORDER BY id')
      .all(scopeKey(scope))
      .map(({id, json}) => ({id, currentVersionId: JSON.parse(json).currentVersionId}));
    return contentIdentity(rows);
  }

  previewImport(pkg, {mode, targetScope, operationId}) {
    if (!['restore', 'merge', 'copy'].includes(mode)) {
      throw new CustodyError([finding('import.mode.invalid', '$.mode', `Unsupported import mode ${mode}`)]);
    }
    if (!operationId) {
      throw new CustodyError([finding('import.operation.required', '$.operationId', 'Operation id is required')]);
    }
    const candidate = mode === 'copy' ? copyPackage(pkg, targetScope) : trustedPackage(deepClone(pkg));
    if (mode !== 'copy' && scopeKey(candidate.scope) !== scopeKey(targetScope)) {
      throw new CustodyError([finding('import.scope.mismatch', '$.scope', 'Merge and restore require the package scope to match the target')]);
    }
    const findings = validatePackage(candidate);
    assertNoErrors(findings);
    if (mode === 'restore' && this.count(targetScope, 'entity') > 0) {
      throw new CustodyError([finding('import.restore.not_empty', '$.target', 'Restore target must be empty')]);
    }
    const trusted = trustedPackage(candidate);
    const packageHash = contentIdentity(trusted);
    const preview = {
      mode,
      targetScope: deepClone(targetScope),
      operationId,
      packageHash,
      baseFingerprint: this.currentFingerprint(targetScope),
      candidate: trusted,
      findings,
    };
    preview.previewHash = contentIdentity({
      mode,
      targetScope,
      operationId,
      packageHash,
      baseFingerprint: preview.baseFingerprint,
    });
    return preview;
  }

  commitImport(preview, {faultAfterWrites = Infinity} = {}) {
    const key = scopeKey(preview.targetScope);
    const existingOperation = this.database
      .prepare('SELECT package_hash, preview_hash, receipt_json FROM operation WHERE scope_key = ? AND operation_id = ?')
      .get(key, preview.operationId);
    if (existingOperation) {
      if (existingOperation.package_hash !== preview.packageHash || existingOperation.preview_hash !== preview.previewHash) {
        throw new CustodyError([finding('import.operation.conflict', '$.operationId', 'Operation id was already used for different work')]);
      }
      return {...JSON.parse(existingOperation.receipt_json), duplicate: true};
    }
    if (this.currentFingerprint(preview.targetScope) !== preview.baseFingerprint) {
      throw new CustodyError([finding('import.preview.stale', '$.preview', 'Accepted state changed after preview')]);
    }

    const createdHashes = [];
    let writes = 0;
    const write = (group, record, portable = true, track = true) => {
      const table = TABLES[group];
      const json = canonicalJson(record);
      const existing = this.database.prepare(`SELECT json FROM ${table} WHERE scope_key = ? AND id = ?`).get(key, record.id);
      if (existing) {
        if (existing.json !== json) {
          throw new CustodyError([finding('import.id.conflict', `$.records.${group}`, `${group} id ${record.id} already has different content`)]);
        }
        return;
      }
      if (table === 'entity_version') {
        this.database.prepare('INSERT INTO entity_version(scope_key, id, entity_id, content_hash, json) VALUES (?, ?, ?, ?, ?)')
          .run(key, record.id, record.entityId, record.contentHash, json);
      } else if (table === 'relationship') {
        this.database.prepare('INSERT INTO relationship(scope_key, id, content_hash, json) VALUES (?, ?, ?, ?)')
          .run(key, record.id, record.contentHash, json);
      } else if (table === 'activity' || table === 'receipt') {
        this.database.prepare(`INSERT INTO ${table}(scope_key, id, portable, json) VALUES (?, ?, ?, ?)`)
          .run(key, record.id, portable ? 1 : 0, json);
      } else {
        this.database.prepare('INSERT INTO entity(scope_key, id, json) VALUES (?, ?, ?)').run(key, record.id, json);
      }
      if (track) createdHashes.push(contentIdentity(record));
      writes += 1;
      if (writes >= faultAfterWrites) throw new Error('Injected transaction failure');
    };

    this.database.exec('BEGIN IMMEDIATE');
    try {
      for (const group of ['activities', 'entities', 'entityVersions', 'relationships', 'receipts']) {
        for (const record of preview.candidate.records[group]) write(group, record, true);
      }
      for (const asset of preview.candidate.assets) {
        const json = canonicalJson(asset);
        const existing = this.database.prepare('SELECT json FROM asset WHERE scope_key = ? AND path = ?').get(key, asset.path);
        if (existing && existing.json !== json) {
          throw new CustodyError([finding('asset.path.conflict', '$.assets', `Asset path ${asset.path} already differs`)]);
        }
        if (!existing) {
          this.database.prepare('INSERT INTO asset(scope_key, path, hash, size, redistributable, json) VALUES (?, ?, ?, ?, ?, ?)')
            .run(key, asset.path, asset.hash, asset.size, asset.redistributable === false ? 0 : 1, json);
          createdHashes.push(contentIdentity(asset));
          writes += 1;
          if (writes >= faultAfterWrites) throw new Error('Injected transaction failure');
        }
      }

      const now = this.clock();
      const localActivity = {
        id: `activity:import:${shortIdentity({operationId: preview.operationId, packageHash: preview.packageHash})}`,
        type: 'package-import',
        actorId: 'actor:import',
        createdAt: now,
        status: 'completed',
        details: {mode: preview.mode, packageHash: preview.packageHash},
      };
      write('activities', localActivity, false, false);
      const receipt = {
        id: `receipt:import:${shortIdentity({operationId: preview.operationId, packageHash: preview.packageHash})}`,
        operationId: preview.operationId,
        packageHash: preview.packageHash,
        activityId: localActivity.id,
        createdAt: now,
        mode: preview.mode,
        createdHashes: [...createdHashes].sort(),
      };
      write('receipts', receipt, false, false);
      this.database.prepare('INSERT INTO operation(scope_key, operation_id, package_hash, preview_hash, receipt_json) VALUES (?, ?, ?, ?, ?)')
        .run(key, preview.operationId, preview.packageHash, preview.previewHash, canonicalJson(receipt));
      this.database.exec('COMMIT');
      return {...receipt, duplicate: false};
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  exportPackage(scope, {createdAt = this.clock()} = {}) {
    const inventory = this.inventory(scope, {portableOnly: true});
    const records = {
      entities: inventory.entities,
      entityVersions: inventory.entityVersions,
      relationships: inventory.relationships,
      activities: inventory.activities,
      receipts: inventory.receipts,
    };
    const identity = contentIdentity({scope, records, assets: inventory.assets});
    return {
      format: 'knowledge-pipeline/v1',
      packageId: `package:${identity.slice('sha256:'.length, 'sha256:'.length + 32)}`,
      createdAt,
      scope: deepClone(scope),
      records,
      assets: inventory.assets,
      extensions: {'siteprep:core': {version: 1}},
    };
  }
}
