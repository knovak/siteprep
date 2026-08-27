import assert from 'node:assert/strict';
import {test} from 'node:test';

import {australiaPreparedSample} from '../fixtures/australia-prepared-sample.mjs';
import {australiaSourceSample} from '../fixtures/australia-source-sample.mjs';
import {
  australiaDatasetBundle,
  importAustralianAnnualSource,
  validatePreparedAustralianDataset,
} from '../src/australia-importer.mjs';

test('the offline importer reproduces the committed prepared artifact exactly', () => {
  const imported = importAustralianAnnualSource(australiaSourceSample);
  assert.deepEqual(imported, australiaPreparedSample);
  assert.equal(imported.stations.length, 3);
  assert.equal(imported.events.length, 60);
  assert.equal(imported.dataset.isOfficial, false);
  assert.match(imported.dataset.attribution, /Synthetic Tide Here test fixture/);
});

test('local source times become UTC using each Australian port IANA zone', () => {
  const imported = importAustralianAnnualSource(australiaSourceSample);
  const eventAt = stationId => imported.events.find(event => event.stationId === stationId).at;
  assert.equal(eventAt('au-sydney-sample'), '2026-01-14T15:20:00.000Z');
  assert.equal(eventAt('au-darwin-sample'), '2026-01-14T16:10:00.000Z');
  assert.equal(eventAt('au-fremantle-sample'), '2026-01-14T19:10:00.000Z');
});

test('a source UTC offset must agree with the port time zone on that date', () => {
  const source = structuredClone(australiaSourceSample);
  source.ports[0].predictions[0].utcOffset = '+10:00';
  assert.throws(() => importAustralianAnnualSource(source), /does not match Australia\/Sydney/);
});

test('licensed source data cannot pass preparation without source and licence metadata', () => {
  const source = structuredClone(australiaSourceSample);
  source.metadata.dataClass = 'licensed-source';
  source.metadata.sourceUrl = null;
  assert.throws(() => importAustralianAnnualSource(source), /requires a source URL/);

  const prepared = structuredClone(australiaPreparedSample);
  prepared.dataset.dataClass = 'licensed-source';
  prepared.dataset.sourceUrl = null;
  assert.throws(() => validatePreparedAustralianDataset(prepared), /requires a source URL/);

  delete prepared.dataset.licenceReference;
  assert.throws(() => australiaDatasetBundle(prepared), /missing licenceReference/);
});

test('duplicate predictions and events outside the declared annual year are rejected', () => {
  const duplicate = structuredClone(australiaSourceSample);
  duplicate.ports[0].predictions.push({...duplicate.ports[0].predictions[0]});
  assert.throws(() => importAustralianAnnualSource(duplicate), /Duplicate prediction/);

  const wrongYear = structuredClone(australiaSourceSample);
  wrongYear.ports[0].predictions[0].date = '2027-01-15';
  assert.throws(() => importAustralianAnnualSource(wrongYear), /does not match the source year/);

  const outsideCoverage = structuredClone(australiaSourceSample);
  outsideCoverage.ports[0].predictions[0].date = '2026-02-15';
  assert.throws(() => importAustralianAnnualSource(outsideCoverage), /outside the declared coverage/);
});
