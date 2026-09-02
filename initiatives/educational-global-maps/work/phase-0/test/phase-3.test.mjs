import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  addTemporalLayer,
  advanceAnimation,
  alignLayer,
  buildTemporalFrame,
  createAnimation,
  setAnimationPaused,
  setTemporalTime,
  stateEncoding,
  temporalSnapshot,
} from '../src/temporal.mjs';

const fixture = JSON.parse(await readFile(fileURLToPath(new URL('../fixtures/temporal-scene.json', import.meta.url)), 'utf8'));

test('mixed cadences expose each layer actual period at the scene time', () => {
  const frame = buildTemporalFrame(fixture, {time: '2023-06'});
  assert.equal(frame.status, 'accepted');
  assert.equal(frame.layers.find(({id}) => id === 'layer:population-through-time').actualPeriod, '2023');
  assert.equal(frame.layers.find(({id}) => id === 'layer:education-index').actualPeriod, '2022 → 2024');
  assert.equal(frame.layers.find(({id}) => id === 'layer:learner-movement').actualPeriod, '2023-05-15');
  assert.equal(frame.layers.find(({id}) => id === 'layer:temporary-centres').actualPeriod, '2023-06');
});

test('alignment is refused unless an exact period or declared rule exists', () => {
  const layer = {id: 'layer:unruled', title: 'Unruled monthly values', kind: 'scalar', revision: 'r1', observations: [{period: '2023-05', records: []}]};
  const result = alignLayer(layer, '2023-06');
  assert.equal(result.status, 'refused');
  assert.equal(result.finding.code, 'time.alignment.rule_required');
});

test('named interpolation records method, parameters, inputs, status, and revision', () => {
  const layer = fixture.layers.find(({id}) => id === 'layer:education-index');
  const aligned = alignLayer(layer, '2023-06');
  assert.equal(aligned.transformation.method, 'linear-interpolation');
  assert.deepEqual(aligned.transformation.inputs, ['2022', '2024']);
  assert.equal(typeof aligned.transformation.parameters.ratio, 'number');
  assert.equal(aligned.transformation.outputStatus, 'interpolated');
  assert.equal(aligned.transformation.revision, 'fixture:education-index-v1');
  assert.ok(aligned.records.every(({status}) => status === 'interpolated'));
});

test('named aggregation preserves its inputs and modeled output', () => {
  const layer = {
    id: 'layer:rainfall', title: 'Monthly rainfall', kind: 'scalar', revision: 'rain-v1',
    alignment: {method: 'aggregate', reducer: 'sum'},
    observations: [
      {period: '2023-01', records: [{id: 'country:FRA', value: 2, status: 'measured'}]},
      {period: '2023-02', records: [{id: 'country:FRA', value: 3, status: 'measured'}]},
    ],
  };
  const aligned = alignLayer(layer, '2023');
  assert.equal(aligned.records[0].value, 5);
  assert.equal(aligned.records[0].status, 'modeled');
  assert.equal(aligned.transformation.method, 'sum-aggregation');
  assert.deepEqual(aligned.transformation.inputs, ['2023-01', '2023-02']);
});

test('zero, unavailable, suppressed, outside-range, filtered, and interpolated remain distinct', () => {
  const states = new Set();
  for (const time of fixture.timeline) {
    const snapshot = temporalSnapshot(buildTemporalFrame(fixture, {time}));
    for (const layer of snapshot.layers) for (const row of layer.rows) states.add(row.status);
  }
  assert.deepEqual([...states].sort(), ['filtered', 'interpolated', 'measured', 'missing', 'outside-range', 'suppressed', 'unavailable', 'zero']);
  assert.equal(new Set([...states].map((status) => stateEncoding(status).pattern)).size, states.size);
});

test('flow over field preserves direction, magnitude, actual period, zero, and missing records', () => {
  const frame = buildTemporalFrame(fixture, {time: '2023-06'});
  const field = frame.layers.find(({id}) => id === 'layer:population-through-time');
  const flow = frame.layers.find(({id}) => id === 'layer:learner-movement');
  assert.equal(field.unit, 'people');
  assert.equal(field.actualPeriod, '2023');
  assert.equal(flow.actualPeriod, '2023-05-15');
  assert.deepEqual(flow.records.find(({id}) => id === 'flow:paris-berlin'), {
    id: 'flow:paris-berlin', from: 'country:FRA', to: 'country:DEU',
    fromCoordinates: [2.35, 48.86], toCoordinates: [13.4, 52.52], value: 36, status: 'measured',
  });
  assert.equal(flow.records.find(({id}) => id === 'flow:london-paris').status, 'zero');
  assert.equal(flow.records.find(({id}) => id === 'flow:unknown').status, 'missing');
});

test('stable point ids enter and leave only through declared coverage', () => {
  const first = buildTemporalFrame(fixture, {time: '2023-06'}).layers.find(({kind}) => kind === 'points');
  const later = buildTemporalFrame(fixture, {time: '2024'}).layers.find(({kind}) => kind === 'points');
  assert.deepEqual(first.records.map(({id}) => id), later.records.map(({id}) => id));
  assert.equal(first.records.find(({id}) => id === 'point:paris-summer').status, 'measured');
  assert.equal(later.records.find(({id}) => id === 'point:paris-summer').status, 'outside-range');
  assert.equal(later.records.find(({id}) => id === 'point:nairobi-2024').status, 'measured');
});

test('raster frames render conventionally and refuse alternate projection without changing accepted state', () => {
  const accepted = buildTemporalFrame(fixture, {time: '2023-06'});
  const withRaster = addTemporalLayer(accepted, fixture, 'layer:sea-temperature-frame');
  assert.equal(withRaster.status, 'accepted');
  assert.equal(withRaster.layers.at(-1).frameId, 'raster:2023-06');
  const airocean = buildTemporalFrame(fixture, {time: '2023-06', projection: 'airocean'});
  const refused = addTemporalLayer(airocean, fixture, 'layer:sea-temperature-frame');
  assert.equal(refused.status, 'refused');
  assert.equal(refused.findings[0].code, 'layer.projection.refused');
  assert.deepEqual(refused.frame, airocean);
});

test('a failed time change contains failure and preserves layers, projection, and scene time', () => {
  const accepted = buildTemporalFrame(fixture, {time: '2023-06', activeLayerIds: ['layer:sea-temperature-frame']});
  const refused = setTemporalTime(accepted, fixture, '2024');
  assert.equal(refused.status, 'refused');
  assert.equal(refused.frame.time, '2023-06');
  assert.equal(refused.frame.projection, 'equal-earth');
  assert.deepEqual(refused.frame.activeLayerIds, ['layer:sea-temperature-frame']);
});

test('animation loops deterministically and reduced motion starts paused', () => {
  const frame = buildTemporalFrame(fixture, {time: '2022'});
  const reduced = createAnimation(frame, fixture, {reducedMotion: true});
  assert.equal(reduced.paused, true);
  assert.equal(advanceAnimation(reduced).frame.time, '2022');
  const running = setAnimationPaused(createAnimation(frame, fixture), false);
  assert.equal(advanceAnimation(running).frame.time, '2023-06');
});

test('25,000 flows and 50,000 points keep the declared visible limits within the update budget', () => {
  const flows = Array.from({length: 25_000}, (_, index) => ({id: `flow:${index}`, from: 'a', to: 'b', fromCoordinates: [0, 0], toCoordinates: [1, 1], value: index % 7, status: index % 11 ? 'measured' : 'zero'}));
  const points = Array.from({length: 50_000}, (_, index) => ({id: `point:${index}`, label: `Point ${index}`, coordinates: [index % 180, index % 80], start: '2022', end: '2024', value: 1, status: 'measured'}));
  const scale = {projection: 'equal-earth', timeline: ['2023'], layers: [
    {id: 'layer:flows', title: 'Scale flows', kind: 'flow', unit: 'moves', revision: 'scale-v1', projections: ['equal-earth'], defaultActive: true, observations: [{period: '2023', records: flows}]},
    {id: 'layer:points', title: 'Scale points', kind: 'points', unit: 'locations', revision: 'scale-v1', projections: ['equal-earth'], defaultActive: true, records: points},
  ]};
  const started = performance.now();
  const frame = buildTemporalFrame(scale, {time: '2023'});
  const elapsed = performance.now() - started;
  assert.equal(frame.layers[0].totalRecords, 25_000);
  assert.equal(frame.layers[0].visibleRecords, 5_000);
  assert.equal(frame.layers[1].totalRecords, 50_000);
  assert.equal(frame.layers[1].visibleRecords, 10_000);
  assert.ok(elapsed < 2_000, `temporal frame took ${elapsed} ms`);
});
