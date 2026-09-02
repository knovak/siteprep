import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {CustodyError} from '../src/findings.mjs';
import {migrateV0} from '../src/migration.mjs';
import {validatePackage} from '../src/validate.mjs';

const fixtureUrl = new URL('../fixtures/v0-package.json', import.meta.url);
const futureUrl = new URL('../fixtures/future-package.json', import.meta.url);

test('migration requires a verified pre-migration restore and emits a portable receipt', async () => {
  const legacy = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  assert.throws(() => migrateV0(legacy), CustodyError);
  const migrated = migrateV0(legacy, {backupVerified: true});
  assert.deepEqual(validatePackage(migrated), []);
  assert.equal(migrated.records.entities.length, 1);
  assert.equal(migrated.records.receipts[0].mode, 'migration');
  assert.equal(migrated.extensions['siteprep:migration'].sourceFormat, 'knowledge-pipeline/v0');
});

test('future package versions are named and refused', async () => {
  const future = JSON.parse(await readFile(futureUrl, 'utf8'));
  const finding = validatePackage(future).find(({code}) => code === 'package.version.unsupported');
  assert.equal(finding.path, '$.format');
  assert.match(finding.message, /knowledge-pipeline\/v99/);
});
