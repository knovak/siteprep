import {evaluateSelectionNode, normaliseTitle, ordinarySelectionTags, parseSelection} from './selections.mjs';

function terms(node) {
  if (!node) return [];
  if (node.type === 'tag') return [node];
  if (node.type === 'not') return terms(node.value);
  return [...terms(node.left), ...terms(node.right)];
}

function mayMatch(node, prefix) {
  if (node.match === 'exact') return node.value.startsWith(prefix);
  if (node.match === 'prefix') return prefix.startsWith(node.value) || node.value.startsWith(prefix);
  return prefix.startsWith(node.namespace) || node.namespace.startsWith(prefix);
}

export function selectionDictionaries(expression) {
  const nodes = terms(parseSelection(expression));
  return {
    tags: nodes.length > 0,
    sites: nodes.some(node => mayMatch(node, 'site:')),
    titles: nodes.some(node => mayMatch(node, 'title:')),
  };
}

// Resolve Unicode-normalized aliases from distinct keys, never full bookmark
// records. SQL still filters, counts and limits before hydrating card metadata.
export function compileSelectionSql(expression, {collectionId, tags = [], sites = [], titles = []}) {
  const ast = parseSelection(expression);
  const values = [];
  let captures = false;
  const tagKeys = tags.map(tag => [tag, ordinarySelectionTags([tag])]);
  const siteKeys = sites.map(url => {
    try { return [url, 'site:' + new URL(url).hostname.toLowerCase().replace(/^www\./, '')]; }
    catch { return [url, '']; }
  }).filter(([, key]) => key !== 'site:' && key);
  const titleKeys = titles.map(row => [row, row.title_key || normaliseTitle(row.title)]);
  function members(column, list) {
    if (!list.length) return '0';
    const index = values.push([...new Set(list)]) - 1;
    return `${column} IN (SELECT value FROM json_each((SELECT data FROM filter_values), '$[${index}]'))`;
  }
  function compile(node) {
    if (!node) return '1';
    if (node.type === 'not') return `(NOT ${compile(node.value)})`;
    if (node.type !== 'tag') return `(${compile(node.left)} ${node.type.toUpperCase()} ${compile(node.right)})`;
    const matches = key => evaluateSelectionNode(node, new Set([key]));
    if (matches('collection:' + collectionId)) return '1';
    const clauses = [];
    const raw = tagKeys.filter(([, keys]) => evaluateSelectionNode(node, keys)).map(([tag]) => tag);
    if (raw.length) clauses.push(`EXISTS (SELECT 1 FROM tags t WHERE t.item_id = i.id AND ${members('t.tag', raw)})`);
    const verdicts = [[null, 'untriaged'], ['keeper', 'keep'], ['junk', 'junk'], ['archive', 'archive'], ['needs-more-time', 'needs-time']]
      .filter(([, key]) => matches('verdict:' + key)).map(([value]) => value);
    if (verdicts.length === 5) return '1';
    if (verdicts.includes(null)) clauses.push('i.verdict IS NULL');
    const judged = verdicts.filter(value => value !== null);
    if (judged.length) clauses.push(`COALESCE(${members('i.verdict', judged)}, 0)`);
    const images = ['present', 'failed', 'none'].filter(value => matches('image:' + value));
    if (images.length === 3) return '1';
    if (images.length) {
      captures = true;
      clauses.push(members(`CASE
        WHEN c.image_ref IS NOT NULL AND c.image_ref != '' AND c.state != ''
          AND NOT COALESCE(q.reason = 'duplicate-image' AND q.state != 'complete', 0) THEN 'present'
        WHEN c.state != '' AND (c.state = 'pass1-error' OR COALESCE(c.error_tag, '') != '') THEN 'failed'
        ELSE 'none' END`, images));
    }
    if (mayMatch(node, 'site:')) clauses.push(members('i.url', siteKeys.filter(([, key]) => matches(key)).map(([url]) => url)));
    if (mayMatch(node, 'title:')) {
      const matching = titleKeys.filter(([, key]) => key && matches('title:' + key)).map(([row]) => row);
      clauses.push(members('i.title_key', matching.filter(row => row.title_key).map(row => row.title_key)));
      const missing = matching.filter(row => !row.title_key).map(row => row.title);
      if (missing.length) clauses.push(`(i.title_key = '' AND ${members('i.title', missing)})`);
    }
    return clauses.length ? `(${clauses.join(' OR ')})` : '0';
  }
  const sql = compile(ast);
  return {sql, values: JSON.stringify(values), captures};
}

export function pageCursor(item) {
  return item ? {date: item.added_at ?? item.ingested_at, id: item.id} : null;
}

export function validateCursor(cursor) {
  if (cursor === null || cursor === undefined) return null;
  if (!cursor || typeof cursor !== 'object' || typeof cursor.date !== 'string' || !cursor.date
    || typeof cursor.id !== 'string' || !cursor.id || cursor.date.length > 100 || cursor.id.length > 200) {
    throw new Error('Invalid page cursor');
  }
  return {date: cursor.date, id: cursor.id};
}
