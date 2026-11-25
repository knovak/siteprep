import { localDateForInstant, resolveTimeZone } from '../phase-1/src/day-model.mjs';
import { fetchStationCatalogues, normalizeStationCatalogues, readThroughStationCatalogue } from '../phase-2/src/station-catalogue.mjs';
import { fetchStationDetails, readThroughStationDetails } from '../phase-2/src/station-details.mjs';
import { TIDES_UNAVAILABLE, TideProvider } from '../phase-3/src/tide-provider.mjs';
import { ASTRONOMY_UNAVAILABLE, Astronomy } from '../phase-4/src/astronomy.mjs';
import { Geocoder, GEOCODER_UNAVAILABLE, INVALID_INPUT, PLACE_NOT_FOUND, parsePlaceInput } from '../phase-5/src/geocoder.mjs';
import { COAST_CHOICE_REQUIRED, TideHereService } from '../phase-5/src/resolve-forecast.mjs';
import { ForecastCache, LocalHistory } from '../phase-7/src/local-data.mjs';
import { forecastViewModel, providerLabel, statePresentation } from './src/page-view.mjs';
import { AUSTRALIAN_PROVIDER_ID, FES_PROVIDER_ID, loadAvailableStations, StoredTideClient } from './src/stored-tide-client.mjs';
import { EXTREMITY_LEVELS } from '../phase-15/src/extremity.mjs';
import { ExtremityCache, ExtremityLoader, extremityKey, extremityTarget } from '../phase-15/src/extremity-cache.mjs';
import { fetchDirectExtremityRecord, isDirectExtremityProvider } from '../phase-15/src/extremity-sources.mjs';

const $ = (selector) => document.querySelector(selector);
const searchParams = new URLSearchParams(location.search);
const fixtureMode = searchParams.get('fixture') === '1';
const fixturePlaceParam = searchParams.get('place');
const forcedState = searchParams.get('state');
const fixedNow = new Date('2026-08-20T13:00:00.000Z');
const now = () => fixtureMode ? fixedNow : new Date();
const LOCATION_PERMISSION_DENIED = 'location-permission-denied';
const LOCATION_UNAVAILABLE = 'location-unavailable';
const PENDING_NORMAL_PLACE_KEY = 'tide-here.pending-normal-place.v1';
const pendingNormalPlace = fixtureMode ? null : sessionStorage.getItem(PENDING_NORMAL_PLACE_KEY);
let startupReady = false;
let queuedStartupAction = null;
let cancelPendingLocation = null;
$('#place').addEventListener('input', () => {
  if (!startupReady) queuedStartupAction = { type: 'editing' };
  cancelPendingLocation?.();
});
// Keep manual input usable even while configuration is still downloading.
$('#place-form').addEventListener('submit', (event) => {
  if (startupReady) return;
  event.preventDefault();
  queuedStartupAction = { type: 'selection', value: $('#place').value };
  $('#loading-text').textContent = 'Starting your search…';
});
$('#show-here').addEventListener('click', () => {
  if (startupReady) return;
  queuedStartupAction = { type: 'location' };
  $('#loading-text').textContent = 'Finding your location…';
});
// Start the permission request before the configuration downloads finish.
const startupPosition = !fixtureMode && pendingNormalPlace === null
  ? browserPosition().then((position) => ({ position }), (error) => ({ error })) : null;
if (startupPosition) $('#loading-text').textContent = 'Finding your location…';
const LEGACY_FIXTURE_CACHE_KEYS = Object.freeze([
  'tide-here.station-catalogue.v2',
  'tide-here.forecast-index.v1'
]);
const LEGACY_FIXTURE_CACHE_PREFIXES = Object.freeze(['tide-here.forecast.v1.']);

async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

const [providerConfig, geocoderConfig, catalogueFixture, timeZoneDataset, noaaFixture, chsFixture, australiaCatalogueFixture] = await Promise.all([
  json('../phase-2/data/provider-config.json'),
  json('../phase-5/data/geocoder-config.json'),
  fixtureMode ? json('../phase-2/data/catalogue-slices.fixture.json') : null,
  fixtureMode ? json('../phase-1/data/time-zones.fixture.geojson') : null,
  fixtureMode ? json('../phase-0/fixtures/noaa-seattle-hilo.json') : null,
  fixtureMode ? json('../phase-0/fixtures/chs-halifax-hilo.json') : null,
  fixtureMode ? json('./data/australia-stations.json') : null
]).catch((error) => {
  $('#loading-status').hidden = true;
  $('#result').setAttribute('aria-busy', 'false');
  $('#state-panel').hidden = false;
  $('#state-code').textContent = 'Unable to start';
  $('#state-message').textContent = 'Tide Here could not finish loading. Check your connection and reload the page.';
  $('#state-action').textContent = 'Reload Tide Here';
  $('#state-action').addEventListener('click', () => location.reload());
  throw error;
});

const fixtureStations = fixtureMode ? normalizeStationCatalogues(catalogueFixture, providerConfig) : null;
if (fixtureMode) {
  for (const key of LEGACY_FIXTURE_CACHE_KEYS) localStorage.removeItem(key);
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && LEGACY_FIXTURE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key);
  }
}
const runtimeStorage = fixtureMode ? sessionStorage : localStorage;
const history = new LocalHistory({ storage: runtimeStorage, now });
const forecastCache = new ForecastCache({ storage: runtimeStorage, now });
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
      storage: runtimeStorage,
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
  if (key === 'brisbane') return { name: 'Brisbane, Queensland, Australia', lat: -27.4698, lon: 153.0251 };
  if (key === 'cooktown,qld') return { name: 'Cooktown, Queensland, Australia', lat: -15.4726622, lon: 145.2534218 };
  if (key === 'sydney') return { name: 'Sydney, New South Wales, Australia', lat: -33.8688, lon: 151.2093 };
  if (key === 'seattle') return { name: 'Seattle, Washington, United States', lat: 47.6062, lon: -122.3321 };
  return { code: PLACE_NOT_FOUND };
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
  : new Geocoder({ config: geocoderConfig, fetchImpl: fetch.bind(globalThis), storage: runtimeStorage });
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
  storage: fixtureMode ? null : runtimeStorage,
});
// Public provider data can load while the independent place lookup is running.
// A failed preload remains retryable when the resolved place needs the catalogue.
if (!fixtureMode) void storedTideClient.stations().catch(() => {});
const fesTideClient = new StoredTideClient({
  provider: FES_PROVIDER_ID,
  fetchImpl: fetch.bind(globalThis),
});
const tideProvider = {
  forecast(request) {
    if (request.station.provider === AUSTRALIAN_PROVIDER_ID) return storedTideClient.forecast(request);
    if (request.station.provider === FES_PROVIDER_ID) return fesTideClient.forecast(request);
    return directTideProvider.forecast(request);
  }
};
// Recorded one-year predictions for the fixture stations (Phase 15).
function fixtureYearFetch(url) {
  const path = String(url).includes('tidesandcurrents.noaa.gov')
    ? '../phase-15/fixtures/noaa-9447130-2026-hilo.fixture.json'
    : '../phase-15/fixtures/chs-5cebf1df3d0f4a073c4bbcbb-2026-hilo.fixture.json';
  return fetch(path);
}

const extremityCache = new ExtremityCache({ storage: runtimeStorage, now });
const extremityLoader = new ExtremityLoader({
  cache: extremityCache,
  fetchRecord: ({ target, station, signal }) => {
    if (isDirectExtremityProvider(target.provider)) {
      return fetchDirectExtremityRecord({
        station,
        year: target.year,
        config: providerConfig,
        fetchImpl: fixtureMode ? fixtureYearFetch : fetch.bind(globalThis),
        signal,
        now
      });
    }
    if (target.provider === AUSTRALIAN_PROVIDER_ID) return storedTideClient.extremity({ station, year: target.year, signal });
    if (target.provider === FES_PROVIDER_ID) return fesTideClient.extremity({ station, year: target.year, signal });
    return Promise.reject(new RangeError(`No extremity source for ${target.provider}`));
  }
});
const failedExtremity = new Set();
let extremityRequest = null;
let openExtremity = null;

const service = new TideHereService({
  geocoder,
  getStations: (place) => loadAvailableStations({
    place,
    direct: async () => (await readThroughStationCatalogue({
      storage: runtimeStorage,
      now: now().getTime(),
      ttlMs: providerConfig.catalogueCacheTtlMs,
      fetchCatalogue: fixtureMode
        ? async () => fixtureStations
        : () => fetchStationCatalogues({ config: providerConfig, fetchImpl: fetch.bind(globalThis) })
    })).stations,
    stored: () => storedTideClient.stations()
  }),
  matchConfig: providerConfig.match,
  resolveFallback: ({place}) => fesTideClient.resolve({
    latitude: place.lat,
    longitude: place.lon,
    name: place.name,
  }),
  timeZoneLookup: async (_latitude, _longitude, station) => (await stationDetails(station)).timeZone,
  tideProvider,
  astronomy,
  now
});

let requestSequence = 0;
let busy = false;
let displayedForecast = null;
let displayedSelection = null;

function setLoading(message) {
  $('#loading-text').textContent = message;
  $('#loading-status').hidden = false;
  $('#result').setAttribute('aria-busy', 'true');
}

function beginRequest(message) {
  cancelPendingLocation = null;
  extremityRequest?.cancel();
  extremityRequest = null;
  openExtremity = null;
  requestSequence += 1;
  busy = true;
  displayedForecast = null;
  hideOutput();
  $('#show-here').disabled = false;
  $('#show-here').textContent = 'Show here';
  setLoading(message);
  return requestSequence;
}

function finishRequest(request) {
  if (request !== requestSequence) return;
  cancelPendingLocation = null;
  busy = false;
  $('#loading-status').hidden = true;
  $('#result').setAttribute('aria-busy', 'false');
  $('#show-here').disabled = false;
  $('#show-here').textContent = 'Show here';
}

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
      void selectCoast(resolution, candidate);
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

let svgSequence = 0;

function tideIndicator(progress) {
  const indicator = document.createElement('div');
  indicator.className = 'tide-indicator';
  indicator.dataset.direction = progress.direction;
  indicator.dataset.fill = progress.fill === null ? 'unknown' : String(progress.fill);
  const nextTime = formatIndicatorTime(progress.nextAt);
  const description = `${progress.label}. Next ${progress.nextType} tide ${nextTime}. ${progress.description}`;
  indicator.setAttribute('role', 'img');
  indicator.setAttribute('aria-label', description);
  indicator.title = description;
  const svg = svgElement('svg', { viewBox: '0 0 44 70', 'aria-hidden': 'true', focusable: 'false' });
  const path = 'M22 3 L41 29 H30 V67 H14 V29 H3 Z';
  const attributes = { d: path, ...(progress.direction === 'down' ? { transform: 'rotate(180 22 35)' } : {}) };
  const clipId = `tide-arrow-${++svgSequence}`;
  const clip = svgElement('clipPath', { id: clipId });
  clip.append(svgElement('path', attributes));
  const defs = svgElement('defs');
  defs.append(clip);
  svg.append(defs, svgElement('path', { ...attributes, class: 'tide-arrow-base' }));
  if (progress.fill !== null) svg.append(svgElement('rect', {
    x: 0, y: 3 + 64 * (1 - progress.fill), width: 44, height: 64 * progress.fill,
    'clip-path': `url(#${clipId})`, class: 'tide-arrow-fill'
  }));
  svg.append(svgElement('path', { ...attributes, class: 'tide-arrow-outline' }));
  if (progress.fill === null) {
    const unknown = svgElement('text', { x: 22, y: 48, 'text-anchor': 'middle', class: 'tide-fill-unknown' });
    unknown.textContent = '?';
    svg.append(unknown);
  }
  indicator.append(svg, textNode('span', progress.label));
  return indicator;
}

function formatIndicatorTime(instant) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: displayedForecast.timeZone, hour: 'numeric', minute: '2-digit', hourCycle: 'h12'
  }).format(new Date(instant));
}

function moonIcon(icon) {
  const svg = svgElement('svg', {
    viewBox: '0 0 24 24', class: 'moon-phase-icon', role: 'img', 'aria-label': `Moon phase: ${icon.label}`
  });
  const group = svgElement('g', icon.southernHemisphere ? { transform: 'rotate(180 12 12)' } : {});
  group.append(svgElement('circle', { cx: 12, cy: 12, r: 10, class: 'moon-dark' }));
  const waxing = icon.phase < .5;
  const curve = Math.cos(2 * Math.PI * icon.phase);
  const terminator = Math.abs(curve) * 10;
  const sweep = waxing ? 1 : 0;
  const returningSweep = curve >= 0 ? 1 - sweep : sweep;
  const illuminated = `M12 2 A10 10 0 0 ${sweep} 12 22 A${terminator} 10 0 0 ${returningSweep} 12 2 Z`;
  group.append(svgElement('path', { d: illuminated, class: 'moon-lit' }));
  group.append(svgElement('circle', { cx: 12, cy: 12, r: 10, class: 'moon-outline' }));
  svg.append(group);
  return svg;
}

function closeExtremity({ focus = false } = {}) {
  const open = openExtremity && document.querySelector(`[data-extremity-key="${openExtremity}"]`);
  openExtremity = null;
  for (const button of document.querySelectorAll('.height.extreme[aria-expanded="true"]')) button.setAttribute('aria-expanded', 'false');
  for (const box of document.querySelectorAll('.extreme-explain')) box.hidden = true;
  if (focus && open) open.focus();
}

function showExtremity(button, { pinned = true } = {}) {
  const box = document.getElementById(button.getAttribute('aria-controls'));
  const item = button.closest('li');
  if (!box || !item) return;
  for (const other of document.querySelectorAll('.extreme-explain')) if (other !== box) other.hidden = true;
  for (const other of document.querySelectorAll('.height.extreme[aria-expanded="true"]')) if (other !== button) other.setAttribute('aria-expanded', 'false');
  box.style.top = `${item.offsetTop + item.offsetHeight + 4}px`;
  box.hidden = false;
  if (pinned) {
    openExtremity = button.dataset.extremityKey;
    button.setAttribute('aria-expanded', 'true');
  }
}

const hoverPointer = window.matchMedia?.('(hover: hover) and (pointer: fine)');

function heightNode(entry, card, key) {
  if (!entry.extremity) return textNode('span', entry.height, 'height');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'height extreme';
  button.dataset.kind = entry.kind;
  button.dataset.level = entry.extremity.level;
  button.dataset.extremityKey = key;
  button.textContent = entry.height;
  const box = document.createElement('div');
  box.className = 'extreme-explain';
  box.id = `extreme-${key}`;
  box.hidden = true;
  box.append(textNode('strong', entry.extremity.headline), textNode('span', entry.extremity.sentence), textNode('small', entry.extremity.caveat));
  button.setAttribute('aria-controls', box.id);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', `${entry.height}. ${entry.extremity.sentence}`);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (button.getAttribute('aria-expanded') === 'true') closeExtremity();
    else showExtremity(button);
  });
  button.addEventListener('mouseenter', () => {
    if (hoverPointer?.matches && !openExtremity) showExtremity(button, { pinned: false });
  });
  button.addEventListener('mouseleave', () => {
    if (hoverPointer?.matches && !openExtremity) box.hidden = true;
  });
  card.append(box);
  return button;
}

document.addEventListener('click', (event) => {
  if (openExtremity && !event.target.closest?.('.extreme-explain, .height.extreme')) closeExtremity();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && openExtremity) closeExtremity({ focus: true });
});

function swatch(kind, level) {
  const sample = textNode('span', '0.00 m', 'extreme-swatch');
  sample.dataset.kind = kind;
  sample.dataset.level = level;
  sample.setAttribute('aria-hidden', 'true');
  return sample;
}

function renderExtremityLegend(model, record) {
  const legend = $('#extremity-legend');
  const marked = model.days.some((day) => day.tides.some((tide) => tide.extremity));
  legend.hidden = !marked;
  if (!marked) return legend.replaceChildren();
  const item = (...nodes) => { const span = document.createElement('span'); span.append(...nodes); return span; };
  const { notable, exceptional } = EXTREMITY_LEVELS;
  legend.replaceChildren(
    item(swatch('high', 'notable'), document.createTextNode(`Highest ${notable}%`)),
    item(swatch('high', 'exceptional'), document.createTextNode(`Highest ${exceptional}% of high tides`)),
    item(swatch('low', 'notable'), document.createTextNode(`Lowest ${notable}%`)),
    item(swatch('low', 'exceptional'), document.createTextNode(`Lowest ${exceptional}% of low tides`)),
    textNode('span', `Ranked against every predicted tide ${model.stationKind === 'model-point' ? 'at this model point' : 'at this station'} in ${record.year}. Click or tap a marked height for details.`, 'extremity-legend-note')
  );
}

function renderExtremitySource(forecast, record) {
  const target = extremityTarget(forecast);
  const paragraph = $('#extremity-source');
  if (record) {
    paragraph.textContent = `Underlined heights are ranked against the ${record.highCount} high and ${record.lowCount} low tides predicted by the same source for ${record.year}: a thin line marks the highest or lowest ${EXTREMITY_LEVELS.notable}%, a thick line the highest or lowest ${EXTREMITY_LEVELS.exceptional}%.`;
  } else if (target && failedExtremity.has(extremityKey(target))) {
    paragraph.textContent = 'Particularly high and low tide marks are unavailable for this station right now.';
  } else {
    paragraph.textContent = '';
  }
  paragraph.hidden = !paragraph.textContent;
}

function hasTides(forecast) {
  return forecast.days.some((day) => day.tides.length);
}

// Marks are never on the path to the first forecast: a cached record is used
// in the first render, and a missing one is loaded after the cards are painted.
function startExtremity(forecast, station, request) {
  extremityRequest?.cancel();
  extremityRequest = null;
  const target = extremityTarget(forecast);
  if (!target || !hasTides(forecast) || extremityLoader.cached(target)) return;
  const idle = window.requestIdleCallback
    ? (callback) => window.requestIdleCallback(callback, { timeout: 1500 })
    : (callback) => setTimeout(callback, 0);
  idle(() => {
    if (request !== requestSequence || displayedForecast !== forecast) return;
    const handle = extremityLoader.load(target, station);
    extremityRequest = handle;
    handle.promise.then((record) => {
      if (extremityRequest === handle) extremityRequest = null;
      if (request !== requestSequence || displayedForecast !== forecast) return;
      if (!record) failedExtremity.add(extremityKey(target));
      showForecast(forecast, { scroll: false });
    });
  });
}

function eventGroup(entries, progress, card, date) {
  const section = document.createElement('section');
  section.className = 'event-group';
  const list = document.createElement('ul');
  if (!entries.length) list.append(textNode('li', 'No tide event in this recorded window', 'empty'));
  entries.forEach((entry, index) => {
    const item = document.createElement('li');
    item.className = entry.isPast ? 'past' : 'future';
    item.append(textNode('span', `${entry.type} · ${entry.time}`, 'tide-label'), heightNode(entry, card, `${date}-${index}`));
    list.append(item);
  });
  section.append(list);
  if (progress) section.append(tideIndicator(progress));
  return section;
}

function astronomyGroup(day) {
  const details = document.createElement('details');
  details.className = 'astronomy-details';
  const summary = document.createElement('summary');
  if (day.moonIcon) summary.append(moonIcon(day.moonIcon));
  summary.append(document.createTextNode(`Sun and moon · Moonrise ${day.moonrise.label}`));
  details.append(summary);
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
  article.className = `day-card${day.isToday ? ' current' : ''}`;
  article.dataset.date = day.date;
  article.append(textNode('h2', `${day.isToday ? 'Today · ' : ''}${day.label}`));
  article.append(eventGroup(day.tides, day.tideProgress, article, day.date), astronomyGroup(day));
  return article;
}

function forceNoEvent(forecast) {
  if (forcedState !== 'no-event') return forecast;
  const days = forecast.days.map((day, index) => index === 0
    ? Object.freeze({ ...day, moonrise: Object.freeze([]), moonset: Object.freeze([]), astronomyState: 'available' })
    : day);
  return Object.freeze({ ...forecast, days: Object.freeze(days) });
}

function showForecast(forecast, { scroll = true } = {}) {
  displayedForecast = forecast;
  const focusedDate = document.activeElement?.closest('.day-card')?.dataset.date;
  const expandedDates = new Set([...document.querySelectorAll('.day-card:has(.astronomy-details[open])')].map((card) => card.dataset.date));
  const extremityRecord = extremityCache.read(extremityTarget(forecast));
  const model = forecastViewModel(forceNoEvent(forecast), now(), { extremity: extremityRecord });
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
  $('#source-attribution').textContent = model.source?.attribution ?? '';
  $('#source-attribution').hidden = !model.source?.attribution;
  $('#source-disclaimer').textContent = model.source?.disclaimer ?? '';
  $('#source-disclaimer').hidden = !model.source?.disclaimer;
  const sourceLink = $('#source-link');
  sourceLink.href = model.source?.sourceUrl ?? '';
  sourceLink.hidden = !model.source?.sourceUrl;
  const licenceLink = $('#licence-link');
  licenceLink.href = model.source?.licenceUrl ?? '';
  licenceLink.hidden = !model.source?.licenceUrl;
  const fixtureWarning = model.warnings.find((warning) => warning.code === 'fixture-data');
  const locationNotice = $('#fixture-location-notice');
  locationNotice.textContent = fixtureWarning?.message ?? '';
  locationNotice.hidden = !fixtureWarning;
  const externalWarnings = model.warnings.filter((warning) => !['fixture-data', 'approximate-fallback'].includes(warning.code));
  $('#warnings').replaceChildren(...externalWarnings.map((warning) => {
    const box = document.createElement('div');
    box.className = 'warning';
    box.dataset.code = warning.code;
    box.append(textNode('strong', warning.message), textNode('span', warning.action));
    return box;
  }));
  const reopen = openExtremity;
  openExtremity = null;
  $('#day-cards').replaceChildren(...model.days.map(dayCard));
  renderExtremityLegend(model, extremityRecord);
  renderExtremitySource(forecast, extremityRecord);
  for (const card of document.querySelectorAll('.day-card')) {
    if (expandedDates.has(card.dataset.date)) card.querySelector('.astronomy-details').open = true;
    if (!scroll && focusedDate === card.dataset.date) card.querySelector('.astronomy-details summary').focus({ preventScroll: true });
  }
  $('#result').hidden = false;
  const reopened = reopen && document.querySelector(`[data-extremity-key="${reopen}"]`);
  if (reopened) showExtremity(reopened);
  if (externalWarnings.length) showState(externalWarnings[0].code, {
    focus: false,
    actionable: true
  });
  else if (forcedState === 'no-event') showState('no-event', { focus: false, actionable: false });
  else $('#state-panel').hidden = true;
  if (scroll) $('#result').scrollIntoView({ block: 'start', behavior: 'instant' });
}

async function loadForecast(resolution, station, request) {
  if (request !== requestSequence) return;
  setLoading('Loading tide predictions…');
  const selection = service.chosenStation(resolution, station);
  const detailedStation = await stationDetails(selection.station);
  if (request !== requestSequence) return;
  const preparedResolution = resolutionWithStationDetails(resolution, selection.station, detailedStation);
  const timeZone = detailedStation.timeZone;
  const cacheContext = {
    input: resolution.input.display,
    station: detailedStation,
    timeZone,
    now: now()
  };
  const cached = forcedState ? null : await forecastCache.read(cacheContext);
  if (request !== requestSequence) return;
  const result = cached || await service.forecast(preparedResolution, station ? detailedStation : null);
  if (request !== requestSequence) return;
  if (!cached && !forcedState) await forecastCache.write(cacheContext, result);
  if (request !== requestSequence) return;
  displayedSelection = { resolution, station };
  history.append(result);
  updateHistoryCount();
  showForecast(result);
  if (resolution.candidates.length) showAlternativeCoasts(resolution, detailedStation);
  startExtremity(result, detailedStation, request);
}

async function selectCoast(resolution, station = null) {
  const request = beginRequest('Loading tide predictions…');
  try {
    await loadForecast(resolution, station, request);
  } catch {
    if (request === requestSequence) showState(TIDES_UNAVAILABLE);
  } finally {
    finishRequest(request);
  }
}

async function submit(request = beginRequest('Finding the coast…')) {
  const input = $('#place').value;
  try {
    setLoading('Finding the coast…');
    const resolution = await service.resolve(input);
    if (request !== requestSequence) return;
    if (resolution.code === COAST_CHOICE_REQUIRED) return await loadForecast(resolution, resolution.candidates[0], request);
    if (!resolution.ok) return showState(resolution.code);
    return await loadForecast(resolution, null, request);
  } catch {
    if (request === requestSequence) showState(TIDES_UNAVAILABLE);
  } finally {
    finishRequest(request);
  }
}

function continueOnNormalPage(input) {
  sessionStorage.setItem(PENDING_NORMAL_PLACE_KEY, input);
  const normalUrl = new URL(location.href);
  normalUrl.search = '';
  normalUrl.hash = '';
  location.replace(normalUrl);
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

async function showHere(positionPromise = null) {
  const request = beginRequest('Finding your location…');
  const button = $('#show-here');
  button.disabled = true;
  button.textContent = 'Finding you…';
  cancelPendingLocation = () => {
    if (request !== requestSequence) return;
    finishRequest(request);
    requestSequence += 1;
  };
  try {
    const result = positionPromise ? await positionPromise : { position: await browserPosition() };
    if (request !== requestSequence) return;
    if (result.error) throw result.error;
    cancelPendingLocation = null;
    const { latitude, longitude } = result.position.coords || {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw Object.freeze({ code: 0 });
    $('#place').value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    await submit(request);
  } catch (error) {
    if (request === requestSequence) showState(error?.code === 1 ? LOCATION_PERMISSION_DENIED : LOCATION_UNAVAILABLE);
  } finally {
    finishRequest(request);
  }
}

function refreshCurrentDisplay() {
  if (document.hidden || busy || !displayedForecast) return;
  if (localDateForInstant(now(), displayedForecast.timeZone) !== displayedForecast.days[0].date) {
    if (displayedSelection) void selectCoast(displayedSelection.resolution, displayedSelection.station);
    return;
  }
  showForecast(displayedForecast, { scroll: false });
}

setInterval(refreshCurrentDisplay, 60_000);
window.addEventListener('focus', refreshCurrentDisplay);
document.addEventListener('visibilitychange', refreshCurrentDisplay);

$('#place-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (fixtureMode && fixturePlaceParam !== null) return continueOnNormalPage($('#place').value);
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
startupReady = true;
if (pendingNormalPlace !== null) sessionStorage.removeItem(PENDING_NORMAL_PLACE_KEY);
if (fixtureMode) $('#fixture-note').hidden = false;

if (queuedStartupAction?.type === 'editing') {
  finishRequest(requestSequence);
} else if (queuedStartupAction?.type === 'selection') {
  $('#place').value = queuedStartupAction.value;
  if (fixtureMode && fixturePlaceParam !== null) continueOnNormalPage(queuedStartupAction.value);
  else void submit();
} else if (queuedStartupAction?.type === 'location') {
  void showHere(startupPosition);
} else if (fixtureMode) {
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
  $('#place').value = fixturePlaceParam ?? inputs[forcedState] ?? 'Seattle';
  void submit();
} else {
  const pendingPlace = pendingNormalPlace;
  if (pendingPlace !== null) {
    sessionStorage.removeItem(PENDING_NORMAL_PLACE_KEY);
    $('#place').value = pendingPlace;
    void submit();
  } else {
    void showHere(startupPosition);
  }
}
