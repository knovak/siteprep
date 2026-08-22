import { resolveTimeZone } from '../phase-1/src/day-model.mjs';
import { normalizeStationCatalogues, readThroughStationCatalogue } from '../phase-2/src/station-catalogue.mjs';
import { TideProvider } from '../phase-3/src/tide-provider.mjs';
import { ASTRONOMY_UNAVAILABLE, Astronomy } from '../phase-4/src/astronomy.mjs';
import { Geocoder, GEOCODER_UNAVAILABLE, INVALID_INPUT, PLACE_NOT_FOUND, parsePlaceInput } from '../phase-5/src/geocoder.mjs';
import { COAST_CHOICE_REQUIRED, TideHereService } from '../phase-5/src/resolve-forecast.mjs';
import { ForecastCache, LocalHistory } from '../phase-7/src/local-data.mjs';
import { forecastViewModel, statePresentation } from './src/page-view.mjs';

const $ = (selector) => document.querySelector(selector);
const fixtureMode = new URLSearchParams(location.search).get('fixture') === '1';
const forcedState = new URLSearchParams(location.search).get('state');
const fixedNow = new Date('2026-08-20T12:00:00.000Z');
const now = () => fixtureMode ? fixedNow : new Date();

async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

const [providerConfig, geocoderConfig, catalogueFixture, timeZoneDataset, noaaFixture, chsFixture] = await Promise.all([
  json('../phase-2/data/provider-config.json'),
  json('../phase-5/data/geocoder-config.json'),
  json('../phase-2/data/catalogue-slices.fixture.json'),
  json('../phase-1/data/time-zones.fixture.geojson'),
  json('../phase-0/fixtures/noaa-seattle-hilo.json'),
  json('../phase-0/fixtures/chs-halifax-hilo.json')
]);

const stations = normalizeStationCatalogues(catalogueFixture, providerConfig);
const history = new LocalHistory({ storage: localStorage, now });
const forecastCache = new ForecastCache({ storage: localStorage, now });

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
const service = new TideHereService({
  geocoder,
  getStations: async () => (await readThroughStationCatalogue({
    storage: localStorage,
    now: now().getTime(),
    ttlMs: providerConfig.catalogueCacheTtlMs,
    fetchCatalogue: async () => stations
  })).stations,
  matchConfig: providerConfig.match,
  timeZoneLookup: async (latitude, longitude) => resolveTimeZone(latitude, longitude, timeZoneDataset),
  tideProvider: new TideProvider({
    config: providerConfig,
    fetchImpl: fixtureMode ? fixtureTideFetch : fetch.bind(globalThis),
    now
  }),
  astronomy,
  now
});

function hideOutput() {
  $('#state-panel').hidden = true;
  $('#chooser').hidden = true;
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

function showChooser(resolution) {
  showState(COAST_CHOICE_REQUIRED, { focus: false, actionable: false });
  $('#chooser-place').textContent = `Resolved place: ${resolution.place.name}`;
  $('#candidate-list').replaceChildren(...resolution.candidates.map((candidate) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'candidate';
    const name = document.createElement('strong');
    name.textContent = candidate.name;
    const distance = document.createElement('small');
    distance.textContent = `${candidate.distanceKm.toFixed(1)} km · ${candidate.provider.toUpperCase()}`;
    button.append(name, distance);
    button.addEventListener('click', () => loadForecast(resolution, candidate));
    return button;
  }));
  renderMap(resolution);
  $('#chooser').hidden = false;
  $('#candidate-list button')?.focus();
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

function eventGroup(title, entries) {
  const section = document.createElement('section');
  section.className = 'event-group';
  section.append(textNode('h3', title));
  const list = document.createElement('ul');
  if (!entries.length) list.append(textNode('li', 'No tide event in this recorded window', 'empty'));
  for (const entry of entries) {
    const item = document.createElement('li');
    item.append(textNode('strong', `${entry.type} · ${entry.time}`), textNode('span', entry.height, 'height'));
    list.append(item);
  }
  section.append(list);
  return section;
}

function astronomyGroup(day) {
  const section = document.createElement('section');
  section.className = 'event-group';
  section.append(textNode('h3', 'Sun and moon'));
  const pairs = document.createElement('div');
  pairs.className = 'event-pair';
  for (const [label, event] of [
    ['Sunrise', day.sunrise], ['Sunset', day.sunset],
    ['Moonrise', day.moonrise], ['Moonset', day.moonset], ['Moon phase', { label: day.moonPhase }]
  ]) {
    const row = document.createElement('p');
    row.append(textNode('strong', label), textNode('span', event.label));
    if (event.code) row.dataset.code = event.code;
    pairs.append(row);
  }
  section.append(pairs);
  return section;
}

function dayCard(day, index) {
  const article = document.createElement('article');
  article.className = `day-card${index === 0 ? ' current' : ''}`;
  article.dataset.date = day.date;
  article.append(textNode('h2', `${index === 0 ? 'Today · ' : ''}${day.label}`));
  article.append(eventGroup('Tides', day.tides), astronomyGroup(day));
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
  const model = forecastViewModel(forceNoEvent(forecast));
  $('#entered-name').textContent = model.entered;
  $('#resolved-name').textContent = model.resolved;
  $('#coast-name').textContent = model.coast;
  $('#station-name').textContent = model.station;
  $('#station-kind').textContent = `${model.provider} ${model.stationKind} station`;
  $('#zone-name').textContent = model.timeZone;
  $('#source-copy').textContent = `${model.provider} predictions · ${model.stationKind} station · heights in metres relative to ${model.datum}. Times are formatted explicitly in ${model.timeZone}.`;
  $('#warnings').replaceChildren(...model.warnings.map((warning) => {
    const box = document.createElement('div');
    box.className = 'warning';
    box.dataset.code = warning.code;
    box.append(textNode('strong', warning.message), textNode('span', warning.action));
    return box;
  }));
  $('#day-cards').replaceChildren(...model.days.map(dayCard));
  $('#chooser').hidden = true;
  $('#result').hidden = false;
  if (model.warnings.length) showState(model.warnings[0].code, { focus: false });
  else if (forcedState === 'no-event') showState('no-event', { focus: false, actionable: false });
  else $('#state-panel').hidden = true;
  $('#result').scrollIntoView({ block: 'start', behavior: 'instant' });
}

async function loadForecast(resolution, station = null) {
  const selection = service.chosenStation(resolution, station);
  const coordinates = {
    latitude: Number(selection.station.latitude ?? selection.station.lat),
    longitude: Number(selection.station.longitude ?? selection.station.lon)
  };
  const timeZone = resolveTimeZone(coordinates.latitude, coordinates.longitude, timeZoneDataset);
  const cacheContext = {
    input: resolution.input.display,
    station: selection.station,
    timeZone,
    now: now()
  };
  const cached = forcedState ? null : await forecastCache.read(cacheContext);
  const result = cached || await service.forecast(resolution, station);
  if (!cached && !forcedState) await forecastCache.write(cacheContext, result);
  history.append(result);
  updateHistoryCount();
  showForecast(result);
}

async function submit() {
  hideOutput();
  const resolution = await service.resolve($('#place').value);
  if (resolution.code === COAST_CHOICE_REQUIRED) return showChooser(resolution);
  if (!resolution.ok) return showState(resolution.code);
  return loadForecast(resolution);
}

$('#place-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void submit();
});
$('#state-action').addEventListener('click', () => {
  const code = $('#state-panel').dataset.code;
  if ([INVALID_INPUT, PLACE_NOT_FOUND, 'coverage-unavailable'].includes(code)) {
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
