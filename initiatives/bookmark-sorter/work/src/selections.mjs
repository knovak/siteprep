export class SelectionSyntaxError extends Error {
  constructor(message, position) {
    super(`${message} at character ${position + 1}`);
    this.name = 'SelectionSyntaxError';
    this.position = position;
  }
}

const VERDICT_PROPOSAL_KEYS = Object.freeze(['archive', 'junk', 'keep', 'needs-time', 'untriaged']);

/** A stable, expression-safe key shared by human-readable selection values. */
export function normaliseSearchValue(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replaceAll(' ', '-');
}

/** Preserve the stored title-key contract while sharing its normalisation rule. */
export function normaliseTitle(value) {
  return normaliseSearchValue(value);
}

function normaliseTagSearchValue(value) {
  const source = String(value || '');
  const separator = source.indexOf(':');
  if (separator < 0) return normaliseSearchValue(source);
  const prefix = normaliseSearchValue(source.slice(0, separator));
  const suffix = normaliseSearchValue(source.slice(separator + 1));
  return prefix && suffix ? `${prefix}:${suffix}` : normaliseSearchValue(source);
}

function hasTagPrefix(tag, prefix) {
  return String(tag).slice(0, prefix.length + 1).toLowerCase() === `${prefix}:`;
}

export function wrapUiSelection(collectionId, expression = '') {
  if (!collectionId) throw new Error('A current collection is required');
  const scope = `collection:${collectionId}`;
  return String(expression).trim() ? `${scope} and (${expression})` : scope;
}

/** Parse once and return a predicate over an item's ordinary and synthetic tags. */
export function compileSelection(expression) {
  const source = String(expression ?? '').trim();
  if (!source) return () => true;
  const parser = new Parser(source);
  const ast = parser.parse();
  return item => evaluate(ast, selectionTags(item));
}

export function evaluateSelection(items, expression, {collectionId = null} = {}) {
  const effective = collectionId === null ? String(expression ?? '') : wrapUiSelection(collectionId, expression);
  const matches = compileSelection(effective);
  return items.filter(matches);
}

export function selectionTags(item) {
  const tags = new Set(item.tags || []);
  if (item.collection_id) tags.add(`collection:${item.collection_id}`);
  tags.add(`verdict:${selectionVerdict(item.verdict)}`);
  tags.add(`image:${selectionImage(item.capture)}`);
  const site = siteKey(item.url);
  if (site) tags.add(`site:${site}`);
  const titleKey = item.title_key || normaliseTitle(item.title);
  if (titleKey) tags.add(`title:${titleKey}`);
  for (const tag of item.tags || []) {
    tags.add(`tag-key:${encodeURIComponent(tag)}`);
    if (hasTagPrefix(tag, 'src')) {
      const key = normaliseSearchValue(tag.slice(4));
      if (key) tags.add(`src:${key}`);
    } else if (hasTagPrefix(tag, 'folder')) {
      const folder = tag.slice(7);
      const key = normaliseSearchValue(folder);
      if (key) tags.add(`folder:${key}`);
      tags.add(`folder-key:${encodeURIComponent(folder)}`);
    } else {
      const key = normaliseTagSearchValue(tag);
      if (key) tags.add(key);
    }
  }
  return tags;
}

function selectionVerdict(verdict) {
  if (!verdict) return 'untriaged';
  if (verdict === 'keeper') return 'keep';
  if (verdict === 'needs-more-time') return 'needs-time';
  return verdict;
}

function selectionImage(capture) {
  if (capture?.image_ref && capture.displayable !== false) return 'present';
  if (capture?.state === 'pass1-error' || capture?.error_tag) return 'failed';
  return 'none';
}

export function proposeSelections(items, {minimum = 2} = {}) {
  const proposals = [
    ...groupProposalValues(items, 'src', item => (item.tags || [])
      .filter(tag => hasTagPrefix(tag, 'src'))
      .map(tag => normaliseSearchValue(tag.slice(4))), key => `src:${key}`),
    ...groupProposalValues(items, 'tag', item => (item.tags || [])
      .filter(tag => !hasTagPrefix(tag, 'src') && !hasTagPrefix(tag, 'folder') && !tag.startsWith('err:'))
      .map(normaliseTagSearchValue), key => key),
    ...verdictProposals(items),
    ...errorProposals(items),
    ...groupProposalValues(items, 'folder', item => (item.tags || [])
      .filter(tag => hasTagPrefix(tag, 'folder'))
      .map(tag => normaliseSearchValue(tag.slice(7))), key => `folder:${key}`),
    ...groupProposalValues(items, 'site', item => [siteKey(item.url)]),
    ...groupProposalValues(items, 'image', item => [selectionImage(item.capture)]),
    ...groupProposalValues(items, 'title', item => [item.title_key || normaliseTitle(item.title)]),
  ];
  const includeSingleton = new Set(['src', 'tag', 'error', 'folder', 'image']);
  const kindOrder = new Map(['src', 'tag', 'verdict', 'error', 'folder', 'site', 'image', 'title'].map((kind, index) => [kind, index]));
  return proposals
    .filter(proposal => proposal.kind === 'verdict' || proposal.id === 'error:any'
      || proposal.count >= (includeSingleton.has(proposal.kind) ? 1 : minimum))
    .sort((left, right) => kindOrder.get(left.kind) - kindOrder.get(right.kind)
      || left.name.localeCompare(right.name));
}

function errorProposals(items) {
  const proposals = groupProposalValues(items, 'error', item => (item.tags || [])
    .filter(tag => tag.startsWith('err:')), key => `tag-key:${encodeURIComponent(key)}`);
  return [{
    id: 'error:any',
    kind: 'error',
    key: 'any',
    name: 'any error',
    expression: 'err:*',
    count: items.filter(item => (item.tags || []).some(tag => tag.startsWith('err:'))).length,
  }, ...proposals];
}

function verdictProposals(items) {
  const counts = new Map(VERDICT_PROPOSAL_KEYS.map(key => [key, 0]));
  for (const item of items) {
    const key = selectionVerdict(item.verdict);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [
    ...VERDICT_PROPOSAL_KEYS.map(key => ({
    id: `verdict:${key}`,
    kind: 'verdict',
    key,
    name: key,
    expression: `verdict:${key}`,
    count: counts.get(key),
    })),
    {
      id: 'verdict:not-junk',
      kind: 'verdict',
      key: 'not-junk',
      name: 'not junk',
      expression: 'not verdict:junk',
      count: items.length - counts.get('junk'),
    },
    {
      id: 'verdict:untriaged-or-needs-time',
      kind: 'verdict',
      key: 'untriaged-or-needs-time',
      name: 'untriaged or needs-time',
      expression: 'verdict:untriaged or verdict:needs-time',
      count: counts.get('untriaged') + counts.get('needs-time'),
    },
  ];
}

function groupProposalValues(items, kind, valuesFor, expressionFor = key => `${kind}:${key}`) {
  const groups = new Map();
  for (const item of items) {
    for (const key of new Set(valuesFor(item).filter(Boolean))) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item.id);
    }
  }
  return [...groups].map(([key, ids]) => ({
    id: `${kind}:${key}`,
    kind,
    key,
    name: key,
    expression: expressionFor(key),
    count: ids.length,
  }));
}

function siteKey(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return ''; }
}

function evaluate(node, tags) {
  if (node.type === 'tag') {
    if (node.wildcard) {
      for (const tag of tags) if (tag.startsWith(node.value)) return true;
      return false;
    }
    return tags.has(node.value);
  }
  if (node.type === 'not') return !evaluate(node.value, tags);
  if (node.type === 'and') return evaluate(node.left, tags) && evaluate(node.right, tags);
  return evaluate(node.left, tags) || evaluate(node.right, tags);
}

class Parser {
  constructor(source) {
    this.source = source;
    this.tokens = tokenize(source);
    this.index = 0;
  }

  parse() {
    const result = this.or();
    const extra = this.peek();
    if (extra) throw new SelectionSyntaxError(`Unexpected ${extra.text}`, extra.position);
    return result;
  }

  or() {
    let left = this.and();
    while (this.take('or')) left = {type: 'or', left, right: this.and()};
    return left;
  }

  and() {
    let left = this.unary();
    while (this.take('and')) left = {type: 'and', left, right: this.unary()};
    return left;
  }

  unary() {
    if (this.take('not')) return {type: 'not', value: this.unary()};
    if (this.take('(')) {
      const value = this.or();
      if (!this.take(')')) throw new SelectionSyntaxError('Expected )', this.peek()?.position ?? this.source.length);
      return value;
    }
    const token = this.peek();
    if (!token || ['and', 'or', ')'].includes(token.type)) {
      throw new SelectionSyntaxError('Expected a tag, not, or (', token?.position ?? this.source.length);
    }
    this.index += 1;
    const wildcard = token.text.endsWith('*');
    const value = wildcard ? token.text.slice(0, -1) : token.text;
    if (!value || value.includes('*')) throw new SelectionSyntaxError('A wildcard is allowed only once, at the end of a tag', token.position);
    return {type: 'tag', value, wildcard};
  }

  peek() { return this.tokens[this.index] || null; }
  take(type) {
    if (this.peek()?.type !== type) return false;
    this.index += 1;
    return true;
  }
}

function tokenize(source) {
  const tokens = [];
  let position = 0;
  while (position < source.length) {
    if (/\s/.test(source[position])) { position += 1; continue; }
    if (source[position] === '(' || source[position] === ')') {
      tokens.push({type: source[position], text: source[position], position});
      position += 1;
      continue;
    }
    const start = position;
    while (position < source.length && !/[\s()]/.test(source[position])) position += 1;
    const text = source.slice(start, position);
    const lower = text.toLowerCase();
    tokens.push({type: ['and', 'or', 'not'].includes(lower) ? lower : 'tag', text, position: start});
  }
  return tokens;
}
