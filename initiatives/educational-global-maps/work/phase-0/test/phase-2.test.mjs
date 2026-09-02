import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  buildRenderModel,
  changeProjection,
  layoutForWidth,
  projectionFor,
  recordAtPoint,
  semanticSnapshot,
  setReferenceRaster,
} from '../src/renderer.mjs';

const fixture = JSON.parse(await readFile(fileURLToPath(new URL('../fixtures/renderer-scene.json', import.meta.url)), 'utf8'));

test('Phase 2 scalar and point models preserve exact classes, units, periods, and missing state', () => {
  const scalar = buildRenderModel(fixture);
  assert.equal(scalar.dataset.title, 'Population by country');
  assert.equal(scalar.period, '2023');
  assert.equal(scalar.dataset.unit, 'people');
  assert.equal(scalar.records.find(({id}) => id === 'country:FRA').legend.id, 'small');
  assert.equal(scalar.records.find(({id}) => id === 'country:DEU').legend.id, 'medium');
  assert.equal(scalar.records.find(({id}) => id === 'country:BRA').legend.id, 'large');
  assert.equal(scalar.records.find(({id}) => id === 'country:UNK').legend.id, 'missing');
  const points = buildRenderModel(fixture, {datasetId: 'dataset:learning-centres'});
  assert.equal(points.dataset.profile, 'points-events');
  assert.equal(points.records.length, 5);
  assert.ok(points.records.every(({legend}) => legend.id === 'observed'));
});

test('Equal Earth reference and Airocean use named, distinct projection geometry', () => {
  const equalEarth = projectionFor('equal-earth', 1200, 600, {center: [0, 0], zoom: 1, pan: [0, 0]});
  const airocean = projectionFor('airocean', 1200, 600, {center: [0, 0], zoom: 1, pan: [0, 0]});
  const equalOrigin = equalEarth([0, 0]);
  assert.ok(Math.abs(equalOrigin[0] - 600) < 0.001);
  assert.ok(Math.abs(equalOrigin[1] - 300) < 0.001);
  const equalParis = equalEarth([2.35, 48.86]);
  const airoceanParis = airocean([2.35, 48.86]);
  assert.ok(Math.hypot(equalParis[0] - airoceanParis[0], equalParis[1] - airoceanParis[1]) > 20);
});

test('Airocean switching preserves revision, encoding, period, citations, and selection', () => {
  const initial = buildRenderModel(fixture, {selectedId: 'country:DEU'});
  const changed = changeProjection(initial, 'airocean');
  assert.equal(changed.status, 'accepted');
  assert.equal(changed.projection, 'airocean');
  assert.equal(changed.dataRevision, initial.dataRevision);
  assert.equal(changed.encoding, initial.encoding);
  assert.equal(changed.period, initial.period);
  assert.deepEqual(changed.citations, initial.citations);
  assert.equal(changed.selectedId, 'country:DEU');
});

test('Fixed cartogram identifies its population source and retains scalar colors', () => {
  const initial = buildRenderModel(fixture);
  const cartogram = changeProjection(initial, 'population-cartogram');
  assert.equal(cartogram.status, 'accepted');
  assert.equal(cartogram.fixture.cartogram.source, 'UN World Population Prospects 2024');
  assert.equal(cartogram.fixture.cartogram.year, '2023');
  assert.equal(cartogram.records.find(({id}) => id === 'country:BRA').legend.color, initial.records.find(({id}) => id === 'country:BRA').legend.color);
});

test('An incompatible raster refusal keeps the accepted projection and layer state visible', () => {
  const initial = buildRenderModel(fixture);
  const withRaster = setReferenceRaster(initial, true);
  const refused = changeProjection(withRaster, 'airocean');
  assert.equal(refused.status, 'refused');
  assert.equal(refused.projection, 'equal-earth');
  assert.deepEqual(refused.activeLayerIds, ['layer:population', 'layer:reference-raster']);
  assert.equal(refused.findings[0].code, 'renderer.projection.refused');
  assert.match(refused.findings[0].message, /Conventional-grid reference raster/u);
});

test('The semantic equivalent carries exact values, status, legend, and citations', () => {
  const snapshot = semanticSnapshot(buildRenderModel(fixture));
  assert.equal(snapshot.rows.length, fixture.geography.features.length);
  assert.equal(snapshot.rows.find(({id}) => id === 'country:UNK').status, 'missing');
  assert.equal(snapshot.rows.find(({id}) => id === 'country:FRA').value, 66438828);
  assert.ok(snapshot.legend.some(({id}) => id === 'missing'));
  assert.ok(snapshot.citations.some(({label}) => label.includes('World Population Prospects')));
});

test('Required viewport modes are deterministic and do not expose an authoring mode', () => {
  assert.deepEqual(layoutForWidth(3840), {name: 'display-4k', controls: 'compact-rail', columns: 2});
  assert.deepEqual(layoutForWidth(1440), {name: 'laptop', controls: 'side-panel', columns: 2});
  assert.deepEqual(layoutForWidth(430), {name: 'phone', controls: 'stacked', columns: 1});
});

test('The 250-feature reference projection stays within the 500 ms first-paint budget', () => {
  const projection = projectionFor('equal-earth', 3840, 2160, {center: [0, 0], zoom: 1, pan: [0, 0]});
  const coordinates = Array.from({length: 250}, (_, index) => [((index * 37) % 350) - 175, ((index * 19) % 160) - 80]);
  const started = performance.now();
  const projected = coordinates.map((coordinate) => projection(coordinate));
  const elapsed = performance.now() - started;
  assert.equal(projected.length, 250);
  assert.ok(projected.every((point) => point?.every(Number.isFinite)));
  assert.ok(elapsed < 500, `250-feature projection took ${elapsed} ms`);
});

test('Paused hit inspection resolves a rendered semantic record', () => {
  const model = {...buildRenderModel(fixture), hitTargets: [{id: 'country:FRA', x: 10, y: 10, width: 40, height: 30}]};
  assert.equal(recordAtPoint(model, 25, 20).id, 'country:FRA');
  assert.equal(recordAtPoint(model, 100, 100), null);
});
