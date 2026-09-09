const VERDICTS = new Set(['keeper', 'junk', 'archive', 'needs-more-time']);

// Resolve a mixed sweep before any writes, while retaining the uniform verdict API.
export function verdictsForItems(itemIds, verdict, itemVerdicts = {}) {
  if (!VERDICTS.has(verdict)) throw new Error(`Unsupported verdict: ${verdict}`);
  if (!itemVerdicts || typeof itemVerdicts !== 'object' || Array.isArray(itemVerdicts)) {
    throw new Error('Item verdicts must be an object');
  }
  for (const value of Object.values(itemVerdicts)) {
    if (!VERDICTS.has(value)) throw new Error(`Unsupported verdict: ${value}`);
  }
  return new Map(itemIds.map(id => [id, Object.hasOwn(itemVerdicts, id) ? itemVerdicts[id] : verdict]));
}
