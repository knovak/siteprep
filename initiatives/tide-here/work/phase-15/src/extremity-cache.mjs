// Keeps extremity records in browser storage and loads missing ones in the
// background. Every storage access is guarded: blocked or full storage only
// means the record is fetched again next time.
import { recordMatches } from './extremity.mjs';

export const EXTREMITY_CACHE_PREFIX = 'tide-here.extremity.v1.';
export const EXTREMITY_CACHE_LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export function extremityKey({ provider, stationId, datum, year }) {
  return `${EXTREMITY_CACHE_PREFIX}${provider}.${stationId}.${datum}.${year}`;
}

// A record stays usable through the end of its year plus 31 days, so the
// December-to-January rule can still use the previous year's record.
export function extremityExpiresAt(year) {
  return Date.UTC(year + 1, 0, 1) + 31 * DAY_MS;
}

export function extremityTarget(forecast) {
  const year = Number(forecast?.days?.[0]?.date?.slice(0, 4));
  if (!forecast?.station?.provider || !forecast.station.id || !forecast.station.datum || !Number.isInteger(year)) return null;
  return Object.freeze({
    provider: forecast.station.provider,
    stationId: String(forecast.station.id),
    datum: forecast.station.datum,
    unit: 'm',
    year
  });
}

export class ExtremityCache {
  constructor({ storage = null, now = () => Date.now(), limit = EXTREMITY_CACHE_LIMIT } = {}) {
    this.storage = storage;
    this.now = () => new Date(now()).getTime();
    this.limit = limit;
    this.memory = new Map();
  }

  read(target) {
    if (!target) return null;
    const key = extremityKey(target);
    const remembered = this.memory.get(key);
    if (remembered && recordMatches(remembered, target)) return remembered;
    try {
      const entry = JSON.parse(this.storage?.getItem(key) ?? 'null');
      if (!entry || !(this.now() < entry.expiresAt) || !recordMatches(entry.record, target)) return null;
      this.memory.set(key, entry.record);
      return entry.record;
    } catch {
      return null;
    }
  }

  write(target, record) {
    if (!target || !recordMatches(record, target)) return false;
    const key = extremityKey(target);
    this.memory.set(key, record);
    if (!this.storage) return false;
    try {
      this.storage.setItem(key, JSON.stringify({ expiresAt: extremityExpiresAt(record.year), record }));
      this.prune();
      return true;
    } catch {
      return false;
    }
  }

  // Removes expired and unreadable entries, then the oldest beyond the limit.
  prune() {
    const entries = [];
    for (let index = 0; index < (this.storage?.length ?? 0); index += 1) {
      const key = this.storage.key(index);
      if (!key?.startsWith(EXTREMITY_CACHE_PREFIX)) continue;
      let entry = null;
      try { entry = JSON.parse(this.storage.getItem(key)); } catch { entry = null; }
      entries.push({ key, entry });
    }
    const live = [];
    for (const { key, entry } of entries) {
      if (!entry?.record || !(this.now() < entry.expiresAt)) this.storage.removeItem(key);
      else live.push({ key, computedAt: Date.parse(entry.record.computedAt) || 0 });
    }
    live.sort((left, right) => right.computedAt - left.computedAt);
    for (const { key } of live.slice(this.limit)) {
      this.storage.removeItem(key);
      this.memory.delete(key);
    }
  }
}

// Deduplicates background loads by record key and lets the caller cancel the
// load that belongs to a superseded search.
export class ExtremityLoader {
  constructor({ cache, fetchRecord }) {
    if (!cache || typeof fetchRecord !== 'function') throw new TypeError('Extremity loading needs a cache and a fetcher');
    this.cache = cache;
    this.fetchRecord = fetchRecord;
    this.pending = new Map();
  }

  cached(target) {
    return this.cache.read(target);
  }

  load(target, station) {
    if (!target) return { promise: Promise.resolve(null), cancel() {} };
    const cached = this.cache.read(target);
    if (cached) return { promise: Promise.resolve(cached), cancel() {} };
    const key = extremityKey(target);
    let entry = this.pending.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, users: 0 };
      entry.promise = this.fetchRecord({ target, station, signal: controller.signal })
        .then((record) => {
          if (controller.signal.aborted || !recordMatches(record, target)) return null;
          this.cache.write(target, record);
          return record;
        })
        .catch(() => null)
        .finally(() => { if (this.pending.get(key) === entry) this.pending.delete(key); });
      this.pending.set(key, entry);
    }
    entry.users += 1;
    let cancelled = false;
    return {
      promise: entry.promise.then((record) => (cancelled ? null : record)),
      cancel: () => {
        if (cancelled) return;
        cancelled = true;
        entry.users -= 1;
        if (entry.users <= 0) {
          entry.controller.abort();
          if (this.pending.get(key) === entry) this.pending.delete(key);
        }
      }
    };
  }
}
