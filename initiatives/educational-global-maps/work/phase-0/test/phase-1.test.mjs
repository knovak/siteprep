import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  buildCatalogue,
  descriptorDetail,
  generateScaleDescriptors,
  searchCatalogue,
  validateCrosswalk,
  validateGeography,
} from '../src/catalogue.mjs';
import {evaluateContribution, validateContribution} from '../src/contribution.mjs';

const root = fileURLToPath(new URL('../fixtures/contributions/', import.meta.url));

test('rights-safe OWID and Data Commons contributions prepare deterministic artifacts and reports', async () => {
  const owid = await validateContribution(join(root, 'owid-population'));
  const dataCommons = await validateContribution(join(root, 'datacommons-income'));
  assert.deepEqual(owid.findings, []);
  assert.deepEqual(dataCommons.findings, []);
  assert.equal(owid.prepared.report.outputRows, 3);
  assert.equal(dataCommons.prepared.report.outputRows, 2);
  assert.match(owid.prepared.artifact, /country:FRA/u);
  assert.match(dataCommons.prepared.artifact, /CensusACS5YearSurvey/u);
  assert.match(owid.prepared.artifactHash, /^sha256:[0-9a-f]{64}$/u);
});

test('the 500-descriptor catalogue searches metadata only with exact facets', () => {
  const descriptors = generateScaleDescriptors();
  const started = performance.now();
  const catalogue = buildCatalogue(descriptors);
  const elapsed = performance.now() - started;
  assert.equal(catalogue.records.length, 500);
  assert.deepEqual(catalogue.findings, []);
  assert.ok(elapsed < 2000, `metadata indexing took ${elapsed} ms`);
  assert.equal(searchCatalogue(catalogue, {topics: ['population']}).length, 100);
  assert.equal(searchCatalogue(catalogue, {providers: ['fixture-alpha']}).length, 125);
  assert.equal(searchCatalogue(catalogue, {placeLevels: ['city']}).length, 100);
  assert.equal(searchCatalogue(catalogue, {profiles: ['flows']}).length, 100);
  assert.equal(searchCatalogue(catalogue, {licences: ['CC0-1.0']}).length, 250);
  assert.equal(searchCatalogue(catalogue, {projectionCapabilities: ['airocean']}).length, 333);
  assert.deepEqual(searchCatalogue(catalogue, {text: 'scale population descriptor 000'}).map(({id}) => id), ['dataset:scale-000']);
});

test('detail records distinguish unknown from explicitly absent metadata', () => {
  const descriptor = generateScaleDescriptors(1)[0];
  descriptor.gaps = null;
  delete descriptor.transformations;
  const detail = descriptorDetail(descriptor);
  assert.equal(detail.gaps.state, 'absent');
  assert.equal(detail.transformations.state, 'unknown');
  assert.equal(detail.unit.state, 'known');
});

test('changed input and missing publication rights block artifacts without rewriting metadata', async () => {
  const directory = join(root, 'owid-population');
  const descriptor = JSON.parse(await readFile(join(directory, 'descriptor.json'), 'utf8'));
  const sourceBytes = await readFile(join(directory, 'source.json'));
  const scene = JSON.parse(await readFile(join(directory, 'scene.json'), 'utf8'));
  const adapter = await import(new URL('../fixtures/contributions/owid-population/adapter.mjs', import.meta.url));
  const changed = await evaluateContribution({descriptor: {...descriptor, distribution: {...descriptor.distribution, checksum: 'sha256:changed'}}, sourceBytes, adapter, scene});
  assert.equal(changed.prepared, null);
  assert.ok(changed.findings.some(({code}) => code === 'source.checksum.changed'));
  const restricted = await evaluateContribution({descriptor: {...descriptor, rights: {...descriptor.rights, status: 'restricted'}}, sourceBytes, adapter, scene});
  assert.equal(restricted.prepared, null);
  assert.ok(restricted.findings.some(({code, severity}) => code === 'rights.artifact.blocked' && severity === 'warning'));
});

test('geography and crosswalk validation expose ambiguous labels, missing parents, dates, and temporal conflicts', () => {
  const geography = validateGeography([
    {id: 'place:one', label: 'Springfield'},
    {id: 'place:two', label: 'Springfield', parentId: 'place:missing'},
    {id: 'place:three', label: 'Elsewhere', validFrom: '2025', validTo: '2020'},
  ]);
  assert.deepEqual(geography.map(({code}) => code).sort(), ['geography.date.invalid', 'geography.label.ambiguous', 'geography.parent.missing']);
  const crosswalk = validateCrosswalk([
    {sourceId: 'provider:one', targetId: 'place:one', method: 'reviewed-code', validFrom: '2020', validTo: '2025'},
    {sourceId: 'provider:one', targetId: 'place:two', method: 'reviewed-code', validFrom: '2020', validTo: '2025'},
  ]);
  assert.deepEqual(crosswalk.map(({code}) => code), ['crosswalk.temporal.conflict']);
});
