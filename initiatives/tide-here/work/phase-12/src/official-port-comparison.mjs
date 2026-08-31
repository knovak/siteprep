function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid ${label}`);
  return number;
}

function percentile(values, proportion) {
  if (values.length === 0) throw new Error('Cannot calculate a percentile without values');
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * proportion) - 1)];
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function validateThresholds(thresholds) {
  const result = {
    minimumPairs: finite(thresholds?.minimumPairs, 'minimum pairs'),
    pairingWindowMinutes: finite(thresholds?.pairingWindowMinutes, 'pairing window'),
    p90TimeDifferenceMinutes: finite(thresholds?.p90TimeDifferenceMinutes, 'p90 time tolerance'),
    maximumTimeDifferenceMinutes: finite(thresholds?.maximumTimeDifferenceMinutes, 'maximum time tolerance'),
    maximumHeightResidualM: finite(thresholds?.maximumHeightResidualM, 'height tolerance'),
  };
  if (!Number.isInteger(result.minimumPairs) || Object.values(result).some(value => value <= 0)) {
    throw new Error('Official-port comparison thresholds must be positive');
  }
  return result;
}

function normalizedEvents(events, label) {
  if (!Array.isArray(events)) throw new Error(`${label} events are required`);
  return events.map(event => {
    if (!['high', 'low'].includes(event?.type) || !Number.isFinite(Date.parse(event.at))) {
      throw new Error(`Invalid ${label} event`);
    }
    return {
      type: event.type,
      at: event.at,
      height: finite(event.height, `${label} height`),
    };
  }).sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
}

function pairEvents(modelEvents, officialEvents, pairingWindowMinutes) {
  const used = new Set();
  const pairs = [];
  for (const official of officialEvents) {
    let best = null;
    for (let index = 0; index < modelEvents.length; index += 1) {
      const model = modelEvents[index];
      if (used.has(index) || model.type !== official.type) continue;
      const difference = Math.abs(Date.parse(model.at) - Date.parse(official.at)) / 60000;
      if (difference <= pairingWindowMinutes && (!best || difference < best.timeDifferenceMinutes)) {
        best = {index, model, official, timeDifferenceMinutes: difference};
      }
    }
    if (best) {
      used.add(best.index);
      pairs.push(best);
    }
  }
  return pairs;
}

function rounded(value) {
  return Number(value.toFixed(6));
}

export function compareWithOfficialPort({modelEvents, officialEvents, thresholds}) {
  const limits = validateThresholds(thresholds);
  const model = normalizedEvents(modelEvents, 'model');
  const official = normalizedEvents(officialEvents, 'official');
  const pairs = pairEvents(model, official, limits.pairingWindowMinutes);
  if (pairs.length === 0) throw new Error('No comparable official-port extrema were paired');

  // FES heights are relative to mean sea level while Bureau tables use LAT.
  // Fit one constant datum offset, then compare only the tidal shape.
  const datumOffsetM = median(pairs.map(pair => pair.official.height - pair.model.height));
  const compared = pairs.map(pair => ({
    type: pair.official.type,
    modelAt: pair.model.at,
    officialAt: pair.official.at,
    timeDifferenceMinutes: rounded(pair.timeDifferenceMinutes),
    modelHeightM: rounded(pair.model.height),
    officialHeightM: rounded(pair.official.height),
    heightResidualM: rounded(Math.abs(pair.model.height + datumOffsetM - pair.official.height)),
  }));
  const times = compared.map(pair => pair.timeDifferenceMinutes);
  const heights = compared.map(pair => pair.heightResidualM);
  const metrics = {
    pairedEvents: compared.length,
    datumOffsetM: rounded(datumOffsetM),
    p90TimeDifferenceMinutes: rounded(percentile(times, 0.9)),
    maximumTimeDifferenceMinutes: rounded(Math.max(...times)),
    p90HeightResidualM: rounded(percentile(heights, 0.9)),
    maximumHeightResidualM: rounded(Math.max(...heights)),
  };
  return {
    thresholds: limits,
    metrics,
    passed: metrics.pairedEvents >= limits.minimumPairs
      && metrics.p90TimeDifferenceMinutes <= limits.p90TimeDifferenceMinutes
      && metrics.maximumTimeDifferenceMinutes <= limits.maximumTimeDifferenceMinutes
      && metrics.maximumHeightResidualM <= limits.maximumHeightResidualM,
    events: compared,
  };
}
