import assert from 'node:assert/strict';
import test from 'node:test';
import {createFixturePackage} from '../src/fixture.mjs';
import {trustedPackage, validatePackage} from '../src/validate.mjs';

test('the canonical fixture validates and preserves namespaced extensions', () => {
  const fixture = createFixturePackage();
  assert.deepEqual(validatePackage(fixture), []);
  assert.deepEqual(
    fixture.records.entityVersions.find(({entityId}) => entityId === 'source:heat-18').extensions,
    {'fixture:unknown-preserved': {enabled: true}},
  );
});

test('unknown top-level data is warned and excluded from trusted state', () => {
  const fixture = {...createFixturePackage(), surprise: {trusted: false}};
  const findings = validatePackage(fixture);
  assert.equal(findings.find(({code}) => code === 'package.field.unknown')?.severity, 'warning');
  assert.equal(trustedPackage(fixture).surprise, undefined);
});

test('accepted relationships require endpoint closure', () => {
  const fixture = createFixturePackage();
  fixture.records.relationships[0].toEntityId = 'source:absent';
  assert.ok(validatePackage(fixture).some(({code}) => code === 'relationship.endpoint.missing'));
});
