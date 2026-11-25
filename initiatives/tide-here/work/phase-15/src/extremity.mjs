// Ranks a predicted tide height against every predicted tide of the same type
// at the same station in the same calendar year. Shared by the browser and the
// stored-provider gateway, so it has no DOM, network or storage dependencies.
// See ../README.md.

export const EXTREMITY_SCHEMA = 'tide-here/extremity/v1';
export const EXTREMITY_PROBABILITIES = Object.freeze([
  0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 0.75, 0.8, 0.9, 0.95, 0.98, 0.99
]);
// "Among the highest/lowest N%": thin underline at 20%, thick at 5%.
export const EXTREMITY_LEVELS = Object.freeze({ notable: 20, exceptional: 5 });
export const MINIMUM_EVENTS = 100;
export const NOTABLE = 'notable';
export const EXCEPTIONAL = 'exceptional';

const EPSILON = 1e-9;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function quantiles(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return EXTREMITY_PROBABILITIES.map((probability) => (
    sorted[Math.min(sorted.length - 1, Math.floor(probability * sorted.length))]
  ));
}

function roundHeight(value) {
  return Math.round(value * 1000) / 1000;
}

// Classifies a chronological series of extrema whose types the source does not
// label (CHS). Each value is compared with its neighbours, so a missing event
// mid-year affects only the events beside it, unlike strict alternation.
export function classifyExtrema(values) {
  if (!Array.isArray(values)) throw new TypeError('Extrema must be an array');
  return values.map((value, index) => {
    const neighbours = [values[index - 1], values[index + 1]].filter(finite);
    if (!finite(value) || neighbours.length === 0) return null;
    const mean = neighbours.reduce((sum, item) => sum + item, 0) / neighbours.length;
    if (value === mean) return null;
    return value > mean ? 'high' : 'low';
  });
}

// Builds the record from one year of events: [{type: 'high'|'low', height}].
export function buildExtremityRecord({ provider, stationId, datum, unit = 'm', year, events, computedAt }) {
  if (!provider || !stationId || !datum || !unit) throw new TypeError('An extremity record needs provider, station, datum and unit');
  if (!Number.isInteger(year)) throw new TypeError('An extremity record needs a calendar year');
  if (!Array.isArray(events)) throw new TypeError('An extremity record needs events');
  const highs = events.filter((event) => event?.type === 'high' && finite(event.height)).map((event) => event.height);
  const lows = events.filter((event) => event?.type === 'low' && finite(event.height)).map((event) => event.height);
  if (highs.length < MINIMUM_EVENTS || lows.length < MINIMUM_EVENTS) {
    const error = new RangeError(`An extremity record needs at least ${MINIMUM_EVENTS} high and low tides`);
    error.code = 'extremity-insufficient-events';
    throw error;
  }
  return Object.freeze({
    schema: EXTREMITY_SCHEMA,
    provider: String(provider),
    stationId: String(stationId),
    datum: String(datum),
    unit: String(unit),
    year,
    computedAt: new Date(computedAt ?? Date.now()).toISOString(),
    probabilities: EXTREMITY_PROBABILITIES,
    high: Object.freeze(quantiles(highs).map(roundHeight)),
    low: Object.freeze(quantiles(lows).map(roundHeight)),
    highCount: highs.length,
    lowCount: lows.length
  });
}

function sameProbabilities(values) {
  return Array.isArray(values)
    && values.length === EXTREMITY_PROBABILITIES.length
    && values.every((value, index) => value === EXTREMITY_PROBABILITIES[index]);
}

function ascending(values) {
  return Array.isArray(values)
    && values.length === EXTREMITY_PROBABILITIES.length
    && values.every((value, index) => finite(value) && (index === 0 || value >= values[index - 1]));
}

// A record describes only the exact series it was computed from.
export function recordMatches(record, { provider, stationId, datum, unit = 'm', year }) {
  return Boolean(record
    && record.schema === EXTREMITY_SCHEMA
    && record.provider === provider
    && record.stationId === String(stationId)
    && record.datum === datum
    && record.unit === unit
    && record.year === year
    && sameProbabilities(record.probabilities)
    && ascending(record.high)
    && ascending(record.low)
    && Number.isInteger(record.highCount) && record.highCount >= MINIMUM_EVENTS
    && Number.isInteger(record.lowCount) && record.lowCount >= MINIMUM_EVENTS);
}

function quantileAt(record, kind, probability) {
  return record[kind][EXTREMITY_PROBABILITIES.indexOf(probability)];
}

// Fraction of the year's same-type tides below `height`, interpolated linearly
// between quantiles and clamped at the outermost ones.
function cumulativeShare(values, height) {
  const probabilities = EXTREMITY_PROBABILITIES;
  if (height <= values[0]) return probabilities[0];
  if (height >= values.at(-1)) return probabilities.at(-1);
  for (let index = 1; index < values.length; index += 1) {
    if (height <= values[index]) {
      const span = values[index] - values[index - 1];
      const fraction = span > 0 ? (height - values[index - 1]) / span : 1;
      return probabilities[index - 1] + fraction * (probabilities[index] - probabilities[index - 1]);
    }
  }
  return 1;
}

// Returns null for a height that is not marked, otherwise its level and N.
export function rankTide(record, { type, height }) {
  if (!record || !finite(height) || !['high', 'low'].includes(type)) return null;
  const high = type === 'high';
  const values = high ? record.high : record.low;
  const notableLine = quantileAt(record, type, high ? 0.8 : 0.2);
  const exceptionalLine = quantileAt(record, type, high ? 0.95 : 0.05);
  const notable = high ? height >= notableLine : height <= notableLine;
  if (!notable) return null;
  const exceptional = high ? height >= exceptionalLine : height <= exceptionalLine;
  const share = cumulativeShare(values, height);
  const asExtreme = high ? 1 - share : share;
  const level = exceptional ? EXCEPTIONAL : NOTABLE;
  const ceiling = EXTREMITY_LEVELS[level];
  const top = Math.min(ceiling, Math.max(1, Math.ceil(100 * asExtreme - EPSILON)));
  return Object.freeze({ type, level, top, count: high ? record.highCount : record.lowCount, year: record.year });
}

export function extremityHeadline(rank, height) {
  return `${rank.type === 'high' ? 'Particularly high' : 'Particularly low'} · ${height}`;
}

export function extremitySentence(rank, { modelPoint = false } = {}) {
  const where = modelPoint ? 'at this model point' : 'here';
  const extreme = rank.type === 'high' ? 'highest' : 'lowest';
  return `Among the ${extreme} ${rank.top}% of ${rank.year}'s ${rank.type} tides ${where} (${rank.count} predicted ${rank.type} tides in ${rank.year}).`;
}

export const EXTREMITY_CAVEAT = 'Astronomical prediction only: wind, pressure and storm surge can make the water higher or lower.';
