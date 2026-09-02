import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  acceptUpgrade,
  compareUpgrade,
  createShareLink,
  preparePortableBundle,
  renderOfflineDocument,
  resolveShareLink,
  restorePortableBundle,
  saveSceneRevision,
  validateSceneDraft,
} from '../src/composer.mjs';

const fixture = JSON.parse(await readFile(fileURLToPath(new URL('../fixtures/educational-scenes.json', import.meta.url)), 'utf8'));

function save(scene, options) {
  const result = saveSceneRevision(scene, fixture.catalogue, options);
  assert.equal(result.status, 'accepted', JSON.stringify(result.findings));
  return result.revision;
}

test('scalar, compatible layered, and flow-over-field scenes save without undocumented edits', () => {
  const revisions = fixture.scenes.map((scene) => save(scene));
  assert.equal(revisions.length, 3);
  assert.deepEqual(revisions.map(({content}) => content.layers.length), [1, 2, 2]);
  assert.deepEqual(revisions.map(({content}) => content.title), fixture.scenes.map(({title}) => title));
  assert.ok(revisions.every(({content}) => content.layers.every(({datasetRevision}) => datasetRevision)));
});

test('invalid geography, unit formula, time rule, rights, and projection identify layer and correction', () => {
  const base = structuredClone(fixture.scenes[1]);
  const cases = [
    ['composer.geography.crosswalk_required', (draft, catalogue) => { catalogue.find(({id}) => id === 'layer:education-index').geographyRef = 'geography:districts-v1'; }],
    ['composer.unit.formula_mismatch', (draft, catalogue) => { catalogue.find(({id}) => id === 'layer:education-index').formula.resultUnit = 'percent'; }],
    ['composer.time.rule_required', (draft) => { delete draft.layers[0].alignmentRule; }],
    ['composer.rights.blocked', (draft, catalogue) => { catalogue.find(({id}) => id === 'layer:education-index').rights.status = 'unknown'; }],
    ['composer.projection.incompatible', (draft) => { draft.projection = 'orthographic'; }],
  ];
  for (const [code, mutate] of cases) {
    const draft = structuredClone(base);
    const catalogue = structuredClone(fixture.catalogue);
    mutate(draft, catalogue);
    const result = saveSceneRevision(draft, catalogue);
    const found = result.findings.find((candidate) => candidate.code === code);
    assert.ok(found, `${code} should be present`);
    assert.ok(/choose|correct|declare|record|remove/iu.test(found.message), found.message);
  }
});

test('definitions, caveats, questions, ordered stops, and separately sourced claims version with scene', () => {
  const revision = save(fixture.scenes[0]);
  assert.deepEqual(revision.content.definitions, fixture.scenes[0].definitions);
  assert.deepEqual(revision.content.caveats, fixture.scenes[0].caveats);
  assert.deepEqual(revision.content.discussionPrompts, fixture.scenes[0].discussionPrompts);
  assert.deepEqual(revision.content.presentationStops.map(({order}) => order), [1, 2]);
  assert.equal(revision.content.claims[0].sources[0].url, 'https://d3js.org/d3-geo/projection');
  const invalid = structuredClone(fixture.scenes[0]);
  invalid.claims[0].sources = [];
  assert.ok(validateSceneDraft(invalid, fixture.catalogue).some(({code}) => code === 'composer.claim.source_required'));
});

test('a stable share link resolves the pinned scene after a newer dataset exists', () => {
  const revision = save(fixture.scenes[0]);
  const link = createShareLink(revision, 'https://maps.test/present');
  const resolved = resolveShareLink(link, [revision]);
  assert.equal(resolved.status, 'accepted');
  assert.equal(resolved.revision.content.layers[0].datasetRevision, 'dataset:population@2023');
  const comparison = compareUpgrade(resolved.revision, fixture.catalogue);
  assert.equal(comparison.status, 'available');
  assert.ok(comparison.changes.some(({field, to}) => field === 'dataset' && to === 'dataset:population@2024'));
  assert.equal(resolved.revision.content.layers[0].datasetRevision, 'dataset:population@2023');
});

test('accepting an explicit upgrade creates a new revision and names dataset, geography, and transformation changes', () => {
  const original = save(fixture.scenes[0]);
  const upgraded = acceptUpgrade(original, fixture.catalogue, {createdAt: '2026-09-02T12:00:00.000Z'});
  assert.equal(upgraded.status, 'accepted');
  assert.notEqual(upgraded.revision.revisionId, original.revisionId);
  assert.equal(upgraded.revision.predecessorRevisionId, original.revisionId);
  assert.deepEqual(new Set(upgraded.changes.map(({field}) => field)), new Set(['dataset', 'geography', 'transformation']));
});

test('an incompatible upgrade reports a refusal and does not create a revision', () => {
  const original = save(fixture.scenes[0]);
  const catalogue = structuredClone(fixture.catalogue);
  catalogue.find(({revision}) => revision === 'dataset:population@2024').projections = ['population-cartogram'];
  const upgraded = acceptUpgrade(original, catalogue);
  assert.equal(upgraded.status, 'refused');
  assert.equal('revision' in upgraded, false);
  assert.ok(upgraded.findings.some(({code}) => code === 'composer.projection.incompatible'));
});

test('portable bundle restores permitted bytes while live assets remain limited references', () => {
  const revision = save(fixture.scenes[2]);
  const bundle = preparePortableBundle(revision, fixture.catalogue, fixture.assets);
  assert.deepEqual(bundle.bundledAssets.map(({id}) => id), ['asset:population-2023']);
  assert.equal(bundle.references[0].id, 'asset:movement-live');
  assert.match(bundle.references[0].limitation, /not redistributed/iu);
  assert.equal(bundle.references[0].expiresAt, '2026-12-31T23:59:59.000Z');
  const restored = restorePortableBundle(bundle);
  assert.equal(restored.status, 'accepted');
  assert.deepEqual(restored.scene, revision);
  assert.deepEqual(restored.references, bundle.references);
});

test('portable document renders from a clean static server without provider requests', async (context) => {
  const revision = save(fixture.scenes[2]);
  const bundle = preparePortableBundle(revision, fixture.catalogue, fixture.assets);
  const directory = await mkdtemp(join(tmpdir(), 'egm-portable-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  await writeFile(join(directory, 'index.html'), renderOfflineDocument(bundle));
  const requests = [];
  const server = createServer(async (request, response) => {
    requests.push(request.url);
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end(await readFile(join(directory, 'index.html')));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, new RegExp(revision.revisionId));
  assert.match(html, /Classroom access token required/iu);
  assert.doesNotMatch(html, /provider\.invalid/iu);
  assert.deepEqual(requests, ['/']);
});

test('representative restore stays below budget and loads only the scene closure', () => {
  const catalogue = [...fixture.catalogue, ...Array.from({length: 500}, (_, index) => ({id: `unused:${index}`, revision: `unused@${index}`}))];
  const revision = save(fixture.scenes[1]);
  const bundle = preparePortableBundle(revision, catalogue, fixture.assets);
  const restored = restorePortableBundle(bundle, {memoryBudgetBytes: 1024});
  assert.equal(restored.status, 'accepted');
  assert.ok(restored.restoredBytes < 1024);
  assert.equal(bundle.catalogueArtifactsLoaded, 2);
});
