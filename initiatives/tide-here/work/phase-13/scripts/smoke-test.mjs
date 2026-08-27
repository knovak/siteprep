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
    australianEvents += australia.days.flatMap(day => day.tides).length;
  }
  const fesRows = fiveLocalDays('2025-06-01T10:00:00Z', 'Europe/Paris');
  const fes = await postForecast({
    provider: 'fes2022',
    context: {
      input: {display: 'Brest fixture'},
      place: {name: 'Brest fixture', lat: 48.383, lon: -4.495},
      coast: {name: 'Brest Stage 4 validation point', distanceKm: 0},
    },
    station: {id: 'requested-model-point', latitude: 48.383, longitude: -4.495},
    timeZone: 'Europe/Paris',
    rows: fesRows,
  });
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
    fallbackEvents: fes.days.flatMap(day => day.tides).length,
    fallbackWarnings: fes.warnings.map(warning => warning.code),
    page: 'ok',
  }, null, 2));
}
