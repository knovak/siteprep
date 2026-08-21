import { localDateTimeUtc } from '../../phase-1/src/day-model.mjs';
import * as SunCalc from '../vendor/suncalc-2.0.1.mjs';

export const ASTRONOMY_UNAVAILABLE = 'astronomy-unavailable';
export const NO_EVENT = 'no-event';
export const SUNCALC_VERSION = '2.0.1';

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent'
];

export const SUNCALC_SOURCE = Object.freeze({
  provider: 'suncalc',
  version: SUNCALC_VERSION,
  commit: 'bbc91f689ede3ff7173011947d435b3fb6c0485d',
  sourceUrl: 'https://github.com/mourner/suncalc/releases/tag/v2.0.1',
  licence: 'BSD-2-Clause',
  licenceUrl: 'https://github.com/mourner/suncalc/blob/v2.0.1/LICENSE',
  attribution: 'SunCalc 2.0.1 © 2026 Volodymyr Agafonkin'
});

function instantMilliseconds(value, label) {
  const milliseconds = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new RangeError(`Invalid ${label}: ${value}`);
  return milliseconds;
}

function assertCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new RangeError('Station latitude is out of range');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new RangeError('Station longitude is out of range');
}

function utcDayStarts(startUtc, endUtc, paddingDays = 0) {
  const start = instantMilliseconds(startUtc, 'row start');
  const end = instantMilliseconds(endUtc, 'row end');
  if (start >= end) throw new RangeError('Astronomy row bounds must be increasing');
  const first = Math.floor(start / DAY_MILLISECONDS) * DAY_MILLISECONDS - paddingDays * DAY_MILLISECONDS;
  const last = Math.floor((end - 1) / DAY_MILLISECONDS) * DAY_MILLISECONDS + paddingDays * DAY_MILLISECONDS;
  const values = [];
  for (let value = first; value <= last; value += DAY_MILLISECONDS) values.push(new Date(value));
  return values;
}

function uniqueInstantsInside(values, startUtc, endUtc) {
  const start = instantMilliseconds(startUtc, 'row start');
  const end = instantMilliseconds(endUtc, 'row end');
  return [...new Set(values
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value) && value >= start && value < end))]
    .sort((left, right) => left - right)
    .map((value) => new Date(value).toISOString());
}

function moonPhaseName(phase) {
  if (!Number.isFinite(phase)) throw new TypeError('SunCalc returned an invalid moon phase');
  return PHASE_NAMES[Math.round(phase * PHASE_NAMES.length) % PHASE_NAMES.length];
}

function eventState(events, positionAtNoon) {
  if (events.some((values) => values.length > 0)) return 'ordinary';
  return positionAtNoon.altitude >= 0 ? 'always-up' : 'always-down';
}

export function calculateAstronomyDay(row, { latitude, longitude, timeZone, calculator = SunCalc } = {}) {
  if (!row?.date || !row?.startUtc || !row?.endUtc) throw new TypeError('Astronomy requires a bounded local-day row');
  assertCoordinates(latitude, longitude);
  const localNoonUtc = localDateTimeUtc(row.date, timeZone, { hour: 12 });
  const sunriseCandidates = [];
  const sunsetCandidates = [];
  for (const day of utcDayStarts(row.startUtc, row.endUtc, 1)) {
    const times = calculator.getTimes(day, latitude, longitude);
    sunriseCandidates.push(times.sunrise);
    sunsetCandidates.push(times.sunset);
  }
  const moonriseCandidates = [];
  const moonsetCandidates = [];
  for (const day of utcDayStarts(row.startUtc, row.endUtc)) {
    const times = calculator.getMoonTimes(day, latitude, longitude);
    moonriseCandidates.push(times.rise);
    moonsetCandidates.push(times.set);
  }

  const sunrise = uniqueInstantsInside(sunriseCandidates, row.startUtc, row.endUtc);
  const sunset = uniqueInstantsInside(sunsetCandidates, row.startUtc, row.endUtc);
  const moonrise = uniqueInstantsInside(moonriseCandidates, row.startUtc, row.endUtc);
  const moonset = uniqueInstantsInside(moonsetCandidates, row.startUtc, row.endUtc);
  const noon = new Date(localNoonUtc);
  const illumination = calculator.getMoonIllumination(noon);

  return Object.freeze({
    sunrise: Object.freeze(sunrise),
    sunset: Object.freeze(sunset),
    moonrise: Object.freeze(moonrise),
    moonset: Object.freeze(moonset),
    moonPhase: Object.freeze({
      fraction: illumination.fraction,
      phase: illumination.phase,
      name: moonPhaseName(illumination.phase),
      at: localNoonUtc,
      isCurrent: false
    }),
    sunState: eventState([sunrise, sunset], calculator.getPosition(noon, latitude, longitude)),
    moonState: eventState([moonrise, moonset], calculator.getMoonPosition(noon, latitude, longitude)),
    astronomyState: 'available'
  });
}

export function eventDisplayState(day, eventName) {
  if (!['sunrise', 'sunset', 'moonrise', 'moonset'].includes(eventName)) throw new RangeError(`Unknown event: ${eventName}`);
  if (day?.astronomyState === 'unavailable') {
    return Object.freeze({ code: ASTRONOMY_UNAVAILABLE, message: 'unavailable' });
  }
  if (Array.isArray(day?.[eventName]) && day[eventName].length > 0) return null;
  return Object.freeze({
    code: NO_EVENT,
    message: eventName.endsWith('rise') ? 'does not rise' : 'does not set'
  });
}

function unavailableDay(day) {
  return Object.freeze({
    ...day,
    sunrise: Object.freeze([]),
    sunset: Object.freeze([]),
    moonrise: Object.freeze([]),
    moonset: Object.freeze([]),
    moonPhase: null,
    sunState: 'unavailable',
    moonState: 'unavailable',
    astronomyState: 'unavailable'
  });
}

export class Astronomy {
  constructor({ calculator = SunCalc, now = () => new Date() } = {}) {
    for (const method of ['getTimes', 'getPosition', 'getMoonTimes', 'getMoonPosition', 'getMoonIllumination']) {
      if (typeof calculator?.[method] !== 'function') throw new TypeError(`Astronomy calculator is missing ${method}`);
    }
    if (typeof now !== 'function') throw new TypeError('Astronomy now must be a function');
    this.calculator = calculator;
    this.now = now;
  }

  enrich({ forecast, rows, station, timeZone = forecast?.timeZone }) {
    if (!Array.isArray(forecast?.days) || !Array.isArray(forecast?.warnings) || !Array.isArray(forecast?.sources)) {
      throw new TypeError('Astronomy requires the normalized forecast shape');
    }
    if (!Array.isArray(rows) || rows.length !== forecast.days.length) throw new RangeError('Astronomy rows must match forecast days');
    const latitude = Number(station?.lat ?? station?.latitude);
    const longitude = Number(station?.lon ?? station?.longitude);
    const now = instantMilliseconds(this.now(), 'current instant');

    try {
      assertCoordinates(latitude, longitude);
      const days = rows.map((row, index) => {
        if (forecast.days[index]?.date !== row.date) throw new RangeError('Astronomy row date does not match forecast');
        const astronomy = calculateAstronomyDay(row, {
          latitude,
          longitude,
          timeZone,
          calculator: this.calculator
        });
        return Object.freeze({
          ...forecast.days[index],
          ...astronomy,
          moonPhase: Object.freeze({
            ...astronomy.moonPhase,
            isCurrent: now >= Date.parse(row.startUtc) && now < Date.parse(row.endUtc)
          })
        });
      });
      return Object.freeze({
        ...forecast,
        days: Object.freeze(days),
        sources: Object.freeze([...forecast.sources, SUNCALC_SOURCE]),
        warnings: Object.freeze([...forecast.warnings])
      });
    } catch {
      const warning = Object.freeze({
        code: ASTRONOMY_UNAVAILABLE,
        message: 'Sun and moon calculations are unavailable.'
      });
      return Object.freeze({
        ...forecast,
        days: Object.freeze(forecast.days.map(unavailableDay)),
        sources: Object.freeze([...forecast.sources, SUNCALC_SOURCE]),
        warnings: Object.freeze([
          ...forecast.warnings,
          ...(forecast.warnings.some((entry) => entry.code === ASTRONOMY_UNAVAILABLE) ? [] : [warning])
        ])
      });
    }
  }
}
