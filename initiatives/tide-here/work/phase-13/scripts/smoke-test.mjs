import {fiveLocalDays} from '../../phase-1/src/day-model.mjs';

const baseUrl = process.argv[2]?.replace(/\/$/, '');
const token = process.env.INIT_TOKEN;
if (!baseUrl || !token) {
  console.error('Usage: INIT_TOKEN=<secret> node smoke-test.mjs <base-url>');
  process.exitCode = 2;
} else {
  const request = async (path, options = {}, expected = 200) => {
    const response = await fetch(`${baseUrl}${path}`, options);
    const body = await response.json().catch(() => null);
    if (response.status !== expected) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
    return body;
  };
  const initialize = () => request('/init', {
    method: 'POST',
    headers: {authorization: `Bearer ${token}`},
  });
  const postForecast = (body, expected = 200) => request('/forecast', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  }, expected);
  const first = await initialize();
  const second = await initialize();
  const health = await request('/health');
  const providers = await request('/providers');

  for (const provider of ['noaa', 'chs']) {
    const descriptor = providers.providers.find(item => item.id === provider);
    const catalogue = await fetch(descriptor.catalogueUrl);
    if (!catalogue.ok) throw new Error(`${provider} catalogue returned ${catalogue.status}`);
    const direct = await postForecast({provider}, 409);
    if (direct.code !== 'direct-provider-required') throw new Error(`${provider} server boundary changed`);
  }

  const catalogue = await request('/stations?provider=australia-standard-ports');
  if (catalogue.stations.length !== 76) throw new Error(`Australian catalogue has ${catalogue.stations.length} stations, expected 76`);
  let australianEvents = 0;
  for (const station of catalogue.stations) {
    const australia = await postForecast({
      provider: 'australia-standard-ports',
      context: {
        input: {display: station.name},
        place: {name: station.name, lat: station.latitude, lon: station.longitude},
        coast: {name: station.name, distanceKm: 0},
      },
      station: {id: station.id},
      timeZone: station.timeZone,
      rows: fiveLocalDays('2026-08-27T12:00:00Z', station.timeZone),
    });
    if (australia.warnings.length !== 0) throw new Error(`${station.id} returned an unexpected warning`);
    if (australia.sources.length !== 1 || !australia.sources[0].official || australia.sources[0].approximate) {
      throw new Error(`${station.id} did not return one official, exact Bureau source`);
    }
    if (!australia.sources[0].sourceUrl.includes('bom.gov.au/ntc/IDO59001/')) {
      throw new Error(`${station.id} did not return its Bureau annual-table PDF`);
    }
    australianEvents += australia.days.flatMap(day => day.tides).length;
  }
  const modelPoint = await request('/resolve', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({provider: 'fes2022', latitude: 53.27, longitude: -9.05}),
  });
  if (modelPoint.station.id !== 'fes2022-galway') throw new Error('FES2022 Galway point did not resolve');
  const fesRows = fiveLocalDays('2026-08-27T12:00:00Z', modelPoint.station.timeZone);
  const fes = await postForecast({
    provider: 'fes2022',
    context: {
      input: {display: 'Galway'},
      place: {name: 'Galway, Ireland', lat: 53.27, lon: -9.05},
      coast: modelPoint.coast,
    },
    station: modelPoint.station,
    timeZone: modelPoint.station.timeZone,
    rows: fesRows,
  });
  if (fes.warnings.length !== 1 || fes.warnings[0].code !== 'approximate-fallback') {
    throw new Error('FES2022 result did not return only the approximate safety warning');
  }
  if (fes.sources.length !== 1 || fes.sources[0].dataClass !== 'licensed-source'
      || fes.sources[0].official || !fes.sources[0].approximate
      || !fes.sources[0].sourceUrl.includes('doi.org/10.24400/527896/A01-2024.004')
      || !fes.sources[0].licenceUrl.includes('License_Aviso.pdf')) {
    throw new Error('FES2022 result did not carry its licensed approximate provenance');
  }
  const reportedGaps = [];
  for (const location of [
    {name: 'Cooktown', latitude: -15.4667, longitude: 145.2833, stationId: 'fes2022-cooktown'},
    {name: 'Gibraltar', latitude: 36.1285933, longitude: -5.3474761, stationId: 'fes2022-gibraltar'},
  ]) {
    const resolution = await request('/resolve', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({provider: 'fes2022', latitude: location.latitude, longitude: location.longitude}),
    });
    if (resolution.station.id !== location.stationId) throw new Error(`FES2022 ${location.name} point did not resolve`);
    const forecast = await postForecast({
      provider: 'fes2022',
      context: {
        input: {display: location.name},
        place: {name: location.name, lat: location.latitude, lon: location.longitude},
        coast: resolution.coast,
      },
      station: resolution.station,
      timeZone: resolution.station.timeZone,
      rows: fiveLocalDays('2026-08-27T12:00:00Z', resolution.station.timeZone),
    });
    if (!forecast.days.flatMap(day => day.tides).length) throw new Error(`FES2022 ${location.name} returned no tides`);
    reportedGaps.push({name: location.name, station: resolution.station.id, events: forecast.days.flatMap(day => day.tides).length});
  }
  const page = await fetch(`${baseUrl}/phase-6/index.html`);
  if (!page.ok || !(await page.text()).includes('Tide Here')) throw new Error('Tide Here page smoke check failed');

  const writeCount = result => ['created', 'updated'].reduce(
    (sum, key) => sum + Object.values(result).reduce(
      (inner, section) => inner + (section?.[key]?.length ?? 0),
      0,
    ),
    0,
  );
  console.log(JSON.stringify({
    initializedStage: first.stage,
    repeatInitializationWrites: writeCount(second),
    registry: health.registry,
    providers: providers.providers.map(provider => `${provider.id}:${provider.status}`),
    australianStations: catalogue.stations.length,
    australianEvents,
    fallbackPoint: modelPoint.station.id,
    fallbackEvents: fes.days.flatMap(day => day.tides).length,
    fallbackWarnings: fes.warnings.map(warning => warning.code),
    reportedGaps,
    page: 'ok',
  }, null, 2));
}
