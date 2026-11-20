self.onmessage = ({ data: { kind, thin, state, data, catalog } }) => {
  const stepMinutes = kind === "year" ? 15 : 5;
  if (kind === "night") {
    const samples = nightSamples(thin, state, data, catalog, stepMinutes);
    self.postMessage({ samples, stepMinutes, hours: significantHours(samples, stepMinutes) });
    return;
  }
  const nights = [];
  for (const doy of YEAR_SAMPLE_DAYS) {
    const samples = nightSamples(thin, { ...state, doy }, data, catalog, stepMinutes);
    nights.push(significantHours(samples, stepMinutes));
    self.postMessage({ dates: nights.length });
  }
  self.postMessage({ hours: yearHours(nights) });
};
