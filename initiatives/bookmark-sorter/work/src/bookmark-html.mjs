const STRUCTURAL_TOKEN = /<\/?DL\b[^>]*>|<H3\b[^>]*>[\s\S]*?<\/H3>|<A\b[^>]*>[\s\S]*?<\/A>|<DD\b[^>]*>[\s\S]*?(?=(?:<DT\b|<\/?DL\b|<H3\b|<A\b|$))/gi;

const ENTITIES = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['gt', '>'],
  ['lt', '<'],
  ['quot', '"'],
  ['nbsp', ' '],
]);

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1].toLowerCase() === 'x';
      const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return ENTITIES.get(entity.toLowerCase()) ?? match;
  });
}

function textContent(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attributes(value) {
  const result = new Map();
  const openingTag = value.match(/^<A\b([^>]*)>/i)?.[1] ?? '';
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of openingTag.matchAll(pattern)) {
    result.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  return result;
}

export function parseBookmarkHtml(html) {
  if (typeof html !== 'string') throw new TypeError('Bookmark export must be text');

  const items = [];
  const folders = [];
  const scopes = [];
  let pendingFolder = null;
  let lastItem = null;

  for (const match of html.matchAll(STRUCTURAL_TOKEN)) {
    const token = match[0];
    if (/^<H3\b/i.test(token)) {
      pendingFolder = textContent(token.replace(/^<H3\b[^>]*>|<\/H3>$/gi, ''));
      continue;
    }
    if (/^<DL\b/i.test(token)) {
      const opensFolder = pendingFolder !== null;
      scopes.push(opensFolder);
      if (opensFolder) folders.push(pendingFolder);
      pendingFolder = null;
      continue;
    }
    if (/^<\/DL/i.test(token)) {
      if (scopes.pop()) folders.pop();
      lastItem = null;
      continue;
    }
    if (/^<A\b/i.test(token)) {
      const attrs = attributes(token);
      const url = attrs.get('href');
      if (!url) continue;
      const item = {
        title: textContent(token.replace(/^<A\b[^>]*>|<\/A>$/gi, '')),
        url,
        add_date: attrs.get('add_date') ?? null,
        folder_path: folders.join('/'),
        note: null,
      };
      items.push(item);
      lastItem = item;
      continue;
    }
    if (/^<DD\b/i.test(token) && lastItem) {
      const note = textContent(token.replace(/^<DD\b[^>]*>/i, ''));
      lastItem.note = note || null;
    }
  }

  return items;
}
