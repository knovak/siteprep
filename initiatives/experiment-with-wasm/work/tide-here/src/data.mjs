export function decodeHarmonics(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint32(0, true);
  const metadata = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + headerLength)));
  const offset = 4 + headerLength;
  if (metadata.schema !== 'tide-here/compact-harmonics/v1' ||
      offset + metadata.count * metadata.recordBytes !== bytes.length) throw new Error('Invalid bundled tide data.');
  function point(index, includeConstituents = true) {
    if (!Number.isInteger(index) || index < 0 || index >= metadata.count) throw new RangeError('Unknown tide point.');
    const at = offset + index * metadata.recordBytes;
    const latitude = view.getFloat64(at, true), longitude = view.getFloat64(at + 8, true);
    return {index, id: `coastal-${index}`, latitude, longitude,
      name: `Coastal point ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      timeZone: metadata.zones[view.getUint16(at + 16, true)],
      interpolationQuality: view.getInt16(at + 18, true),
      ...(includeConstituents ? {constituents: metadata.constituents.map((name, i) => ({
        name, amplitude: view.getFloat32(at + 20 + i * 8, true), phase: view.getFloat32(at + 24 + i * 8, true)
      }))} : {})};
  }
  const locations = Array.from({length: metadata.count}, (_, i) => point(i, false));
  return {metadata, point, locations};
}

export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const hav = Math.sin((b.latitude-a.latitude)*rad/2)**2 +
    Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin((b.longitude-a.longitude)*rad/2)**2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, hav)));
}

export function nearbyPoints(data, place) {
  // Preserve the original global provider's 40 km coverage rule, including across the date line.
  return data.locations.filter(p => Math.abs(p.latitude - place.latitude) < 0.37)
    .map(p => ({...p, distanceKm: distanceKm(p, place)}))
    .filter(p => p.distanceKm <= 40).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8);
}

export const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').trim();
export function makePlaceIndex(rows) {
  const countryNames = new Intl.DisplayNames(['en'], {type: 'region'});
  return rows.map(p => ({id: p[0], name: p[1], country: p[2], region: p[3],
    latitude: p[4], longitude: p[5], population: p[6],
    label: `${p[1]}, ${p[3] ? p[3]+', ' : ''}${countryNames.of(p[2]) || p[2]}`,
    search: normalize(p[7]), context: normalize(`${p[3]} ${p[2]} ${countryNames.of(p[2]) || ''}`)}));
}

export function searchPlaces(index, query) {
  const [name, ...context] = normalize(query).split(',').map(s => s.trim());
  if (!name || name.length < 2) return [];
  const matches = index.filter(p => p.search.includes(name) && context.every(s => p.context.includes(s)));
  return matches.sort((a, b) => Number(b.search.split('|').includes(name)) - Number(a.search.split('|').includes(name)) ||
    b.population - a.population).slice(0, 12);
}

export function parseCoordinates(input) {
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*[,; ]\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/.exec(input);
  if (!match) return null;
  const latitude = Number(match[1]), longitude = Number(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('Latitude must be −90 to 90 and longitude −180 to 180.');
  return {latitude, longitude, label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`};
}
