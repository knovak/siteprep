import {fiveLocalDays, localDateTimeUtc, placeInstantInRow} from './day-model.mjs';
import {Astronomy} from './astronomy.mjs';

export function forecastRows(date, timeZone, now = new Date()) {
  // An empty date means today on the selected coast, not today on this device.
  return fiveLocalDays(date ? localDateTimeUtc(date, timeZone, {hour: 12}) : now, timeZone);
}

export function makeForecast({place, point, rows, events, dataset, now = new Date()}) {
  const days = rows.map(row => ({date: row.date, tides: []}));
  for (const event of events) {
    const placement = placeInstantInRow(event.at, rows, point.timeZone);
    if (placement) days[placement.rowIndex].tides.push(event);
  }
  const forecast = {schema: 'tide-here/standalone-forecast/v1', generatedAt: now.toISOString(),
    input: {display: place.label}, place, point: {...point, constituents: undefined}, timeZone: point.timeZone,
    engine: {runtime: 'QuickJS WebAssembly', tidePredictor: '0.11.0', nodeCorrections: 'schureman'},
    datum: 'FES2022 mean sea level harmonic datum', days,
    warnings: [{code: 'approximate-model', message: 'Approximate astronomical model. Heights are metres relative to mean sea level, not chart datum. Weather, storm surge, waves and river flow are excluded. Not for navigation or safety decisions.'}],
    sources: [dataset]};
  return new Astronomy({now: () => now}).enrich({forecast, rows, station: point, timeZone: point.timeZone});
}
