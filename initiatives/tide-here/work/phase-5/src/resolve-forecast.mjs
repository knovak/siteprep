import { fiveLocalDays } from '../../phase-1/src/day-model.mjs';
import { matchCoast } from '../../phase-2/src/coastal-match.mjs';
import { ASTRONOMY_UNAVAILABLE, NO_EVENT } from '../../phase-4/src/astronomy.mjs';
import { GEOCODER_UNAVAILABLE, INVALID_INPUT, PLACE_NOT_FOUND } from './geocoder.mjs';

export const COVERAGE_UNAVAILABLE = 'coverage-unavailable';
export const COAST_CHOICE_REQUIRED = 'coast-choice-required';
export const TIDES_UNAVAILABLE = 'tides-unavailable';

export const FAILURE_CODES = Object.freeze([
  INVALID_INPUT,
  PLACE_NOT_FOUND,
  GEOCODER_UNAVAILABLE,
  COVERAGE_UNAVAILABLE,
  COAST_CHOICE_REQUIRED,
  TIDES_UNAVAILABLE,
  ASTRONOMY_UNAVAILABLE,
  NO_EVENT
]);

export const FAILURE_MESSAGES = Object.freeze({
  [INVALID_INPUT]: 'Enter a place name or decimal coordinates such as 47.61, -122.33.',
  [PLACE_NOT_FOUND]: 'That place was not found. Check the spelling or enter coordinates.',
  [GEOCODER_UNAVAILABLE]: 'Place lookup is unavailable. Try again later.',
  [COVERAGE_UNAVAILABLE]: 'First-version tide coverage is available for configured U.S. and Canadian coasts.',
  [COAST_CHOICE_REQUIRED]: 'The closest coast is shown first; alternative coasts are available below the results.',
  [TIDES_UNAVAILABLE]: 'Tide predictions are unavailable; place and astronomy details remain available.',
  [ASTRONOMY_UNAVAILABLE]: 'Sun and moon calculations are unavailable; tide predictions remain available.',
  [NO_EVENT]: 'This event does not rise or set during the selected local day.'
});

function freezeResolution(value) {
  return Object.freeze({
    ...value,
    candidates: Object.freeze([...(value.candidates || [])])
  });
}

function placeForMatch(place) {
  return { latitude: place.lat, longitude: place.lon };
}

function coastForStation(station, distanceKm) {
  return Object.freeze({ name: station.name, distanceKm });
}

function stationCoordinates(station) {
  return {
    latitude: Number(station.latitude ?? station.lat),
    longitude: Number(station.longitude ?? station.lon)
  };
}

function sourceAwareForecast(forecast, geocoderSource) {
  if (!geocoderSource) return forecast;
  return Object.freeze({ ...forecast, sources: Object.freeze([geocoderSource, ...forecast.sources]) });
}

export class TideHereService {
  constructor({ geocoder, getStations, matchConfig, timeZoneLookup, tideProvider, astronomy, now = () => new Date() }) {
    if (typeof geocoder?.resolve !== 'function') throw new TypeError('TideHereService requires a Geocoder');
    if (typeof getStations !== 'function') throw new TypeError('TideHereService requires a station catalogue');
    if (typeof timeZoneLookup !== 'function') throw new TypeError('TideHereService requires a time-zone lookup');
    if (typeof tideProvider?.forecast !== 'function' || typeof astronomy?.enrich !== 'function') {
      throw new TypeError('TideHereService requires tide and astronomy adapters');
    }
    this.geocoder = geocoder;
    this.getStations = getStations;
    this.matchConfig = matchConfig;
    this.timeZoneLookup = timeZoneLookup;
    this.tideProvider = tideProvider;
    this.astronomy = astronomy;
    this.now = now;
  }

  async resolve(input) {
    const geocoded = await this.geocoder.resolve(input);
    if (!geocoded.ok) return freezeResolution({ ...geocoded, ok: false, candidates: [] });
    const stations = await this.getStations();
    const match = matchCoast(placeForMatch(geocoded.place), stations, this.matchConfig);
    const common = {
      input: geocoded.input,
      place: geocoded.place,
      geocoderSource: geocoded.source
    };
    if (match.status === COVERAGE_UNAVAILABLE) {
      return freezeResolution({
        ...common,
        ok: false,
        code: COVERAGE_UNAVAILABLE,
        candidates: [],
        supportedCountries: match.supportedCountries,
        nearestDistanceKm: match.nearestDistanceKm
      });
    }
    if (match.status === COAST_CHOICE_REQUIRED) {
      return freezeResolution({ ...common, ok: false, code: COAST_CHOICE_REQUIRED, candidates: match.candidates });
    }
    return freezeResolution({
      ...common,
      ok: true,
      code: null,
      coast: match.coast,
      station: match.station,
      candidates: []
    });
  }

  chosenStation(resolution, selected) {
    if (resolution.ok && resolution.station) return { station: resolution.station, coast: resolution.coast };
    if (resolution.code !== COAST_CHOICE_REQUIRED) return null;
    const station = resolution.candidates.find((candidate) => (
      candidate.id === selected?.id && candidate.provider === selected?.provider
    ));
    return station ? { station, coast: coastForStation(station, station.distanceKm) } : null;
  }

  async forecast(resolution, selectedStation = null) {
    const selection = this.chosenStation(resolution, selectedStation);
    if (!selection) return resolution;
    const coordinates = stationCoordinates(selection.station);
    const timeZone = await this.timeZoneLookup(coordinates.latitude, coordinates.longitude, selection.station);
    const rows = fiveLocalDays(this.now(), timeZone);
    const context = {
      input: resolution.input,
      place: resolution.place,
      coast: selection.coast
    };
    const tides = await this.tideProvider.forecast({
      context,
      station: selection.station,
      timeZone,
      rows
    });
    const withGeocoder = sourceAwareForecast(tides, resolution.geocoderSource);
    return this.astronomy.enrich({
      forecast: withGeocoder,
      rows,
      station: selection.station,
      timeZone
    });
  }
}
