import {createOnlineTides, providers} from './online.mjs';
import harmonicsGzip from '../data/coastal-harmonics.bin.gz';
import placesGzip from '../data/places.json.gz';
import workerSource from 'tide:worker';
import {decodeHarmonics, makePlaceIndex, nearbyPoints, parseCoordinates, searchPlaces} from './data.mjs';
import {forecastRows, makeForecast} from './forecast.mjs';
import {createHistory} from './history.mjs';
import {localDateForInstant} from './day-model.mjs';

const $ = selector => document.querySelector(selector);
const el = (tag, text, cls = '') => { const node = document.createElement(tag); node.textContent = text; node.className = cls; return node; };
let storage;
try { storage = window.localStorage; } catch { storage = {getItem() { throw Error(); }, setItem() { throw Error(); }}; }
const history = createHistory(storage);
const online = createOnlineTides({storage});
let onlineController, onlineVersion = 0;
let data, places, current, selectedPlace, candidates = [], requestId = 0, version = 0;
const pending = new Map();
const workerUrl = URL.createObjectURL(new Blob([workerSource], {type: 'text/javascript'}));
const worker = new Worker(workerUrl);
const workerReady = new Promise((resolve, reject) => {
  const startup = setTimeout(() => reject(new Error('The tide engine could not start. Reopen this file in a current browser.')), 30000);
  worker.onmessage = ({data: reply}) => {
    if (reply.ready) { clearTimeout(startup); URL.revokeObjectURL(workerUrl); resolve(); return; }
    if (!reply.id) { clearTimeout(startup); reject(new Error(reply.error)); return; }
    const waiting = pending.get(reply.id);
    if (waiting) { clearTimeout(waiting.timer); pending.delete(reply.id); reply.error ? waiting.reject(new Error(reply.error)) : waiting.resolve(reply.events); }
  };
  worker.onerror = () => {
    clearTimeout(startup);
    const error = new Error('This browser could not run the embedded tide engine. Try a current Chrome, Firefox or Safari.');
    reject(error);
    for (const waiting of pending.values()) { clearTimeout(waiting.timer); waiting.reject(error); }
    pending.clear();
  };
});
function predict(input) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('The tide calculation took too long. Try again.')); }, 25000);
    pending.set(id, {resolve, reject, timer});
    worker.postMessage({id, input});
  });
}
async function inflate(bytes) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}
function state(title, message) {
  $('#state-title').textContent = title;
  $('#state-message').textContent = message;
  $('#state-panel').hidden = false;
}
function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
  const link = el('a', 'Download'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function showHistory() {
  $('#history-summary').textContent = `Local history (${history.read().length})`;
  $('#history-status').textContent = history.warning();
  $('#history-list').replaceChildren(...[...history.read()].reverse().map(entry => {
    const article = el('article', '', 'history-entry');
    article.append(el('strong', entry.forecast.input.display), el('p', `${entry.forecast.days[0].date} · ${entry.forecast.timeZone}`));
    const button = el('button', 'Calculate today here', 'secondary');
    button.type = 'button'; button.disabled = !data;
    button.addEventListener('click', () => { $('#start-date').value = ''; $('#place-input').value = entry.forecast.input.display; choosePlace(entry.forecast.place); });
    article.append(button); return article;
  }));
}
function time(instant, zone) {
  return new Intl.DateTimeFormat('en-US', {timeZone: zone, hour: 'numeric', minute: '2-digit'}).format(new Date(instant));
}
function renderForecast(forecast) {
  current = forecast;
  $('#coast-name').textContent = forecast.input.display;
  $('#selected-point').textContent = `${forecast.point.name} · ${forecast.point.distanceKm.toFixed(1)} km from your place`;
  $('#zone-name').textContent = `All times in ${forecast.timeZone}`;
  $('.model-badge').textContent = forecast.online ? forecast.online.provider + (forecast.online.cached ? ' · saved response' : ' · online') : 'Calculated here · FES2022 model';
  $('#forecast-note').textContent = forecast.online ? 'High and low tides · metres above ' + forecast.datum + ' · retrieved ' + new Date(forecast.online.retrievedAt).toLocaleString() + (forecast.online.stale ? ' · LIVE SERVICE UNAVAILABLE; saved predictions shown' : '') : 'High and low tides · metres relative to mean sea level · approximate model heights';
  $('#source-link').hidden = !forecast.online;
  if (forecast.online) { $('#source-link').href = forecast.sources[0].sourceUrl; $('#source-link').textContent = 'View the provider response for this station'; }
  $('#refresh-official').hidden = !forecast.online;
  const today = localDateForInstant(new Date(), forecast.timeZone);
  $('#day-cards').replaceChildren(...forecast.days.map(day => {
    const isToday = day.date === today;
    const card = el('article', '', `day-card${isToday ? ' current' : ''}`);
    card.dataset.date = day.date;
    const label = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(day.date+'T12:00:00Z'));
    card.append(el('h2', (isToday ? 'Today · ' : '') + label));
    const events = el('section', '', 'event-group'), list = el('ul', '');
    if (!day.tides.length) list.append(el('li', 'No high or low tide in this local day', 'empty'));
    for (const tide of day.tides) {
      const item = el('li', '', Date.parse(tide.at) < Date.now() ? 'past' : 'future');
      item.append(el('span', `${tide.type === 'high' ? 'High' : 'Low'} · ${time(tide.at, forecast.timeZone)}`, 'tide-label'), el('span', `${tide.height.toFixed(2)} m`, 'height'));
      list.append(item);
    }
    events.append(list); card.append(events);
    const astronomy = el('details', '', 'astronomy-details');
    astronomy.append(el('summary', `Sun and moon · ${day.moonPhase?.name || 'unavailable'}`));
    const pairs = el('div', '', 'event-pair astronomy-content');
    for (const [key, label] of [['sunrise','Sunrise'],['sunset','Sunset'],['moonrise','Moonrise'],['moonset','Moonset']]) {
      const row = el('p', '');
      const text = day.astronomyState === 'unavailable' ? 'unavailable' : day[key]?.length ? day[key].map(at => time(at, forecast.timeZone)).join(', ') : key.endsWith('rise') ? 'does not rise' : 'does not set';
      row.append(el('strong', label), el('span', text)); pairs.append(row);
    }
    const phase = el('p', ''); phase.append(el('strong', 'Moon illuminated'), el('span', day.moonPhase ? `${Math.round(day.moonPhase.fraction*100)}%` : 'unavailable')); pairs.append(phase);
    astronomy.append(pairs); card.append(astronomy); return card;
  }));
  $('#candidate-list').replaceChildren(...candidates.map(point => {
    const button = el('button', `${point.name} · ${point.distanceKm.toFixed(1)} km`, 'candidate');
    button.type = 'button'; button.disabled = point.index === forecast.point.index;
    button.addEventListener('click', () => calculate(point)); return button;
  }));
  $('#chooser').open = false;
  $('#result').hidden = false;
}
async function calculate(candidate) {
  cancelOnline();
  const revision = ++version;
  $('#place-choices').hidden = true; $('#result').hidden = true;
  state('Calculating on your device', 'Finding high and low tides for five local days…');
  try {
    const point = {...data.point(candidate.index), distanceKm: candidate.distanceKm};
    const rows = forecastRows($('#start-date').value, point.timeZone);
    const place = {...selectedPlace};
    const events = await predict({constituents: point.constituents, start: rows[0].startUtc, end: rows.at(-1).endUtc});
    if (revision !== version) return;
    const forecast = makeForecast({place, point, rows, events, dataset: data.metadata.dataset});
    renderForecast(forecast); history.append(forecast); showHistory(); $('#state-panel').hidden = true;
  } catch (error) { if (revision === version) state('Unable to calculate', error.message); }
}
function choosePlace(place) {
  cancelOnline(); $('#official-stations').replaceChildren(); $('#official-status').textContent = '';
  $('#find-stations').disabled = false;
  ++version; current = null; selectedPlace = place;
  $('#result').hidden = true; $('#place-choices').hidden = true; $('#place-input').value = place.label;
  candidates = nearbyPoints(data, place);
  if (!candidates.length) {
    state('No coastal coverage here', 'There is no bundled tide-model point within 40 km. Try a nearby coastal place or more precise coordinates. Inland water and some small harbours are outside this model’s coverage.');
    return;
  }
  void calculate(candidates[0]);
}
function search() {
  cancelOnline();
  ++version; current = null;
  $('#result').hidden = true; $('#place-choices').hidden = true; $('#state-panel').hidden = true;
  try {
    const coordinates = parseCoordinates($('#place-input').value.replaceAll('−', '-'));
    if (coordinates) { choosePlace(coordinates); return; }
    const matches = searchPlaces(places, $('#place-input').value);
    if (!matches.length) { state('Place not in this catalogue', 'Try a town name with a country or region after a comma, or enter latitude, longitude. Street addresses are not included.'); return; }
    if (matches.length === 1) { choosePlace(matches[0]); return; }
    $('#place-list').replaceChildren(...matches.map(place => {
      const button = el('button', '', 'secondary'); button.type = 'button';
      button.append(el('strong', place.name), el('small', place.label.slice(place.name.length+2)));
      button.addEventListener('click', () => choosePlace(place)); return button;
    }));
    $('#place-choices').hidden = false;
  } catch (error) { state('Check the location', error.message); }
}
function cancelOnline() {
  onlineController?.abort(); ++onlineVersion;
  $('#search-online').disabled = !places; $('#find-stations').disabled = !selectedPlace;
  $('#cancel-online').disabled = true; $('#refresh-official').disabled = false;
}
function startOnline() {
  cancelOnline(); onlineController = new AbortController();
  $('#cancel-online').disabled = false;
  return {signal:onlineController.signal, revision:onlineVersion};
}
$('#cancel-online').onclick = () => { cancelOnline(); $('#online-status').textContent = 'Online request cancelled.'; };
$('#search-online').onclick = async () => {
  const {signal,revision} = startOnline(); const placeVersion = ++version;
  $('#search-online').disabled = true; $('#online-status').textContent = 'Searching Photon / OpenStreetMap…';
  try {
    const result = await online.search($('#place-input').value, signal);
    if (revision !== onlineVersion || placeVersion !== version) return;
    if (!result.value.length) throw new Error('No online matches. Try another address or the included catalogue.');
    $('#place-list').replaceChildren(...result.value.map(place => {
      const button = el('button',place.label,'secondary'); button.type='button'; button.onclick=()=>choosePlace(place); return button;
    }));
    $('#place-choices').hidden=false;
    $('#online-status').textContent = 'Choose an online match below. ' + (result.cached ? 'Saved search from '+new Date(result.at).toLocaleString()+'.' : 'Results from Photon / OpenStreetMap.');
  } catch(error) { if(revision===onlineVersion) $('#online-status').textContent=error.message; }
  finally { if(revision===onlineVersion) cancelOnline(); }
};
$('#find-stations').onclick = async () => {
  if (!selectedPlace) return;
  const place = {...selectedPlace}; const {signal,revision} = startOnline();
  $('#find-stations').disabled=true; $('#official-status').textContent='Finding NOAA and Canadian tide stations…';
  try {
    const result=await online.stations(place,signal);
    if(revision!==onlineVersion) return;
    $('#official-stations').replaceChildren(...result.stations.map(station => {
      // Use the existing coastline zone assignment when available; UTC is an explicit fallback.
      const zone = nearbyPoints(data,station)[0]?.timeZone;
      station.timeZone = zone || 'UTC';
      const button=el('button',station.name+' · '+providers[station.provider].name+' · '+station.distanceKm.toFixed(1)+' km · '+station.latitude.toFixed(4)+', '+station.longitude.toFixed(4),'secondary');
      button.type='button'; button.onclick=()=>loadOfficial(station); return button;
    }));
    $('#official-status').textContent=(result.stations.length ? 'Choose the station on your coast. Nearby stations may be across a bay or island. ' : 'No NOAA or Canadian prediction stations within 150 km. Use the bundled model here. ') + result.warning;
  }catch(error){if(revision===onlineVersion) $('#official-status').textContent=error.message;}
  finally{if(revision===onlineVersion) cancelOnline();}
};
async function loadOfficial(station, refresh=false) {
  const place={...selectedPlace}; const {signal,revision}=startOnline(); const placeVersion=++version;
  $('#refresh-official').disabled=true; $('#online-status').textContent='Loading '+providers[station.provider].name+' predictions…';
  try {
    const rows=forecastRows($('#start-date').value,station.timeZone);
    const forecast=await online.forecast({place,station,rows,signal,refresh});
    if(revision!==onlineVersion || placeVersion!==version) return;
    renderForecast(forecast); history.append(forecast); showHistory(); $('#state-panel').hidden=true;
    $('#online-status').textContent=forecast.online.stale ? 'The service is unavailable. Saved predictions for these dates are shown.' : 'Official predictions loaded. You can return to a local model point below.';
  }catch(error){if(revision===onlineVersion) $('#online-status').textContent=error.message+' Your previous forecast remains available.';}
  finally{if(revision===onlineVersion) cancelOnline();}
}
$('#refresh-official').onclick=()=>{if(current?.online) loadOfficial(current.point,true);};
$('#clear-online-cache').onclick=()=>{online.clear();$('#online-status').textContent='Saved online responses cleared. Forecast history and the embedded model are unchanged.';};
$('#place-form').addEventListener('submit', event => { event.preventDefault(); if (data && places) search(); });
$('#today').addEventListener('click', () => { $('#start-date').value = ''; if (selectedPlace && data) choosePlace(selectedPlace); });
$('#show-here').addEventListener('click', () => {
  if (!navigator.geolocation) { state('Location unavailable', 'Enter your town or coordinates instead.'); return; }
  const revision = ++version;
  state('Finding your location', 'Your browser may ask for location permission.');
  navigator.geolocation.getCurrentPosition(({coords}) => {
    if (revision !== version) return;
    choosePlace({latitude: coords.latitude, longitude: coords.longitude, label: `Your location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`});
  }, () => { if (revision === version) state('Location unavailable', 'Location permission was denied or no position was available. Enter your town or coordinates instead.'); }, {timeout: 12000, maximumAge: 300000});
});
$('#download-forecast').addEventListener('click', () => { if (current) download(JSON.stringify(current, null, 2), `tide-here-${current.days[0].date}.json`); });
$('#download-history').addEventListener('click', () => download(history.export(), 'tide-here-history.json'));
$('#clear-history').addEventListener('click', () => { if (window.confirm('Clear this browser’s saved forecast history? The tide model remains in this file.')) { history.clear(); showHistory(); } });
$('#import-history').addEventListener('change', async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 10*1024*1024) throw new Error('History backups must be smaller than 10 MB.');
    history.import(await file.text()); showHistory();
  } catch (error) { $('#history-status').textContent = error.message; }
  finally { event.target.value = ''; }
});
showHistory();
window.tideReady = Promise.all([inflate(harmonicsGzip), inflate(placesGzip), workerReady]).then(([harmonicBytes, placeBytes]) => {
  data = decodeHarmonics(harmonicBytes); places = makePlaceIndex(JSON.parse(new TextDecoder().decode(placeBytes)).places);
  $('#runtime-status').textContent = `Ready offline · ${data.metadata.count.toLocaleString('en-US')} coastal points · ${places.length.toLocaleString('en-US')} places`;
  $('#search-online').disabled = false;
  $('#show-selection').disabled = false; $('#show-here').disabled = false; showHistory();
  // Optional local deep links contain plain place/date text, never executable code.
  const link = new URLSearchParams(location.hash.slice(1));
  if (link.has('place')) {
    $('#place-input').value = link.get('place').slice(0, 500);
    $('#start-date').value = link.get('date') || '';
    search();
  }
}).catch(error => { $('#runtime-status').textContent = 'Unable to open the offline app'; state('This browser could not start the app', error.message); });
