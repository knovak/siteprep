import assert from 'node:assert/strict';
import test from 'node:test';
import {CustodyError} from '../src/findings.mjs';
import {createFixturePackage, FIXED_TIME, FIXTURE_SCOPE} from '../src/fixture.mjs';
import {CustodyRepository} from '../src/repository.mjs';

test('transaction failure leaves accepted state empty and retry commits once', () => {
  const repository = new CustodyRepository(':memory:', {clock: () => FIXED_TIME});
  try {
    const fixture = createFixturePackage();
    const preview = repository.previewImport(fixture, {
      mode: 'restore', targetScope: FIXTURE_SCOPE, operationId: 'operation:fault',
    });
    assert.throws(() => repository.commitImport(preview, {faultAfterWrites: 5}), /Injected transaction failure/);
    assert.equal(repository.count(FIXTURE_SCOPE, 'entity'), 0);
    const receipt = repository.commitImport(preview);
    assert.equal(receipt.duplicate, false);
    const replay = repository.commitImport(preview);
    assert.equal(replay.duplicate, true);
    assert.equal(repository.count(FIXTURE_SCOPE, 'entity'), 20);
  } finally {
    repository.close();
  }
});

test('same-package merge is a no-op and explicit copy remaps both relationship endpoints', () => {
  const repository = new CustodyRepository(':memory:', {clock: () => FIXED_TIME});
  const copyScope = {knowledgeSpaceId: 'space:copy', collectionId: 'collection:copy'};
  try {
    const fixture = createFixturePackage();
    repository.commitImport(repository.previewImport(fixture, {
      mode: 'restore', targetScope: FIXTURE_SCOPE, operationId: 'operation:restore',
    }));
    const reimport = repository.commitImport(repository.previewImport(fixture, {
      mode: 'merge', targetScope: FIXTURE_SCOPE, operationId: 'operation:merge',
    }));
    assert.deepEqual(reimport.createdHashes, []);
    const copy = repository.commitImport(repository.previewImport(fixture, {
      mode: 'copy', targetScope: copyScope, operationId: 'operation:copy',
    }));
    assert.ok(copy.createdHashes.length > 0);
    const copied = repository.inventory(copyScope, {portableOnly: true});
    const entityIds = new Set(copied.entities.map(({id}) => id));
    for (const relationship of copied.relationships) {
      assert.ok(entityIds.has(relationship.fromEntityId));
      assert.ok(entityIds.has(relationship.toEntityId));
    }
    assert.notEqual(copied.entities[0].id, fixture.records.entities[0].id);
  } finally {
    repository.close();
  }
});

test('a state change after preview makes commit stale', () => {
  const repository = new CustodyRepository(':memory:', {clock: () => FIXED_TIME});
  try {
    const preview = repository.previewImport(createFixturePackage(), {
      mode: 'restore', targetScope: FIXTURE_SCOPE, operationId: 'operation:stale',
    });
    repository.database.prepare('INSERT INTO entity(scope_key, id, json) VALUES (?, ?, ?)').run(
      `${FIXTURE_SCOPE.knowledgeSpaceId}\u001f${FIXTURE_SCOPE.collectionId}`,
      'source:intervening',
      JSON.stringify({id: 'source:intervening', currentVersionId: 'version:intervening'}),
    );
    assert.throws(() => repository.commitImport(preview), (error) => {
      assert.ok(error instanceof CustodyError);
      assert.ok(error.findings.some(({code}) => code === 'import.preview.stale'));
      return true;
    });
  } finally {
    repository.close();
  }
});
