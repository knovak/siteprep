export const INVALID_INPUT = 'invalid-input';
export const PLACE_NOT_FOUND = 'place-not-found';
export const GEOCODER_UNAVAILABLE = 'geocoder-unavailable';

function numericCoordinates(input) {
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/.exec(input);
  if (!match) return null;
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}

export function parsePlaceInput(input) {
  const display = typeof input === 'string' ? input : '';
  const trimmed = display.trim();
  if (!trimmed) return Object.freeze({ ok: false, code: INVALID_INPUT, display });
  const coordinates = numericCoordinates(trimmed);
  if (coordinates) {
    if (
      coordinates.latitude < -90 || coordinates.latitude > 90 ||
      coordinates.longitude < -180 || coordinates.longitude > 180
    ) return Object.freeze({ ok: false, code: INVALID_INPUT, display });
    return Object.freeze({ ok: true, kind: 'coordinates', display, ...coordinates });
  }
  if (/^[\s+\-.,\d]+$/.test(trimmed)) return Object.freeze({ ok: false, code: INVALID_INPUT, display });
  return Object.freeze({ ok: true, kind: 'text', display, query: trimmed });
}

async function sha256(value, cryptoImpl) {
  if (!cryptoImpl?.subtle?.digest) throw new TypeError('Geocoder cache requires Web Crypto');
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function storageAdapter(storage) {
  if (!storage) return null;
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Geocoder storage must provide getItem and setItem');
  }
  return storage;
}

function normalizedPlace(value, fallbackName) {
  const latitude = Number(value?.lat);
  const longitude = Number(value?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return Object.freeze({
    name: String(value.display_name || value.name || fallbackName).trim(),
    lat: latitude,
    lon: longitude
  });
}

function source(config, retrievedAt) {
  return Object.freeze({
    provider: config.provider,
    attribution: config.attribution,
    licenceUrl: config.licenceUrl,
    policyUrl: config.policyUrl,
    retrievedAt
  });
}

export class Geocoder {
  constructor({
    config,
    fetchImpl = globalThis.fetch,
    storage = null,
    cryptoImpl = globalThis.crypto,
    now = () => Date.now(),
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
  }) {
    if (!config?.searchUrl || !config?.reverseUrl || !config?.provider) throw new TypeError('Geocoder requires provider configuration');
    if (typeof fetchImpl !== 'function') throw new TypeError('Geocoder requires fetch');
    if (typeof now !== 'function' || typeof sleep !== 'function') throw new TypeError('Geocoder requires clock functions');
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.storage = storageAdapter(storage);
    this.cryptoImpl = cryptoImpl;
    this.now = now;
    this.sleep = sleep;
    this.lastRequestAt = Number.NEGATIVE_INFINITY;
  }

  async cacheKey(parsed) {
    const normalized = parsed.kind === 'text'
      ? `forward:${parsed.query.toLocaleLowerCase('en').replace(/\s+/g, ' ')}`
      : `reverse:${parsed.latitude.toFixed(5)},${parsed.longitude.toFixed(5)}`;
    return `tide-here.geocoder.v1.${await sha256(normalized, this.cryptoImpl)}`;
  }

  async cached(key) {
    if (!this.storage) return null;
    try {
      const value = JSON.parse(await this.storage.getItem(key));
      if (Number.isFinite(value?.savedAt) && this.now() - value.savedAt < this.config.cacheTtlMs && value.result) return value.result;
    } catch {
      // A malformed or missing cache value is a miss.
    }
    return null;
  }

  async store(key, result) {
    if (this.storage) await this.storage.setItem(key, JSON.stringify({ savedAt: this.now(), result }));
  }

  async request(url) {
    const wait = Math.max(0, this.config.minimumIntervalMs - (this.now() - this.lastRequestAt));
    if (wait) await this.sleep(wait);
    this.lastRequestAt = this.now();
    const response = await this.fetchImpl(url);
    if (!response?.ok) throw new Error(`Geocoder returned HTTP ${response?.status ?? 'error'}`);
    return response.json();
  }

  async resolve(input) {
    const parsed = parsePlaceInput(input);
    if (!parsed.ok) return parsed;
    const key = await this.cacheKey(parsed);
    const cached = await this.cached(key);
    if (cached) return Object.freeze({ ...cached, input: Object.freeze({ display: parsed.display }), cache: 'hit' });

    try {
      const url = new URL(parsed.kind === 'text' ? this.config.searchUrl : this.config.reverseUrl);
      url.searchParams.set('format', this.config.format);
      url.searchParams.set('addressdetails', '1');
      if (parsed.kind === 'text') {
        url.searchParams.set('q', parsed.query);
        url.searchParams.set('limit', '1');
      } else {
        url.searchParams.set('lat', String(parsed.latitude));
        url.searchParams.set('lon', String(parsed.longitude));
      }
      const payload = await this.request(url);
      const value = parsed.kind === 'text' ? payload?.[0] : payload;
      const fallback = parsed.kind === 'text'
        ? parsed.query
        : `${parsed.latitude.toFixed(5)}, ${parsed.longitude.toFixed(5)}`;
      const place = normalizedPlace(value, fallback);
      if (!place && parsed.kind === 'text') return Object.freeze({ ok: false, code: PLACE_NOT_FOUND, input: Object.freeze({ display: parsed.display }) });
      const resolvedPlace = place || Object.freeze({ name: fallback, lat: parsed.latitude, lon: parsed.longitude });
      const result = Object.freeze({
        ok: true,
        code: null,
        input: Object.freeze({ display: parsed.display }),
        place: resolvedPlace,
        source: source(this.config, new Date(this.now()).toISOString()),
        cache: 'provider'
      });
      await this.store(key, result);
      return result;
    } catch {
      return Object.freeze({ ok: false, code: GEOCODER_UNAVAILABLE, input: Object.freeze({ display: parsed.display }) });
    }
  }
}
