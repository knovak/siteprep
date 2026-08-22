export const HISTORY_KEY = 'tide-here.history.v1';
export const HISTORY_LIMIT = 100;
export const FORECAST_CACHE_PREFIX = 'tide-here.forecast.v1.';
export const FORECAST_CACHE_INDEX_KEY = 'tide-here.forecast-index.v1';

function requireStorage(storage) {
  if (
    !storage ||
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function'
  ) throw new TypeError('Local data requires getItem, setItem, and removeItem storage methods');
  return storage;
}

function parseArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function completeForecast(response) {
  return Boolean(
    response?.input?.display &&
    response?.place?.name &&
    response?.coast?.name &&
    response?.station?.provider &&
    response?.station?.name &&
    Array.isArray(response?.days) &&
    Array.isArray(response?.warnings)
  );
}

export class LocalHistory {
  constructor({ storage, now = () => new Date() }) {
    this.storage = requireStorage(storage);
    if (typeof now !== 'function') throw new TypeError('Local history requires a clock');
    this.now = now;
  }

  read() {
    return parseArray(this.storage.getItem(HISTORY_KEY));
  }

  append(response) {
    if (!completeForecast(response)) throw new TypeError('History accepts a complete normalized forecast');
    const recordedAt = new Date(this.now()).toISOString();
    const entries = [...this.read(), { recordedAt, response }].slice(-HISTORY_LIMIT);
    this.storage.setItem(HISTORY_KEY, JSON.stringify(entries));
    return entries;
  }

  clear() {
    this.storage.removeItem(HISTORY_KEY);
  }

  downloadText() {
    return `${JSON.stringify(this.read(), null, 2)}\n`;
  }
}

function normalizedInput(input) {
  return String(input || '').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}

async function sha256(value, cryptoImpl) {
  if (!cryptoImpl?.subtle?.digest) throw new TypeError('Forecast cache requires Web Crypto');
  const bytes = new TextEncoder().encode(value);
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function coastHour(now, timeZone) {
  const instant = new Date(now);
  if (!Number.isFinite(instant.getTime())) throw new RangeError('Forecast cache requires a valid instant');
  if (!timeZone) throw new TypeError('Forecast cache requires a coast time zone');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(instant).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
}

export class ForecastCache {
  constructor({ storage, cryptoImpl = globalThis.crypto, now = () => new Date() }) {
    this.storage = requireStorage(storage);
    if (typeof now !== 'function') throw new TypeError('Forecast cache requires a clock');
    this.cryptoImpl = cryptoImpl;
    this.now = now;
  }

  contextHour(context) {
    return coastHour(context.now ?? this.now(), context.timeZone);
  }

  async key(context) {
    const station = context.station;
    if (!station?.provider || !station?.id) throw new TypeError('Forecast cache requires a station');
    const value = JSON.stringify({
      input: normalizedInput(context.input),
      provider: station.provider,
      station: station.id,
      timeZone: context.timeZone,
      hour: this.contextHour(context)
    });
    return `${FORECAST_CACHE_PREFIX}${await sha256(value, this.cryptoImpl)}`;
  }

  async read(context) {
    const key = await this.key(context);
    try {
      const cached = JSON.parse(this.storage.getItem(key));
      if (cached?.hour === this.contextHour(context) && completeForecast(cached.result)) return cached.result;
    } catch {
      // A malformed or missing cache value is a miss.
    }
    return null;
  }

  async write(context, result) {
    if (!completeForecast(result)) throw new TypeError('Forecast cache accepts a complete normalized forecast');
    const key = await this.key(context);
    for (const oldKey of parseArray(this.storage.getItem(FORECAST_CACHE_INDEX_KEY))) {
      if (oldKey !== key && String(oldKey).startsWith(FORECAST_CACHE_PREFIX)) this.storage.removeItem(oldKey);
    }
    this.storage.setItem(key, JSON.stringify({ hour: this.contextHour(context), result }));
    this.storage.setItem(FORECAST_CACHE_INDEX_KEY, JSON.stringify([key]));
    return result;
  }
}
