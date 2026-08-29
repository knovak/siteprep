import {stageOneFixture} from '../../phase-9/fixtures/brest-stage-one.mjs';

const baseConstituents = stageOneFixture.tile.points[0].constituents;

function adjustedConstituents(scale, phaseShift) {
  return baseConstituents.map(constituent => ({
    name: constituent.name,
    amplitude: Number((constituent.amplitude * scale).toFixed(6)),
    phase: Number((constituent.phase + phaseShift) % 360),
  }));
}

function tile(id, bounds, point) {
  return {id, bounds, points: [point]};
}

export const fesSourceSample = Object.freeze({
  schema: 'tide-here/fes-source-extract/v1',
  dataset: {
    id: 'fes-shaped-global-sample',
    version: '2026-08-27',
    schema: 'tide-here/fes-prepared-dataset/v1',
    preparedAt: '2026-08-27T18:00:00.000Z',
    displayName: 'Synthetic FES-shaped Stage 4 fixture',
    dataClass: 'test-fixture',
    model: 'Synthetic FES-shaped harmonic fixture with one TICON-3 validation point',
    isFes2022: false,
    attribution: 'Synthetic Tide Here fixture; the Brest point is TICON-3 data from the official PyFES example. No FES2022 atlas values are included.',
    sourceUrl: 'https://cnes.github.io/aviso-fes/auto_examples/ex_constituents_prediction.html',
    licenceReference: 'No FES2022 licence applies to this synthetic fixture.',
    engine: '@neaps/tide-predictor 0.11.0 with Schureman nodal corrections',
  },
  tiles: [
    tile('europe-west', {south: 48.25, west: -4.65, north: 48.55, east: -4.30}, {
      id: 'brest-ticon3-stage-four',
      name: 'Brest Stage 4 validation point',
      latitude: 48.383,
      longitude: -4.495,
      timeZone: 'Europe/Paris',
      maximumDistanceKm: 20,
      datum: 'relative harmonic datum from TICON-3 fixture',
      units: 'cm',
      water: true,
      constituents: adjustedConstituents(1, 0),
    }),
    tile('north-atlantic', {south: 52.9, west: -9.4, north: 53.5, east: -8.7}, {
      id: 'galway-synthetic-stage-four',
      name: 'Galway synthetic model point',
      latitude: 53.27,
      longitude: -9.05,
      timeZone: 'Europe/Dublin',
      maximumDistanceKm: 40,
      datum: 'synthetic harmonic datum',
      units: 'cm',
      water: true,
      constituents: adjustedConstituents(0.55, 18),
    }),
    tile('south-atlantic', {south: -34.2, west: 18.1, north: -33.6, east: 18.8}, {
      id: 'cape-town-synthetic-stage-four',
      name: 'Cape Town synthetic model point',
      latitude: -33.92,
      longitude: 18.42,
      timeZone: 'Africa/Johannesburg',
      maximumDistanceKm: 40,
      datum: 'synthetic harmonic datum',
      units: 'cm',
      water: true,
      constituents: adjustedConstituents(0.38, 145),
    }),
  ],
});
