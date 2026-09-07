const KEY = 'tide-here-wasm-history/v1';
export function createHistory(storage) {
  let entries = [], warning = '';
  try {
    const raw = storage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(validEntry)) throw new Error('Invalid history');
      entries = parsed.slice(-100);
    }
  } catch { warning = 'Saved history is unavailable. Tide calculations still work; download history to keep a separate copy.'; }
  function save(next) {
    entries = next.slice(-100);
    try { storage.setItem(KEY, JSON.stringify(entries)); warning = ''; }
    catch { warning = 'History is only in this window because browser storage is unavailable or full. Download a copy before closing.'; }
  }
  return {read: () => entries, warning: () => warning,
    append(forecast) { save([...entries, {recordedAt: new Date().toISOString(), forecast}]); },
    clear() { save([]); },
    import(text) {
      const data = JSON.parse(text);
      if (data.schema !== 'tide-here/standalone-history/v1' || !Array.isArray(data.entries) ||
          data.entries.length > 100 || !data.entries.every(validEntry)) throw new Error('This is not a Tide Here history backup.');
      const combined = [...entries, ...data.entries];
      const unique = [...new Map(combined.map(e => [JSON.stringify(e), e])).values()];
      save(unique);
    },
    export() { return JSON.stringify({schema: 'tide-here/standalone-history/v1', entries}, null, 2); }
  };
}
function validEntry(entry) {
  const f = entry?.forecast;
  return Number.isFinite(Date.parse(entry?.recordedAt)) && f?.schema === 'tide-here/standalone-forecast/v1' &&
    typeof f.input?.display === 'string' && typeof f.place?.label === 'string' &&
    Number.isFinite(f.place.latitude) && Math.abs(f.place.latitude) <= 90 &&
    Number.isFinite(f.place.longitude) && Math.abs(f.place.longitude) <= 180 &&
    typeof f.timeZone === 'string' && Array.isArray(f.days) && f.days.length === 5;
}
