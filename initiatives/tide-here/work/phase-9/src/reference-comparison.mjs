function compareType(tides, expected, type) {
  const actual = tides.filter(event => event.type === type).slice(0, expected.length);
  if (actual.length !== expected.length) throw new Error(`Expected ${expected.length} ${type} tides`);
  return expected.map(([at, height], index) => ({
    type,
    expectedAt: at,
    actualAt: actual[index].at,
    timeDifferenceMinutes: Math.abs(Date.parse(actual[index].at) - Date.parse(at)) / 60000,
    expectedHeightCm: height,
    actualHeightCm: actual[index].height,
    heightDifferenceCm: Math.abs(actual[index].height - height),
  }));
}

export function compareWithPyfes(tides, reference, {timeToleranceMinutes = 6, heightToleranceCm = 5} = {}) {
  const events = [
    ...compareType(tides, reference.highs, 'high'),
    ...compareType(tides, reference.lows, 'low'),
  ];
  const maxTimeDifferenceMinutes = Math.max(...events.map(event => event.timeDifferenceMinutes));
  const maxHeightDifferenceCm = Math.max(...events.map(event => event.heightDifferenceCm));
  return {
    sourceUrl: reference.sourceUrl,
    comparedEvents: events.length,
    timeToleranceMinutes,
    heightToleranceCm,
    maxTimeDifferenceMinutes,
    maxHeightDifferenceCm,
    passed: maxTimeDifferenceMinutes <= timeToleranceMinutes
      && maxHeightDifferenceCm <= heightToleranceCm,
    events,
  };
}
