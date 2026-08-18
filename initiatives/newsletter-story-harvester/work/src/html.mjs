// Reading an issue - the structural half of extraction.
//
// `spec.md` §3.3 is the constraint that shapes this file: identity must be
// structural, never derived from model output. So the *document* owns the link
// positions, the heading paths and the text; the model owns only the reading
// (`spec.md` §3, option D). Everything a record's identity depends on is
// computed here, from the bytes, and is the same on every run.
//
// This is a deliberately small reader and it is honest about what it is not.
// It handles the HTML newsletters are actually written in - nested inline tags,
// tables for layout, entities - and it does not attempt to be a parser. Where
// it cannot tell what it is looking at it says so (`readDocument` throws)
// rather than returning something plausible, which is the failure mode a
// half-parser has and the reason `plan.md` §3 puts the model behind a contract
// rather than behind a scraper.

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'col']);
const BLOCK_TAGS = new Set([
  'p', 'div', 'li', 'tr', 'td', 'section', 'article', 'header', 'footer', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'body'
]);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”'
};

/** Decode the entity set newsletters actually use, plus numeric references. */
export function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    const named = ENTITIES[body.toLowerCase()];
    return named === undefined ? whole : named;
  });
}

/**
 * The comparison form for "extraction never invents text" (`spec.md` §3.1).
 *
 * Entities decoded, whitespace collapsed, and the quote and dash characters a
 * mail client substitutes folded to their ASCII forms - a blurb that came back
 * with a straight apostrophe where the issue had a curly one is the same blurb,
 * and treating it as invented would make the strongest check in the suite fire
 * on typography.
 */
export function normaliseText(text) {
  return decodeEntities(String(text ?? ''))
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Read an issue into the structure extraction is allowed to depend on.
 *
 * Returns `{ doc_id, links, headings, plain_text }`. A link's `index` is its
 * ordinal position in the document and is what `source_anchor` is built from
 * on the link shapes; `heading_path` is what it is built from on
 * `annotated-digest` (`spec.md` §3.1).
 */
export function readDocument(html, { docId } = {}) {
  if (typeof html !== 'string' || !html.trim()) {
    throw new Error('readDocument: empty document');
  }
  if (!docId) throw new Error('readDocument: a doc id is required - it is what source_doc holds');

  const body = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');

  const links = [];
  const headings = [];
  const text = [];

  // The heading stack, by level, so a link under "World > Energy" carries both.
  const headingStack = [];
  // A heading and a link can be open at once - `link-list-headings.html` has a
  // section heading that is itself a link, which is the fixture's whole point.
  let openHeading = null;
  let openLink = null;

  const flush = (chunk) => {
    const decoded = decodeEntities(chunk);
    if (!decoded.trim()) {
      if (decoded) text.push(' ');
      return;
    }
    text.push(decoded);
    if (openHeading) openHeading.parts.push(decoded);
    if (openLink) openLink.parts.push(decoded);
  };

  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let cursor = 0;
  let match;

  while ((match = tagPattern.exec(body)) !== null) {
    flush(body.slice(cursor, match.index));
    cursor = tagPattern.lastIndex;

    const [whole, rawName, attrs] = match;
    const name = rawName.toLowerCase();
    const closing = whole[1] === '/';
    const selfClosing = VOID_TAGS.has(name) || /\/\s*>$/.test(whole);

    if (BLOCK_TAGS.has(name)) text.push(' ');

    if (name === 'a' && !closing && !selfClosing) {
      // A nested <a> is malformed enough that positions would be a guess.
      if (openLink) throw new Error(`readDocument: nested <a> in ${docId}`);
      openLink = { href: attrValue(attrs, 'href'), parts: [], in_heading: Boolean(openHeading) };
      continue;
    }
    if (name === 'a' && closing) {
      if (openLink) {
        links.push({
          index: links.length,
          href: openLink.href,
          text: normaliseText(openLink.parts.join('')),
          in_heading: openLink.in_heading,
          heading_path: headingStack.filter(Boolean).map((h) => h.text)
        });
        openLink = null;
      }
      continue;
    }

    if (HEADING_TAGS.has(name)) {
      const level = Number(name[1]);
      if (!closing && !selfClosing) {
        openHeading = { level, parts: [] };
      } else if (closing && openHeading) {
        const heading = {
          index: headings.length,
          level: openHeading.level,
          text: normaliseText(openHeading.parts.join(''))
        };
        // A heading closes every heading at its own level or deeper.
        headingStack.length = heading.level - 1;
        headingStack[heading.level - 1] = heading;
        heading.path = headingStack.filter(Boolean).map((h) => h.text);
        headings.push(heading);
        openHeading = null;
      }
    }
  }
  flush(body.slice(cursor));

  if (openLink) throw new Error(`readDocument: unclosed <a> in ${docId}`);
  if (openHeading) throw new Error(`readDocument: unclosed heading in ${docId}`);

  return {
    doc_id: docId,
    links,
    headings,
    plain_text: normaliseText(text.join(''))
  };
}

/** The one attribute this reader needs. Quoted or bare, either order. */
function attrValue(attrs, name) {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(attrs);
  if (quoted) return decodeEntities(quoted[2] ?? quoted[3] ?? '');
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i').exec(attrs);
  return bare ? decodeEntities(bare[1]) : null;
}

/** Whether a blurb was copied from the issue rather than written (`spec.md` §3.1). */
export function appearsIn(document, candidate) {
  const needle = normaliseText(candidate);
  if (!needle) return false;
  return document.plain_text.includes(needle);
}
