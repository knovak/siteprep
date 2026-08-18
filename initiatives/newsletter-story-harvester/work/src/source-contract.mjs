/** Shared validation and post-search attribution for every message source. */
export function actualFromMatchesEntry(message, entry) {
  const from = matchersFor(entry).filter((matcher) => matcher.type === 'from');
  return from.length === 0 || from.some((matcher) => actualFromMatches(message.from, matcher.value));
}

export function matchersFor(entry) {
  return matcherGroupsFor(entry).flat();
}

export function matcherGroupsFor(entry) {
  const groups = Array.isArray(entry?.match) ? entry.match : [entry?.match].filter(Boolean);
  if (!groups.length) throw new Error(`inventory source ${entry?.key || '(unknown)'} has no matchers`);
  return groups.map((group) => {
    const matchers = Array.isArray(group?.all) ? group.all : [group];
    if (!matchers.length) throw new Error(`inventory source ${entry?.key || '(unknown)'} has an empty all matcher`);
    return matchers.map((matcher) => validateMatcher(matcher, entry));
  });
}

function validateMatcher(matcher, entry) {
  if (!matcher || typeof matcher !== 'object' || !matcher.type || !matcher.value) {
    throw new Error(`inventory source ${entry?.key || '(unknown)'} has an invalid matcher`);
  }
  if (!['from', 'label', 'subject'].includes(matcher.type)) {
    throw new Error(`inventory source ${entry?.key || '(unknown)'} has unknown matcher ${matcher.type}`);
  }
  return matcher;
}

function actualFromMatches(actual, expected) {
  return String(expected).includes('@')
    ? addressOf(actual) === addressOf(expected)
    : String(actual || '').toLowerCase().includes(String(expected).toLowerCase());
}

export function addressOf(value) {
  const text = String(value || '').trim().toLowerCase();
  return (text.match(/<([^>]+)>/)?.[1] || text).trim();
}
