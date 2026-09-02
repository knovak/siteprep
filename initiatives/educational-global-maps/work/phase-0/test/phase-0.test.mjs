import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {strToU8, unzipSync, zipSync} from 'fflate';
import {canonicalJson, contentIdentity, parseJsonStrict} from '../src/canonical.mjs';
import {inspectZip, readBundle, writeBundle} from '../src/bundle.mjs';
import {makeMinimumFixture} from '../src/fixture.mjs';
import {migrateSceneV0} from '../src/migration.mjs';
import {SceneRepository} from '../src/repository.mjs';
import {applyIntent, compatibility, createSession} from '../src/scene.mjs';
import {trustedInventory, validateInventory, validateObject} from '../src/validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'fixtures');

async function temporary(name, fn) {
  const root = await mkdtemp(join(tmpdir(), `${name}-`));
  try { return await fn(root); } finally { await rm(root, {recursive: true, force: true}); }
}

function intent(intentId, baseRevision, type, payload) {
  return {
    schema: 'educational-global-maps/intent/v1',
    id: `intent:${intentId}-v1`,
    content: {intentId: `intent:${intentId}`, sessionId: 'session:minimum', baseRevision, type, payload},
  };
}

test('checkpoint 1: canonical vectors and strict refusals are stable', async () => {
  const vectors = JSON.parse(await readFile(join(FIXTURES, 'canonical-vectors.json'), 'utf8'));
  assert.equal(canonicalJson(vectors.equivalent[0]), canonicalJson(vectors.equivalent[1]));
  assert.equal(contentIdentity(vectors.equivalent[0]), contentIdentity(vectors.equivalent[1]));
  assert.notEqual(contentIdentity(vectors.equivalent[0]), contentIdentity(vectors.different));
  assert.match(contentIdentity(vectors.equivalent[0]), /^sha256:[0-9a-f]{64}$/u);
  for (const vector of vectors.strictRefusals) {
    assert.throws(() => parseJsonStrict(vector.text), (error) => error.code === vector.code);
  }
  assert.notEqual(canonicalJson({field: null}), canonicalJson({}));
});

test('checkpoint 1: every minimum canonical object validates and closed contracts refuse drift', () => {
  const fixture = makeMinimumFixture();
  assert.deepEqual(validateInventory(fixture), []);
  const schemas = new Set(fixture.objects.map(({schema}) => schema));
  assert.deepEqual([...schemas].sort(), [
    'educational-global-maps/crosswalk/v1',
    'educational-global-maps/dataset-descriptor/v1',
    'educational-global-maps/geography-set/v1',
    'educational-global-maps/intent/v1',
    'educational-global-maps/layer/v1',
    'educational-global-maps/prepared-revision/v1',
    'educational-global-maps/scene/v1',
    'educational-global-maps/session-snapshot/v1',
    'educational-global-maps/spherical-report/v1',
  ]);
  const invalid = structuredClone(fixture.objects.find(({schema}) => schema.endsWith('/scene/v1')));
  delete invalid.content.period;
  invalid.content.script = '<script>alert(1)</script>';
  const codes = validateObject(invalid).map(({code}) => code);
  assert.ok(codes.includes('object.content.required'));
  assert.ok(codes.includes('object.content.unknown'));
});

test('checkpoint 2: exact reference closure and future-version refusal leave bounded findings', async () => {
  const fixture = makeMinimumFixture();
  fixture.objects = fixture.objects.filter(({id}) => id !== 'revision:scalar-v1');
  assert.ok(validateInventory(fixture).some(({code}) => code === 'reference.object.missing'));
  const future = JSON.parse(await readFile(join(FIXTURES, 'future-scene.json'), 'utf8'));
  const findings = validateObject(future);
  assert.deepEqual(findings.map(({code}) => code), ['schema.future']);
  assert.ok(JSON.stringify(findings).length < 512);
});

test('checkpoint 2: scene v0 migrates purely and deterministically', async () => {
  const source = JSON.parse(await readFile(join(FIXTURES, 'scene-v0.json'), 'utf8'));
  const before = canonicalJson(source);
  const first = migrateSceneV0(source);
  const second = migrateSceneV0(source);
  assert.equal(canonicalJson(source), before);
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.deepEqual(validateObject(first.target), []);
  assert.equal(first.receipt.sourceIdentity, contentIdentity(source));
  assert.equal(first.receipt.targetIdentity, contentIdentity(first.target));
});

test('checkpoint 2: immutable repository is atomic and idempotent', () => temporary('egm-repository', async (root) => {
  const repository = new SceneRepository(root);
  const fixture = makeMinimumFixture();
  const first = await repository.accept(fixture);
  const fingerprint = await repository.fingerprint();
  const mtime = await repository.acceptedMtime();
  assert.equal(first.changed, true);
  const duplicate = await repository.accept(fixture);
  assert.equal(duplicate.changed, false);
  assert.equal(await repository.acceptedMtime(), mtime);
  for (const faultAt of ['after-validation', 'after-stage', 'before-commit']) {
    const addition = makeMinimumFixture();
    addition.objects.push({...addition.objects[0], id: `geography:fault-${faultAt}-v1`});
    await assert.rejects(() => repository.accept(addition, {faultAt}), /Injected fault/u);
    assert.equal(await repository.fingerprint(), fingerprint);
  }
  const conflict = makeMinimumFixture();
  conflict.objects.find(({id}) => id === 'scene:minimum-v1').content.title = 'Changed under immutable id';
  await assert.rejects(() => repository.accept(conflict), (error) => error.findings?.[0]?.code === 'repository.objects.immutable_conflict');
  assert.equal(await repository.fingerprint(), fingerprint);
}));

test('checkpoint 3: bundle round trip and repeated restore preserve logical inventory', () => temporary('egm-bundle', async (root) => {
  const fixture = makeMinimumFixture();
  const path = join(root, 'scene.egm.zip');
  const manifest = await writeBundle(path, fixture);
  const imported = await readBundle(path);
  assert.equal(imported.manifest.bundleId, manifest.bundleId);
  assert.equal(canonicalJson(imported.inventory), canonicalJson(trustedInventory(fixture)));
  const restricted = imported.inventory.assets.find(({id}) => id === 'asset:restricted-v1');
  assert.equal(restricted.redistributable, false);
  assert.equal(restricted.bytes, undefined);
  const repository = new SceneRepository(join(root, 'repository'));
  assert.equal((await repository.accept(imported.inventory)).changed, true);
  const mtime = await repository.acceptedMtime();
  assert.equal((await repository.accept(imported.inventory)).changed, false);
  assert.equal(await repository.acceptedMtime(), mtime);
}));

test('checkpoint 3: hostile paths, collisions, links, limits, and checksums are refused before import', () => temporary('egm-hostile', async (root) => {
  const hostile = Buffer.from(zipSync({
    '../escape': strToU8('x'),
    'Cafe\u0301': strToU8('a'),
    'Caf\u00e9': strToU8('b'),
    'CON/file': strToU8('c'),
  }, {level: 0}));
  const codes = inspectZip(hostile).findings.map(({code}) => code);
  assert.ok(codes.includes('bundle.path.unsafe'));
  assert.ok(codes.includes('bundle.path.collision'));

  const linked = Buffer.from(zipSync({'link': strToU8('x')}, {level: 0}));
  const central = linked.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  linked.writeUInt32LE((0o120777 << 16) >>> 0, central + 38);
  assert.ok(inspectZip(linked).findings.some(({code}) => code === 'bundle.entry.special'));
  assert.ok(inspectZip(Buffer.from(zipSync({'large': strToU8('12345')}, {level: 0})), {...(await import('../src/limits.mjs')).BUNDLE_LIMITS, maxEntryBytes: 4}).findings.some(({code}) => code === 'bundle.entry.limit'));

  const fixture = makeMinimumFixture();
  const path = join(root, 'valid.egm.zip');
  await writeBundle(path, fixture);
  const files = unzipSync(await readFile(path));
  files['assets/scalar.jsonl'][0] ^= 1;
  const corrupt = join(root, 'corrupt.egm.zip');
  await writeFile(corrupt, zipSync(files, {level: 0}));
  await assert.rejects(() => readBundle(corrupt), (error) => error.findings?.[0]?.code === 'asset.checksum.mismatch');
}));

test('checkpoint 4: pure reducer accepts, deduplicates, rejects stale state, and refuses incompatible projection', () => {
  const fixture = makeMinimumFixture();
  const scene = fixture.objects.find(({id}) => id === fixture.rootScene).content;
  const layers = new Map(fixture.objects.filter(({schema}) => schema.endsWith('/layer/v1')).map((layer) => [layer.id, layer]));
  const initial = createSession(scene, 'session:minimum');
  const time = intent('time', 0, 'set-time', {period: '2020'});
  const first = applyIntent(initial, time, layers);
  assert.equal(first.status, 'accepted');
  assert.equal(first.session.scene.period, '2020');
  assert.equal(initial.scene.period, '2025');
  assert.equal(applyIntent(first.session, time, layers).status, 'duplicate');
  assert.equal(applyIntent(first.session, intent('stale', 0, 'set-time', {period: '2025'}), layers).status, 'stale');
  const allAirocean = applyIntent(first.session, intent('bad-projection', 1, 'set-projection', {projection: 'airocean'}), layers);
  assert.equal(allAirocean.status, 'refused');
  assert.ok(allAirocean.findings.some(({code}) => code === 'compatibility.projection.refused'));
  const vectorLayers = ['layer:scalar-v1', 'layer:flow-v1', 'layer:points-v1'];
  const reduced = applyIntent(first.session, intent('vectors', 1, 'set-layers', {layers: vectorLayers}), layers);
  const projected = applyIntent(reduced.session, intent('airocean', 2, 'set-projection', {projection: 'airocean'}), layers);
  assert.equal(projected.status, 'accepted');
  assert.equal(projected.session.acceptedRevision, 3);
  assert.equal(compatibility(projected.session.scene, layers).compatible, true);
});

test('checkpoint 4: all four synthetic profiles and honest statuses travel with the scene', () => {
  const fixture = makeMinimumFixture();
  const layers = fixture.objects.filter(({schema}) => schema.endsWith('/layer/v1'));
  assert.deepEqual(layers.map(({content}) => content.profile).sort(), [
    'origin-destination-flow', 'place-time-series', 'points-events', 'raster-frame',
  ]);
  for (const layer of layers) assert.deepEqual(layer.content.statusSemantics, ['measured', 'zero', 'missing', 'suppressed']);
  const scene = fixture.objects.find(({id}) => id === fixture.rootScene);
  assert.equal(scene.content.citations.length, 4);
  assert.equal(scene.content.layers.length, 4);
});
