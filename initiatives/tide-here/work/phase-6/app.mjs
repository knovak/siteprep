import { resolveTimeZone } from '../phase-1/src/day-model.mjs';
import { fetchStationCatalogues, normalizeStationCatalogues, readThroughStationCatalogue } from '../phase-2/src/station-catalogue.mjs';
import { fetchStationDetails, readThroughStationDetails } from '../phase-2/src/station-details.mjs';
import { TIDES_UNAVAILABLE, TideProvider } from '../phase-3/src/tide-provider.mjs';
import { ASTRONOMY_UNAVAILABLE, Astronomy } from '../phase-4/src/astronomy.mjs';
import { Geocoder, GEOCODER_UNAVAILABLE, INVALID_INPUT, PLACE_NOT_FOUND, parsePlaceInput } from '../phase-5/src/geocoder.mjs';
import { COAST_CHOICE_REQUIRED, TideHereService } from '../phase-5/src/resolve-forecast.mjs';
import { ForecastCache, LocalHistory } from '../phase-7/src/local-data.mjs';
import { forecastViewModel, providerLabel, statePresentation } from './src/page-view.mjs';
import { AUSTRALIAN_PROVIDER_ID, StoredTideClient } from './src/stored-tide-client.mjs';

const $ = (selector) => document.querySelector(selector);
const fixtureMode = new URLSearchParams(location.search).get('fixture') === '1';
const forcedState = new URLSearchParams(location.search).get('state');
const fixedNow = new Date('2026-08-20T13:00:00.000Z');
const now = () => fixtureMode ? fixedNow : new Date();
const LOCATION_PERMISSION_DENIED = 'location-permission-denied';
const LOCATION_UNAVAILABLE = 'location-unavailable';

async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

const [providerConfig, geocoderConfig, catalogueFixture, timeZoneDataset, noaaFixture, chsFixture, australiaCatalogueFixture] = await Promise.all([
  json('../phase-2/data/provider-config.json'),
  json('../phase-5/data/geocoder-config.json'),
  json('../phase-2/data/catalogue-slices.fixture.json'),
  json('../phase-1/data/time-zones.fixture.geojson'),
  json('../phase-0/fixtures/noaa-seattle-hilo.json'),
  json('../phase-0/fixtures/chs-halifax-hilo.json'),
  json('./data/australia-stations.fixture.json')
]);

const fixtureStations = normalizeStationCatalogues(catalogueFixture, providerConfig);
const history = new LocalHistory({ storage: localStorage, now });
const forecastCache = new ForecastCache({ storage: localStorage, now });
const stationDetailPromises = new Map();

async function stationDetails(station) {
  if (station.timeZone) return station;
  if (fixtureMode) {
    return Object.freeze({
      ...station,
      timeZone: resolveTimeZone(station.latitude, station.longitude, timeZoneDataset)
    });
  }
  const key = `${station.provider}:${station.id}`;
  if (!stationDetailPromises.has(key)) {
    stationDetailPromises.set(key, readThroughStationDetails({
      storage: localStorage,
      station,
      now: now().getTime(),
      ttlMs: providerConfig.catalogueCacheTtlMs,
      fetchDetails: () => fetchStationDetails({ station, config: providerConfig, fetchImpl: fetch.bind(globalThis) })
    }).then((result) => result.station));
  }
  return stationDetailPromises.get(key);
}

function resolutionWithStationDetails(resolution, originalStation, detailedStation) {
  if (resolution.ok) return Object.freeze({ ...resolution, station: detailedStation });
  return Object.freeze({
    ...resolution,
    candidates: Object.freeze(resolution.candidates.map((candidate) => (
      candidate.provider === originalStation.provider && candidate.id === originalStation.id
        ? detailedStation
        : candidate
    )))
  });
}

function fixturePlace(input) {
  const parsed = parsePlaceInput(input);
  if (!parsed.ok) return parsed;
  if (parsed.kind === 'coordinates') {
    return { name: `${parsed.latitude.toFixed(5)}, ${parsed.longitude.toFixed(5)}`, lat: parsed.latitude, lon: parsed.longitude };
  }
  const key = parsed.query.toLocaleLowerCase('en');
  if (key === 'missing') return { code: PLACE_NOT_FOUND };
  if (key === 'unavailable') return { code: GEOCODER_UNAVAILABLE };
  if (key === 'denver') return { name: 'Denver, Colorado, United States', lat: 39.7392, lon: -104.9903 };
  if (key === 'bainbridge') return { name: 'Bainbridge Island, Washington, United States', lat: 47.60835, lon: -122.5125 };
  if (key === 'halifax') return { name: 'Halifax, Nova Scotia, Canada', lat: 44.648618, lon: -63.5859487 };
  if (key === 'sydney') return { name: 'Sydney, New South Wales, Australia', lat: -33.8688, lon: 151.2093 };
  return { name: 'Seattle, Washington, United States', lat: 47.6062, lon: -122.3321 };
}

const fixtureGeocoder = {
  async resolve(input) {
    const parsed = parsePlaceInput(input);
    if (!parsed.ok) return parsed;
    const place = fixturePlace(input);
    if (place.code) return Object.freeze({ ok: false, code: place.code, input: { display: input } });
    return Object.freeze({
      ok: true,
      code: null,
      input: Object.freeze({ display: input }),
      place: Object.freeze(place),
      source: Object.freeze({ provider: 'recorded-geocoder', attribution: 'Recorded OpenStreetMap validation fixture' })
    });
  }
};

function fixtureTideFetch(url) {
  const unavailable = forcedState === 'tides-unavailable';
  const payload = String(url).includes('tidesandcurrents.noaa.gov') ? noaaFixture : chsFixture;
  return Promise.resolve({
    ok: !unavailable,
    status: unavailable ? 503 : 200,
    async json() { return payload; }
  });
}

const unavailableAstronomy = {
  enrich({ forecast }) {
    return Object.freeze({
      ...forecast,
      days: Object.freeze(forecast.days.map((day) => Object.freeze({
        ...day,
        sunrise: Object.freeze([]),
        sunset: Object.freeze([]),
        moonrise: Object.freeze([]),
        moonset: Object.freeze([]),
        moonPhase: null,
        astronomyState: 'unavailable'
      }))),
      warnings: Object.freeze([...forecast.warnings, Object.freeze({ code: ASTRONOMY_UNAVAILABLE, message: 'Sun and moon calculations are unavailable.' })])
    });
  }
};

const geocoder = fixtureMode
  ? fixtureGeocoder
  : new Geocoder({ config: geocoderConfig, fetchImpl: fetch.bind(globalThis), storage: localStorage });
const astronomy = forcedState === 'astronomy-unavailable'
  ? unavailableAstronomy
  : new Astronomy({ now });
const directTideProvider = new TideProvider({
  config: providerConfig,
  fetchImpl: fixtureMode ? fixtureTideFetch : fetch.bind(globalThis),
  now
});
const storedTideClient = new StoredTideClient({
  fetchImpl: fetch.bind(globalThis),
  stationFixtures: fixtureMode ? australiaCatalogueFixture.stations : null,
});
const tideProvider = {
  forecast(request) {
    return request.station.provider === AUSTRALIAN_PROVIDER_ID
      ? storedTideClient.forecast(request)
      : directTideProvider.forecast(request);
  }
};
const service = new TideHereService({
  geocoder,
  getStations: async () => {
    const direct = (await readThroughStationCatalogue({
      storage: localStorage,
      now: now().getTime(),
      ttlMs: providerConfig.catalogueCacheTtlMs,
      fetchCatalogue: fixtureMode
        ? async () => fixtureStations
        : () => fetchStationCatalogues({ config: providerConfig, fetchImpl: fetch.bind(globalThis) })
    })).stations;
    const australian = await storedTideClient.stations().catch(() => []);
    return [...direct, ...australian];
  },
  matchConfig: providerConfig.match,
  timeZoneLookup: async (_latitude, _longitude, station) => (await stationDetails(station)).timeZone,
  tideProvider,
  astronomy,
  now
});

function hideOutput() {
  $('#state-panel').hidden = true;
  $('#chooser').hidden = true;
  $('#chooser').removeAttribute('open');
  $('#result').hidden = true;
}

function showState(code, { focus = true, actionable = true } = {}) {
  const state = statePresentation(code);
  $('#state-code').textContent = state.code.replaceAll('-', ' ');
  $('#state-message').textContent = state.message;
  $('#state-action').textContent = state.action;
  $('#state-action').hidden = !actionable;
  $('#state-panel').dataset.code = code;
  $('#state-panel').hidden = false;
  if (focus) $('#state-panel').focus();
}

function svgElement(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function renderMap(resolution) {
  const points = [
    { name: 'Your place', latitude: resolution.place.lat, longitude: resolution.place.lon, place: true },
    ...resolution.candidates
  ];
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const bounds = {
    minLat: Math.min(...latitudes), maxLat: Math.max(...latitudes),
    minLon: Math.min(...longitudes), maxLon: Math.max(...longitudes)
  };
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, .025);
  const lonSpan = Math.max(bounds.maxLon - bounds.minLon, .025);
  const group = $('#map-points');
  group.replaceChildren(...points.flatMap((point, index) => {
    const x = 45 + ((point.longitude - bounds.minLon) / lonSpan) * 330;
    const y = 215 - ((point.latitude - bounds.minLat) / latSpan) * 170;
    const marker = svgElement('circle', { cx: x, cy: y, r: point.place ? 9 : 7, class: point.place ? 'map-place' : 'map-station' });
    marker.append(svgElement('title'));
    marker.firstChild.textContent = point.place ? 'Your entered place' : `${index}. ${point.name}`;
    const label = svgElement('text', { x: x + 12, y: y + 5, class: 'map-label' });
    label.textContent = point.place ? 'You' : String(index);
    return [marker, label];
  }));
}

function sameStation(first, second) {
  return first?.id === second?.id && first?.provider === second?.provider;
}

function showAlternativeCoasts(resolution, selectedStation) {
  const nearestIsSelected = sameStation(resolution.candidates[0], selectedStation);
  $('#chooser-place').textContent = nearestIsSelected
    ? `Showing the closest coast to ${resolution.place.name}. Choose a different coast if it fits your location better.`
    : `Showing ${selectedStation.name} for ${resolution.place.name}. Choose a different coast if it fits your location better.`;
  const alternatives = resolution.candidates.filter((candidate) => !sameStation(candidate, selectedStation));
  $('#candidate-list').replaceChildren(...alternatives.map((candidate) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'candidate';
    const name = document.createElement('strong');
    name.textContent = candidate.name;
    const distance = document.createElement('small');
    distance.textContent = `${candidate.distanceKm.toFixed(1)} km · ${providerLabel(candidate.provider)}`;
    button.append(name, distance);
    button.addEventListener('click', () => {
      void loadForecast(resolution, candidate).catch(() => showState(TIDES_UNAVAILABLE));
    });
    return button;
  }));
  renderMap(resolution);
  $('#chooser').removeAttribute('open');
  $('#chooser').hidden = false;
}

function textNode(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function updateHistoryCount() {
  const count = history.read().length;
  $('#show-history').textContent = `Show local history${count ? ` (${count})` : ''}`;
  return count;
}

function renderHistory() {
  const entries = [...history.read()].reverse();
  $('#history-list').replaceChildren(...entries.map((entry) => {
    const article = document.createElement('article');
    article.className = 'history-entry';
    const response = entry.response;
    const recordedAt = new Intl.DateTimeFormat('en-US', {
      timeZone: response.timeZone,
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(entry.recordedAt));
    article.append(
      textNode('h3', response.input.display),
      textNode('p', `${recordedAt} ${response.timeZone} · ${response.coast.name} · ${response.station.provider.toUpperCase()}`),
      textNode('p', response.warnings.length
        ? `Warnings: ${response.warnings.map((warning) => warning.code).join(', ')}`
        : 'No warnings')
    );
    const details = document.createElement('details');
    details.append(textNode('summary', 'Complete response'));
    const raw = textNode('pre', JSON.stringify(response, null, 2));
    details.append(raw);
    article.append(details);
    return article;
  }));
  $('#history-empty').hidden = entries.length > 0;
  $('#download-history').disabled = entries.length === 0;
  $('#clear-history').disabled = entries.length === 0;
  updateHistoryCount();
}

function openHistory() {
  renderHistory();
  $('#history-panel').hidden = false;
  $('#history-panel').focus();
}

function downloadHistory() {
  const url = URL.createObjectURL(new Blob([history.downloadText()], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tide-here-history.json';
  link.click();
  URL.revokeObjectURL(url);
  $('#history-status').textContent = 'History downloaded. It was not sent anywhere.';
}

function eventGroup(entries) {
  const section = document.createElement('section');
  section.className = 'event-group';
  const list = document.createElement('ul');
  if (!entries.length) list.append(textNode('li', 'No tide event in this recorded window', 'empty'));
  for (const entry of entries) {
    const item = document.createElement('li');
    item.className = entry.isPast ? 'past' : 'future';
    item.append(textNode('span', `${entry.type} · ${entry.time}`, 'tide-label'), textNode('span', entry.height, 'height'));
    list.append(item);
  }
  section.append(list);
  return section;
}

function astronomyGroup(day) {
  const details = document.createElement('details');
  details.className = 'astronomy-details';
  details.append(textNode('summary', `Sun and moon · Moonrise ${day.moonrise.label}`));
  const pairs = document.createElement('div');
  pairs.className = 'event-pair astronomy-content';
  for (const [label, event] of [
    ['Sunrise', day.sunrise], ['Sunset', day.sunset],
    ['Moonrise', day.moonrise], ['Moonset', day.moonset], ['Moon phase', { label: day.moonPhase }]
  ]) {
    const row = document.createElement('p');
    row.append(textNode('strong', label), textNode('span', event.label));
    if (event.code) row.dataset.code = event.code;
    pairs.append(row);
  }
  details.append(pairs);
  return details;
}

function dayCard(day, index) {
  const article = document.createElement('article');
  article.className = `day-card${index === 0 ? ' current' : ''}`;
  article.dataset.date = day.date;
  article.append(textNode('h2', `${index === 0 ? 'Today · ' : ''}${day.label}`));
  article.append(eventGroup(day.tides), astronomyGroup(day));
  return article;
}

function forceNoEvent(forecast) {
  if (forcedState !== 'no-event') return forecast;
  const days = forecast.days.map((day, index) => index === 0
    ? Object.freeze({ ...day, moonrise: Object.freeze([]), moonset: Object.freeze([]), astronomyState: 'available' })
    : day);
  return Object.freeze({ ...forecast, days: Object.freeze(days) });
}

function showForecast(forecast) {
  const model = forecastViewModel(forceNoEvent(forecast), now());
  $('#entered-name').textContent = model.entered;
  $('#resolved-name').textContent = model.resolved;
  $('#coast-name').textContent = model.coast;
  $('#station-name').textContent = model.station;
  $('#station-kind').textContent = `${model.provider} ${model.stationKind} station`;
  $('#zone-name').textContent = model.timeZone;
  const sourceLead = model.source?.dataClass === 'test-fixture'
    ? `${model.provider} synthetic fixture`
    : `${model.provider} predictions`;
  $('#source-copy').textContent = `${sourceLead} · ${model.stationKind} station · heights in metres relative to ${model.datum}. Times are formatted explicitly in ${model.timeZone}.`;
  $('#warnings').replaceChildren(...model.warnings.map((warning) => {
    const box = document.createElement('div');
    box.className = 'warning';
    box.dataset.code = warning.code;
    box.append(textNode('strong', warning.message), textNode('span', warning.action));
    return box;
  }));
  $('#day-cards').replaceChildren(...model.days.map(dayCard));
  $('#result').hidden = false;
  if (model.warnings.length) showState(model.warnings[0].code, {
    focus: false,
    actionable: model.warnings[0].code !== 'fixture-data'
  });
  else if (forcedState === 'no-event') showState('no-event', { focus: false, actionable: false });
  else $('#state-panel').hidden = true;
  $('#result').scrollIntoView({ block: 'start', behavior: 'instant' });
}

async function loadForecast(resolution, station = null) {
  const selection = service.chosenStation(resolution, station);
  const detailedStation = await stationDetails(selection.station);
  const preparedResolution = resolutionWithStationDetails(resolution, selection.station, detailedStation);
  const timeZone = detailedStation.timeZone;
  const cacheContext = {
    input: resolution.input.display,
    station: detailedStation,
    timeZone,
    now: now()
  };
  const cached = forcedState ? null : await forecastCache.read(cacheContext);
  const result = cached || await service.forecast(preparedResolution, resolution.ok ? null : detailedStation);
  if (!cached && !forcedState) await forecastCache.write(cacheContext, result);
  history.append(result);
  updateHistoryCount();
  showForecast(result);
  if (resolution.code === COAST_CHOICE_REQUIRED) showAlternativeCoasts(resolution, detailedStation);
}

async function submit() {
  hideOutput();
  try {
    const resolution = await service.resolve($('#place').value);
    if (resolution.code === COAST_CHOICE_REQUIRED) return await loadForecast(resolution, resolution.candidates[0]);
    if (!resolution.ok) return showState(resolution.code);
    return await loadForecast(resolution);
  } catch {
    return showState(TIDES_UNAVAILABLE);
  }
}

function browserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(Object.freeze({ code: 0 }));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 300_000,
      timeout: 10_000
    });
  });
}

async function showHere() {
  const button = $('#show-here');
  button.disabled = true;
  button.textContent = 'Finding you…';
  try {
    const position = await browserPosition();
    const { latitude, longitude } = position.coords || {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw Object.freeze({ code: 0 });
    $('#place').value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    await submit();
  } catch (error) {
    showState(error?.code === 1 ? LOCATION_PERMISSION_DENIED : LOCATION_UNAVAILABLE);
  } finally {
    button.disabled = false;
    button.textContent = 'Show here';
  }
}

$('#place-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void submit();
});
$('#show-here').addEventListener('click', () => { void showHere(); });
$('#state-action').addEventListener('click', () => {
  const code = $('#state-panel').dataset.code;
  if ([LOCATION_PERMISSION_DENIED, LOCATION_UNAVAILABLE].includes(code)) {
    void showHere();
  } else if ([INVALID_INPUT, PLACE_NOT_FOUND, 'coverage-unavailable'].includes(code)) {
    $('#place').focus();
    if (code !== INVALID_INPUT) $('#place').select();
  } else {
    void submit();
  }
});
$('#show-history').addEventListener('click', openHistory);
$('#close-history').addEventListener('click', () => { $('#history-panel').hidden = true; $('#show-history').focus(); });
$('#download-history').addEventListener('click', downloadHistory);
$('#clear-history').addEventListener('click', () => {
  history.clear();
  renderHistory();
  $('#history-status').textContent = 'Local history cleared. Forecast and station caches were left alone.';
});

updateHistoryCount();

if (fixtureMode) {
  $('#fixture-note').hidden = false;
  const inputs = {
    'invalid-input': '',
    'place-not-found': 'Missing',
    'geocoder-unavailable': 'Unavailable',
    'coverage-unavailable': 'Denver',
    'coast-choice-required': 'Bainbridge',
    'tides-unavailable': 'Seattle',
    'astronomy-unavailable': 'Seattle',
    'no-event': 'Seattle'
  };
  $('#place').value = new URLSearchParams(location.search).get('place') ?? inputs[forcedState] ?? 'Seattle';
  $('#place-form').requestSubmit();
}
