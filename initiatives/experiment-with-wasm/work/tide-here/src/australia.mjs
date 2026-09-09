import {distanceKm} from './data.mjs';
import {makeForecast} from './forecast.mjs';

export const australianProvider = {name: 'Bureau of Meteorology'};

// The hosted application also serves these prepared annual tables, not a live
// Bureau API. The standalone build carries the same validated dataset in-file.
export function createAustralianTides(loadDataset) {
  let loaded;
  const dataset = () => loaded ??= loadDataset();
  return {
    async stations(place) {
      const data = await dataset();
      return data.stations.map(station => ({...station, provider: 'bom', distanceKm: distanceKm(station, place)}))
        .filter(station => station.distanceKm <= 150).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 12);
    },
    async forecast({place, station, rows, signal}) {
      const data = await dataset(), metadata = data.dataset;
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (rows.some(row => row.date < metadata.coverageStart || row.date > metadata.coverageEnd)) {
        throw new Error(`The included Bureau tables cover ${metadata.coverageStart} through ${metadata.coverageEnd}. An updated app file is needed for other dates.`);
      }
      const port = data.stations.find(port => port.id === station.id);
      if (!port || port.timeZone !== station.timeZone) throw new Error('The Bureau station or time zone is unavailable.');
      const events = data.events.filter(event => event.stationId === port.id && event.at >= rows[0].startUtc && event.at < rows.at(-1).endUtc);
      if (!events.length) throw new Error('The Bureau tables have no predictions for these dates.');
      const forecast = {...makeForecast({place, point: station, rows, events, dataset: metadata})};
      forecast.engine = {runtime: 'Prepared official annual tide tables', provider: 'bom'};
      forecast.datum = port.datum;
      forecast.sources = [{...metadata, provider: australianProvider.name, stationId: port.id, stationName: port.name, sourceUrl: port.sourceUrl, retrievedAt: metadata.preparedAt}];
      forecast.official = {provider: australianProvider.name, bundled: true, year: metadata.year, retrievedAt: metadata.preparedAt};
      forecast.warnings = [{code: 'station-selection', message: 'Predictions are for the selected Bureau Standard Port. Not for navigation or safety decisions.'}];
      return forecast;
    }
  };
}
