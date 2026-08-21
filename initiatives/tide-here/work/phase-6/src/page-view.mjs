import { eventDisplayState } from '../../phase-4/src/astronomy.mjs';
import { FAILURE_MESSAGES } from '../../phase-5/src/resolve-forecast.mjs';

const STATE_ACTIONS = Object.freeze({
  'invalid-input': 'Edit the entry',
  'place-not-found': 'Edit and try again',
  'geocoder-unavailable': 'Retry place lookup',
  'coverage-unavailable': 'Try a U.S. or Canadian coast',
  'coast-choice-required': 'Choose a coast below',
  'tides-unavailable': 'Retry tide predictions',
  'astronomy-unavailable': 'Retry sun and moon',
  'no-event': 'No retry needed'
});

export function statePresentation(code) {
  if (!FAILURE_MESSAGES[code] || !STATE_ACTIONS[code]) throw new RangeError(`Unknown page state: ${code}`);
  return Object.freeze({ code, message: FAILURE_MESSAGES[code], action: STATE_ACTIONS[code] });
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

export function dayViewModel(day, timeZone) {
  return Object.freeze({
    date: day.date,
    label: coastDateLabel(day.date),
    tides: Object.freeze(day.tides.map((event) => Object.freeze({
      type: event.type === 'high' ? 'High tide' : 'Low tide',
      time: formatCoastTime(event.at, timeZone),
      height: `${event.height.toFixed(2)} ${event.unit}`
    }))),
    sunrise: astronomyEvent(day, 'sunrise', timeZone),
    sunset: astronomyEvent(day, 'sunset', timeZone),
    moonrise: astronomyEvent(day, 'moonrise', timeZone),
    moonset: astronomyEvent(day, 'moonset', timeZone),
    moonPhase: day.moonPhase?.name || 'Unavailable'
  });
}

export function forecastViewModel(forecast) {
  if (!forecast?.input?.display || !forecast?.place?.name || !forecast?.coast?.name || !forecast?.station?.name || !forecast?.timeZone) {
    throw new TypeError('A complete normalized forecast is required');
  }
  return Object.freeze({
    entered: forecast.input.display,
    resolved: forecast.place.name,
    coast: forecast.coast.name,
    station: forecast.station.name,
    stationKind: forecast.station.kind,
    provider: forecast.station.provider.toUpperCase(),
    datum: forecast.station.datum,
    timeZone: forecast.timeZone,
    warnings: Object.freeze(forecast.warnings.map((warning) => statePresentation(warning.code))),
    days: Object.freeze(forecast.days.map((day) => dayViewModel(day, forecast.timeZone)))
  });
}
