import { matcherGroupsFor } from './source-contract.mjs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Build one Gmail query: matcher groups union, conditions inside a group intersect. */
export function gmailQueryFor(entry, range) {
  if (!DATE.test(range?.after || '') || !DATE.test(range?.before || '') || range.after >= range.before) {
    throw new Error('gmail source: search range must be half-open local dates');
  }
  const groups = matcherGroupsFor(entry);
  const arms = groups.map((group) => group.map(gmailMatcher).join(' '));
  const match = arms.length === 1 ? arms[0] : `{${arms.join(' ')}}`;
  return `${match} after:${range.after.replaceAll('-', '/')} before:${range.before.replaceAll('-', '/')}`;
}

/**
 * Gmail implementation of spec.md §2's two-call seam.
 *
 * The connector surface is intentionally limited to the two read operations
 * the skill can supply: `search_emails` and `read_email`. Keeping those as the
 * constructor's complete input makes a label/archive/draft dependency
 * impossible to add accidentally inside this adapter.
 */
export function gmailMessageSource(connector, { pageSize = 50, timeZone } = {}) {
  if (typeof connector?.search_emails !== 'function' || typeof connector?.read_email !== 'function') {
    throw new TypeError('gmail source: connector needs search_emails and read_email');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new Error('gmail source: pageSize must be an integer from 1 to 50');
  }
  const operations = [];

  return {
    operations,

    async search(entry, range) {
      const query = gmailQueryFor(entry, range);
      const messages = [];
      const ids = new Set();
      const seenTokens = new Set();
      let nextPageToken;

      do {
        const args = { query, max_results: pageSize };
        if (nextPageToken) args.next_page_token = nextPageToken;
        operations.push({ operation: 'search', source: entry.key, query, page: messages.length / pageSize + 1 });
        const page = searchResult(await connector.search_emails(args));
        for (const email of page.emails) {
          if (!email?.id || ids.has(email.id)) continue;
          ids.add(email.id);
          messages.push(publicEnvelope(email, { timeZone }));
        }
        nextPageToken = page.next_page_token || null;
        if (nextPageToken && seenTokens.has(nextPageToken)) throw new Error('gmail source: repeated next_page_token');
        if (nextPageToken) seenTokens.add(nextPageToken);
      } while (nextPageToken);

      return messages.sort((left, right) => `${left.issue_date}\0${left.id}`.localeCompare(`${right.issue_date}\0${right.id}`));
    },

    async read(message) {
      if (!message?.id) throw new Error('gmail source: read needs a message id');
      operations.push({ operation: 'read', message_id: message.id });
      const email = readResult(await connector.read_email({ message_id: message.id, format: 'full' }));
      if (email.id && email.id !== message.id) throw new Error(`gmail source: read returned ${email.id} for ${message.id}`);
      return readableBody(email.payload);
    }
  };
}

export function readableBody(payload) {
  const html = findMime(payload, 'text/html');
  if (html !== null) return html;
  const plain = findMime(payload, 'text/plain');
  if (plain !== null) return plainTextHtml(plain);
  throw new Error('gmail source: message has no inline text/html or text/plain body');
}

function gmailMatcher(matcher) {
  const value = gmailValue(matcher.value);
  if (matcher.type === 'from') return `from:${value}`;
  if (matcher.type === 'label') return `label:${value}`;
  if (matcher.type === 'subject') return `subject:${value}`;
  throw new Error(`gmail source: unsupported matcher ${matcher.type}`);
}

function gmailValue(value) {
  const text = String(value).trim();
  if (!text) throw new Error('gmail source: an empty matcher cannot be queried');
  if (/\s|[{}"]/.test(text)) return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
  return text;
}

function resultBody(value) {
  return value?.structuredContent?.result
    ?? value?.structuredContent
    ?? value?.result
    ?? value
    ?? {};
}

function searchResult(value) {
  const body = resultBody(value);
  return {
    emails: Array.isArray(body.emails) ? body.emails : [],
    next_page_token: body.next_page_token || null,
  };
}

function readResult(value) {
  const body = resultBody(value);
  if (Array.isArray(body.responses)) {
    if (body.responses.length !== 1) throw new Error('gmail source: one read returned multiple messages');
    return body.responses[0];
  }
  return body;
}

function publicEnvelope(email, { timeZone } = {}) {
  const timestamp = email.email_ts ?? email.internal_date;
  const issueDate = localDate(timestamp, timeZone);
  return {
    id: email.id,
    from: email.from_ ?? email.from ?? '',
    labels: [...(email.labels ?? email.label_ids ?? [])],
    subject: email.subject ?? '',
    issue_date: issueDate,
    shape_override: null,
  };
}

function localDate(value, timeZone) {
  const date = /^\d+$/.test(String(value || '')) ? new Date(Number(value)) : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error('gmail source: message has no usable timestamp');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = type => parts.find(value => value.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function findMime(part, wanted) {
  if (!part) return null;
  if (String(part.mime_type || '').toLowerCase() === wanted) {
    const content = part.body?.content;
    if (typeof content === 'string') return content;
    const encoded = part.body?.base64_url_content;
    if (typeof encoded === 'string') return Buffer.from(encoded.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8');
    if (part.body?.attachment_id) throw new Error(`gmail source: ${wanted} body requires an attachment read`);
  }
  for (const child of part.parts ?? []) {
    const found = findMime(child, wanted);
    if (found !== null) return found;
  }
  return null;
}

function plainTextHtml(text) {
  const url = /https?:\/\/[^\s<>]+/g;
  let cursor = 0;
  const parts = ['<article><pre>'];
  for (const match of text.matchAll(url)) {
    parts.push(escapeHtml(text.slice(cursor, match.index)));
    const href = match[0];
    parts.push(`<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`);
    cursor = match.index + href.length;
  }
  parts.push(escapeHtml(text.slice(cursor)), '</pre></article>');
  return parts.join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
