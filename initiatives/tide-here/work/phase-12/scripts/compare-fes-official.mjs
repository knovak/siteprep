import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';
import {forecastFromTile} from '../../phase-9/src/forecast.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {compareWithOfficialPort} from '../src/official-port-comparison.mjs';

const planPath = new URL('../data/fes2022-official-comparison-plan.json', import.meta.url);
const plan = JSON.parse(await readFile(planPath, 'utf8'));
if (plan.schema !== 'tide-here/fes-official-comparison-plan/v1') throw new Error('Unsupported comparison plan');
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node compare-fes-official.mjs <source-extract.json|source-module.mjs> [output.json]');
const fesSourceOfficial = sourcePath.endsWith('.mjs')
  ? (await import(pathToFileURL(sourcePath))).fesSourceOfficial
  : JSON.parse(await readFile(sourcePath, 'utf8'));
const australia = await loadAustraliaPreparedOfficial();

function sourcePoint(id) {
  for (const tile of fesSourceOfficial.tiles) {
    const point = tile.points.find(item => item.id === id);
    if (point) return {point, tile};
  }
  throw new Error(`FES source point is missing: ${id}`);
}

const comparisons = plan.cases.map(item => {
  const station = australia.stations.find(candidate => candidate.id === item.officialStationId);
  if (!station) throw new Error(`Official station is missing: ${item.officialStationId}`);
  const {point, tile} = sourcePoint(item.modelPointId);
  const rows = fiveLocalDays(plan.windowStart, point.timeZone);
  const start = rows[0].startUtc;
  const end = rows.at(-1).endUtc;
  const forecast = forecastFromTile({
    schema: 'tide-here/harmonic-tile/v1',
    dataset: fesSourceOfficial.dataset,
    tile,
  }, {
    latitude: point.latitude,
    longitude: point.longitude,
    start,
    end,
  });
  const modelEvents = forecast.tides.map(event => ({...event, height: event.height / 100}));
  const officialEvents = australia.events.filter(event => (
    event.stationId === station.id && event.at >= start && event.at < end
  ));
  return {
    id: item.id,
    window: {start, end},
    modelPoint: {id: point.id, name: point.name, latitude: point.latitude, longitude: point.longitude},
    officialPort: {id: station.id, name: station.name, sourceUrl: station.sourceUrl},
    ...compareWithOfficialPort({modelEvents, officialEvents, thresholds: item.thresholds}),
  };
});

const evidence = {
  schema: 'tide-here/fes-official-comparison/v1',
  checkedAt: plan.checkedAt,
  model: {
    id: fesSourceOfficial.dataset.id,
    version: fesSourceOfficial.dataset.version,
    sourceUrl: fesSourceOfficial.dataset.sourceUrl,
    licenceUrl: fesSourceOfficial.dataset.licenceUrl,
  },
  passed: comparisons.every(comparison => comparison.passed),
  comparisons,
};
const outputPath = process.argv[3];
if (outputPath) await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
else console.log(JSON.stringify(evidence, null, 2));
if (!evidence.passed) throw new Error('One or more FES2022 official-port comparisons failed');
