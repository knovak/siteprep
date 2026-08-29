import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {gunzipSync} from 'node:zlib';

import {loadAustraliaPreparedOfficial} from '../fixtures/australia-prepared-official.mjs';
import {australiaPreparedSample} from '../fixtures/australia-prepared-sample.mjs';
import {australiaSourceSample} from '../fixtures/australia-source-sample.mjs';
import {
  australiaDatasetBundle,
  importAustralianAnnualSource,
  validatePreparedAustralianDataset,
} from '../src/australia-importer.mjs';

const officialSource = JSON.parse(gunzipSync(await readFile(
  new URL('../data/bom-annual-2026.source.json.gz', import.meta.url),
)));
const officialManifest = JSON.parse(await readFile(
  new URL('../data/bom-annual-2026.manifest.json', import.meta.url),
  'utf8',
));
const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();

test('the offline importer still reproduces the synthetic boundary fixture exactly', () => {
  const imported = importAustralianAnnualSource(australiaSourceSample);
  assert.deepEqual(imported, australiaPreparedSample);
  assert.equal(imported.stations.length, 23);
  assert.equal(imported.events.length, 33580);
  assert.equal(imported.dataset.isOfficial, false);
  assert.match(imported.dataset.attribution, /Synthetic Tide Here test fixture/);
});

test('the checksum-recorded Bureau source reproduces the licensed artifact exactly', () => {
  const imported = importAustralianAnnualSource(officialSource);
  assert.deepEqual(imported, australiaPreparedOfficial);
  assert.equal(imported.stations.length, 76);
  assert.equal(imported.events.length, 103597);
  assert.equal(imported.dataset.isOfficial, true);
  assert.equal(imported.dataset.dataClass, 'licensed-source');
  assert.equal(imported.dataset.sourceFiles.length, 76);
  assert.equal(officialManifest.datasetVersion, imported.dataset.version);
  assert.deepEqual(officialManifest.sourceFiles, imported.dataset.sourceFiles);
  assert.match(imported.dataset.attribution, /Commonwealth of Australia.*Bureau of Meteorology/);
  assert.match(imported.dataset.disclaimer, /Bureau makes no representation/);
});

test('held-out annual-table values survive PDF parsing and UTC preparation exactly', () => {
  const expected = {
    'au-qld-brisbane-bar': [['03:19:00', 'low', 0.53], ['08:51:00', 'high', 1.88], ['14:55:00', 'low', 0.4], ['21:18:00', 'high', 2.42]],
    'au-nsw-sydney': [['01:49:00', 'low', 0.38], ['07:43:00', 'high', 1.37], ['13:21:00', 'low', 0.49], ['19:47:00', 'high', 1.77]],
    'au-vic-melbourne': [['00:19:00', 'high', 0.79], ['07:47:00', 'low', 0.29], ['14:55:00', 'high', 0.84], ['20:46:00', 'low', 0.57]],
    'au-tas-hobart': [['01:45:00', 'low', 0.53], ['08:11:00', 'high', 1.04], ['11:52:00', 'low', 0.92], ['18:53:00', 'high', 1.44]],
    'au-sa-port-adelaide': [['05:14:00', 'high', 2.01], ['10:42:00', 'low', 0.76], ['16:53:00', 'high', 2.58], ['23:22:00', 'low', 0.36]],
    'au-wa-fremantle': [['01:24:00', 'low', 0.77], ['08:52:00', 'high', 1.12], ['16:52:00', 'low', 0.62], ['23:08:00', 'high', 0.81]],
    'au-wa-broome': [['04:42:00', 'low', 2.89], ['10:37:00', 'high', 8.39], ['16:57:00', 'low', 2.07], ['22:57:00', 'high', 8.44]],
    'au-nt-darwin': [['06:19:00', 'high', 6.61], ['12:28:00', 'low', 2.58], ['17:53:00', 'high', 6.1]],
  };
  for (const [stationId, values] of Object.entries(expected)) {
    const actual = australiaPreparedOfficial.events
      .filter(event => event.stationId === stationId && event.localDate === '2026-08-27')
      .map(event => [event.sourceLocalTime, event.type, event.height]);
    assert.deepEqual(actual, values, stationId);
  }
});

test('local source times become UTC using each Australian port IANA zone', () => {
  const imported = importAustralianAnnualSource(australiaSourceSample);
  const eventAt = stationId => imported.events.find(event => event.stationId === stationId).at;
  assert.equal(eventAt('au-brisbane-sample'), '2025-12-31T15:50:00.000Z');
  assert.equal(eventAt('au-sydney-sample'), '2025-12-31T14:50:00.000Z');
  assert.equal(eventAt('au-darwin-sample'), '2025-12-31T16:10:00.000Z');
  assert.equal(eventAt('au-fremantle-sample'), '2025-12-31T19:10:00.000Z');
  assert.equal(eventAt('au-adelaide-sample'), '2025-12-31T15:05:00.000Z');
});

test('a source UTC offset must agree with the port time zone on that date', () => {
  const source = structuredClone(australiaSourceSample);
  source.ports.find(port => port.id === 'au-sydney-sample').predictions[0].utcOffset = '+10:00';
  assert.throws(() => importAustralianAnnualSource(source), /does not match Australia\/Sydney/);
});

test('licensed source data cannot pass preparation without source and licence metadata', () => {
  const source = structuredClone(officialSource);
  source.metadata.sourceUrl = null;
  assert.throws(() => importAustralianAnnualSource(source), /requires sourceUrl/);

  const prepared = structuredClone(australiaPreparedOfficial);
  prepared.dataset.sourceUrl = null;
  assert.throws(() => validatePreparedAustralianDataset(prepared), /requires sourceUrl/);

  delete prepared.dataset.licenceReference;
  assert.throws(() => australiaDatasetBundle(prepared), /missing licenceReference/);

  const missingDisclaimer = structuredClone(officialSource);
  delete missingDisclaimer.metadata.disclaimer;
  assert.throws(() => importAustralianAnnualSource(missingDisclaimer), /requires disclaimer/);

  const invalidIntegrity = structuredClone(officialSource);
  invalidIntegrity.metadata.sourceFiles[0].sha256 = 'not-a-checksum';
  assert.throws(() => importAustralianAnnualSource(invalidIntegrity), /integrity record/);

  const mismatchedFile = structuredClone(officialSource);
  mismatchedFile.metadata.sourceFiles[0].predictions -= 1;
  assert.throws(() => importAustralianAnnualSource(mismatchedFile), /does not match port/);
});

test('duplicate predictions and events outside the declared annual year are rejected', () => {
  const duplicate = structuredClone(australiaSourceSample);
  duplicate.ports[0].predictions.push({...duplicate.ports[0].predictions[0]});
  assert.throws(() => importAustralianAnnualSource(duplicate), /Duplicate prediction/);

  const wrongYear = structuredClone(australiaSourceSample);
  wrongYear.ports[0].predictions[0].date = '2027-01-15';
  assert.throws(() => importAustralianAnnualSource(wrongYear), /does not match the source year/);

  const outsideCoverage = structuredClone(australiaSourceSample);
  outsideCoverage.metadata.coverageEnd = '2026-01-31';
  outsideCoverage.ports[0].predictions[0].date = '2026-02-15';
  assert.throws(() => importAustralianAnnualSource(outsideCoverage), /outside the declared coverage/);
});
