import { eventDisplayState } from '../../phase-4/src/astronomy.mjs';
import { FAILURE_MESSAGES } from '../../phase-5/src/resolve-forecast.mjs';

const STATE_ACTIONS = Object.freeze({
  'invalid-input': 'Edit the entry',
  'place-not-found': 'Edit and try again',
  'geocoder-unavailable': 'Retry place lookup',
  'coverage-unavailable': 'Try another supported coast',
  'coast-choice-required': 'Review alternative coasts',
  'tides-unavailable': 'Retry tide predictions',
  'astronomy-unavailable': 'Retry sun and moon',
  'no-event': 'No retry needed',
  'fixture-data': 'Test data only',
  'approximate-fallback': 'Use as an estimate only',
  'location-permission-denied': 'Try location again',
  'location-unavailable': 'Try location again'
});

const PAGE_FAILURE_MESSAGES = Object.freeze({
  ...FAILURE_MESSAGES,
  'fixture-data': 'Australian test-port results use synthetic fixture data, not official tide predictions.',
  'approximate-fallback': 'FES2022 is an approximate harmonic model; weather and storm surge are not included.',
  'location-permission-denied': 'Location access was not allowed. Allow location for this Site, then choose Show here again.',
  'location-unavailable': 'Your browser could not provide a location. Try Show here again, or enter a place or coordinates.'
});

const PROVIDER_LABELS = Object.freeze({
  noaa: 'NOAA',
  chs: 'CHS',
  'australia-standard-ports': 'Australian test port',
  fes2022: 'FES2022 approximate model'
});

export function providerLabel(provider, {official = false} = {}) {
  if (provider === 'australia-standard-ports') return official ? 'Bureau of Meteorology' : 'Australian test port';
  return PROVIDER_LABELS[provider] || String(provider || '').toUpperCase();
}

export function statePresentation(code) {
  if (!PAGE_FAILURE_MESSAGES[code] || !STATE_ACTIONS[code]) throw new RangeError(`Unknown page state: ${code}`);
  return Object.freeze({ code, message: PAGE_FAILURE_MESSAGES[code], action: STATE_ACTIONS[code] });
}

export function formatCoastTime(instant, timeZone) {
  if (!timeZone) throw new TypeError('A coast time zone is required');
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new RangeError(`Invalid event instant: ${instant}`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12'
  }).format(date);
}

export function coastDateLabel(localDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) throw new RangeError(`Invalid local date: ${localDate}`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${localDate}T12:00:00Z`));
}

function astronomyEvent(day, name, timeZone) {
  const state = eventDisplayState(day, name);
  if (state) return Object.freeze({ label: state.message, code: state.code });
  return Object.freeze({
    label: day[name].map((instant) => formatCoastTime(instant, timeZone)).join(', '),
    code: null
  });
}

export function dayViewModel(day, timeZone, currentInstant = new Date()) {
  const currentTime = new Date(currentInstant).getTime();
  if (!Number.isFinite(currentTime)) throw new RangeError(`Invalid current instant: ${currentInstant}`);
  return Object.freeze({
    date: day.date,
    label: coastDateLabel(day.date),
    tides: Object.freeze(day.tides.map((event) => Object.freeze({
      type: event.type === 'high' ? 'High tide' : 'Low tide',
      time: formatCoastTime(event.at, timeZone),
      height: `${event.height.toFixed(2)} ${event.unit}`,
      isPast: new Date(event.at).getTime() < currentTime
    }))),
    sunrise: astronomyEvent(day, 'sunrise', timeZone),
    sunset: astronomyEvent(day, 'sunset', timeZone),
    moonrise: astronomyEvent(day, 'moonrise', timeZone),
    moonset: astronomyEvent(day, 'moonset', timeZone),
    moonPhase: day.moonPhase?.name || 'Unavailable'
  });
}

export function forecastViewModel(forecast, currentInstant = new Date()) {
  if (!forecast?.input?.display || !forecast?.place?.name || !forecast?.coast?.name || !forecast?.station?.name || !forecast?.timeZone) {
    throw new TypeError('A complete normalized forecast is required');
  }
  const predictionSource = forecast.sources?.find((source) => source.provider === forecast.station.provider) ?? null;
  return Object.freeze({
    entered: forecast.input.display,
    resolved: forecast.place.name,
    coast: forecast.coast.name,
    station: forecast.station.name,
    stationKind: forecast.station.kind,
    provider: providerLabel(forecast.station.provider, {official: predictionSource?.official === true}),
    providerId: forecast.station.provider,
    datum: forecast.station.datum,
    source: predictionSource ? Object.freeze({...predictionSource}) : null,
    timeZone: forecast.timeZone,
    warnings: Object.freeze(forecast.warnings.map((warning) => statePresentation(warning.code))),
    days: Object.freeze(forecast.days.map((day) => dayViewModel(day, forecast.timeZone, currentInstant)))
  });
}
