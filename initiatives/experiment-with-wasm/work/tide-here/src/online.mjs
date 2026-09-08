import {createWebCache, fetchResource} from '../../src/network.mjs';
import {distanceKm} from './data.mjs';
import {makeForecast} from './forecast.mjs';

export const providers = {
  noaa: {name: 'NOAA CO-OPS', catalogue: 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions',
    predictions: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter', datum: 'MLLW (mean lower low water)',
    licence: 'https://tidesandcurrents.noaa.gov/disclaimers.html'},
  chs: {name: 'Canadian Hydrographic Service', catalogue: 'https://api-sine.dfo-mpo.gc.ca/api/v1/stations?time-series-code=wlp-hilo',
    predictions: 'https://api-sine.dfo-mpo.gc.ca/api/v1/stations/', datum: 'Canadian chart datum',
    licence: 'https://www.tides.gc.ca/en/licence-agreement'}
};
const coordinate = value => value === null || value === undefined || value === '' ? NaN : Number(value);
const valid = s => s.id && s.name && Number.isFinite(s.latitude) && Math.abs(s.latitude) <= 90 && Number.isFinite(s.longitude) && Math.abs(s.longitude) <= 180;
export function normalizeStations(payload, provider) {
  if (provider === 'noaa' && !Array.isArray(payload?.stations) || provider === 'chs' && !Array.isArray(payload)) throw new Error('The station list is invalid.');
  return (provider === 'noaa' ? payload.stations.map(s => ({id: String(s.id || ''), name: s.name, latitude: coordinate(s.lat), longitude: coordinate(s.lng), provider}))
    : payload.filter(s => s.timeSeries?.some(t => t.code === 'wlp-hilo')).map(s => ({id: String(s.id || ''), name: s.officialName, latitude: coordinate(s.latitude), longitude: coordinate(s.longitude), provider}))).filter(valid);
}
export function predictionUrl(station, rows) {
  if (station.provider === 'noaa') {
    const query = new URLSearchParams({product:'predictions', application:'siteprep-wasm', station:station.id, datum:'MLLW', time_zone:'gmt', units:'metric', interval:'hilo', format:'json',
      begin_date: rows[0].startUtc.slice(0,10).replaceAll('-',''), end_date: rows.at(-1).endUtc.slice(0,10).replaceAll('-','')});
    return providers.noaa.predictions + '?' + query;
  }
  return providers.chs.predictions + encodeURIComponent(station.id) + '/data?' + new URLSearchParams({'time-series-code':'wlp-hilo', from:rows[0].startUtc, to:rows.at(-1).endUtc});
}
export function normalizeEvents(payload, provider, rows) {
  const raw = provider === 'noaa' ? payload?.predictions : payload;
  if (!Array.isArray(raw)) throw new Error('The provider did not return tide predictions for these dates.');
  let events = raw.map(p => ({at: provider === 'noaa' ? String(p.t || '').replace(' ','T') + 'Z' : p.eventDate,
    height: coordinate(provider === 'noaa' ? p.v : p.value),
    type: provider === 'noaa' ? p.type === 'H' ? 'high' : p.type === 'L' ? 'low' : null : null}));
  events = events.filter(e => Number.isFinite(Date.parse(e.at)) && Number.isFinite(e.height)).sort((a,b) => Date.parse(a.at)-Date.parse(b.at));
  events = [...new Map(events.map(e => [Date.parse(e.at),e])).values()];
  if (provider === 'chs') {
    // CHS wlp-hilo gives extrema without H/L labels. Reject broken alternation.
    if (events.length < 2) throw new Error('Too few CHS extrema to identify high and low tides.');
    const firstHigh = events[0].height > events[1].height;
    for (let i=0; i<events.length; i++) {
      events[i].type = (i % 2 === 0) === firstHigh ? 'high' : 'low';
      if (i && ((events[i].type === 'high') !== (events[i].height > events[i-1].height) || events[i].height === events[i-1].height)) throw new Error('CHS returned an incomplete sequence of high and low tides.');
    }
  }
  events = events.filter(e => e.type && Date.parse(e.at) >= Date.parse(rows[0].startUtc) && Date.parse(e.at) < Date.parse(rows.at(-1).endUtc))
    .map(e => ({...e, at: new Date(e.at).toISOString(), unit:'m'}));
  if (!events.length) throw new Error('No tide predictions were returned for these dates.');
  return events;
}
export function createOnlineTides({storage, fetchImpl = globalThis.fetch} = {}) {
  const cache = createWebCache(storage, 'tide-here-wasm-online/v1', 32);
  let lastSearch = 0;
  const json = async (url, signal) => (await fetchResource(url, {signal, fetchImpl, maxBytes:6*1024*1024})).json();
  return {
    clear: cache.clear,
    async search(query, signal) {
      if (query.trim().length < 2) throw new Error('Enter a place or address to search.');
      const url = 'https://photon.komoot.io/api/?' + new URLSearchParams({q:query.trim().slice(0,500),limit:'8'});
      return cache.get(url, 7*86400000, async () => {
        if (Date.now()-lastSearch < 1100) throw new Error('Please wait a moment before another online search.');
        lastSearch = Date.now();
        const data = await json(url, signal);
        if (!Array.isArray(data?.features)) throw new Error('The online search response is invalid.');
        return data.features.map(f => {
          const p=f.properties || {}, [longitude,latitude]=f.geometry?.coordinates || [];
          const label = [...new Set([p.name, [p.housenumber,p.street].filter(Boolean).join(' '),p.city,p.state,p.country].filter(Boolean))].join(', ');
          return {id:'osm-'+p.osm_type+'-'+p.osm_id,name:p.name || label,label,latitude,longitude};
        }).filter(valid);
      });
    },
    async stations(place, signal) {
      const results = await Promise.allSettled(Object.entries(providers).map(async ([id,p]) => {
        const result = await cache.get(p.catalogue, 7*86400000, async () => normalizeStations(await json(p.catalogue, signal), id));
        return {...result, provider:id};
      }));
      if (signal?.aborted) throw new DOMException('Cancelled','AbortError');
      const values = results.filter(r=>r.status==='fulfilled').map(r=>r.value);
      if (!values.length) throw new Error('Official station services are unavailable. The bundled model still works.');
      return {stations: values.flatMap(r => r.value.map(s=>({...s, catalogueAt:r.at, catalogueStale:!!r.stale})))
        .map(s=>({...s, distanceKm:distanceKm(s,place)})).filter(s=>s.distanceKm<=150).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12),
        warning: results.some(r=>r.status==='rejected') ? 'One station service is unavailable; results may be incomplete.' : values.some(r=>r.stale) ? 'Using a saved station list because its service is unavailable.' : ''};
    },
    async forecast({place, station, rows, signal, refresh = false}) {
      const url = predictionUrl(station, rows), provider = providers[station.provider];
      const response = await cache.get(url, 6*3600000, async () => normalizeEvents(await json(url,signal), station.provider, rows), {refresh});
      if (signal?.aborted) throw new DOMException('Cancelled','AbortError');
      const forecast = {...makeForecast({place, point:station, rows, events:response.value, dataset:{}})};
      forecast.engine = {runtime:'Public tide prediction API', provider:station.provider};
      forecast.datum = provider.datum;
      forecast.sources = [{provider:provider.name, stationId:station.id, stationName:station.name, sourceUrl:url, licenceUrl:provider.licence, retrievedAt:new Date(response.at).toISOString()}];
      forecast.online = {provider:provider.name, cached:response.cached, stale:!!response.stale, retrievedAt:new Date(response.at).toISOString()};
      forecast.warnings = [{code:'station-selection',message:'Predictions are for the selected station; the nearest station may be across a bay or island. Not for navigation or safety decisions.'}];
      if (response.stale) forecast.warnings.push({code:'saved-predictions',message:'Showing saved predictions because the live request failed: '+response.warning});
      return forecast;
    }
  };
}
