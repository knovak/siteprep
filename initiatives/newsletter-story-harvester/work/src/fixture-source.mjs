// The phase 3 implementation of spec.md §2's message-source seam.
//
// It behaves like the mailbox connector where the run loop needs that behavior
// to be visible: matchers are a union, the range is half-open, `from:` ignores
// plus-tags during search, and reading the body is a separate operation. The
// last point lets the integration test prove an over-matched message was not
// fetched after its actual From address failed verification.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function fixtureMessageSource(mailbox, { root } = {}) {
  const messages = Array.isArray(mailbox) ? mailbox : mailbox?.messages;
  if (!Array.isArray(messages)) throw new Error('fixture source: mailbox.messages must be an array');
  const byId = new Map(messages.map((message) => [message.id, message]));
  if (byId.size !== messages.length) throw new Error('fixture source: message ids must be unique');

  const reads = [];
  const searches = [];

  return {
    reads,
    searches,

    async search(entry, range) {
      const matchers = matchersFor(entry);
      searches.push({ source: entry.key, range: { ...range } });
      return messages
        .filter((message) => inRange(message.issue_date, range))
        .filter((message) => matchers.some((matcher) => prefilterMatches(message, matcher)))
        .map(publicMessage)
        .sort((a, b) => `${a.issue_date}\0${a.id}`.localeCompare(`${b.issue_date}\0${b.id}`));
    },

    async read(message) {
      const fixture = byId.get(message?.id);
      if (!fixture) throw new Error(`fixture source: no message ${message?.id}`);
      if (!fixture.body_file) throw new Error(`fixture source: message ${message.id} has no body_file`);
      reads.push(message.id);
      return readFileSync(resolve(root || '.', fixture.body_file), 'utf8');
    }
  };
}

/** The post-search check spec.md §5.1 requires. */
export function actualFromMatchesEntry(message, entry) {
  const from = matchersFor(entry).filter((matcher) => matcher.type === 'from');
  // A label-only fixture is allowed by §4's inventory shape. There is no
  // claimed address to verify in that case; attribution rests on the matcher.
  return from.length === 0 || from.some((matcher) => addressOf(message.from) === addressOf(matcher.value));
}

export function matchersFor(entry) {
  const matchers = Array.isArray(entry?.match) ? entry.match : [entry?.match].filter(Boolean);
  if (!matchers.length) throw new Error(`inventory source ${entry?.key || '(unknown)'} has no matchers`);
  return matchers.map((matcher) => {
    if (!matcher || typeof matcher !== 'object' || !matcher.type || !matcher.value) {
      throw new Error(`inventory source ${entry?.key || '(unknown)'} has an invalid matcher`);
    }
    if (!['from', 'label', 'subject'].includes(matcher.type)) {
      throw new Error(`inventory source ${entry?.key || '(unknown)'} has unknown matcher ${matcher.type}`);
    }
    return matcher;
  });
}

function publicMessage(message) {
  return {
    id: message.id,
    from: message.from,
    labels: [...(message.labels || [])],
    subject: message.subject || '',
    issue_date: message.issue_date,
    shape_override: message.shape_override || null
  };
}

function prefilterMatches(message, matcher) {
  if (matcher.type === 'from') return sameMailboxIgnoringPlus(message.from, matcher.value);
  if (matcher.type === 'label') return (message.labels || []).includes(matcher.value);
  if (matcher.type === 'subject') return new RegExp(matcher.value, 'i').test(message.subject || '');
  return false;
}

function sameMailboxIgnoringPlus(a, b) {
  const left = addressOf(a).split('@');
  const right = addressOf(b).split('@');
  if (left.length !== 2 || right.length !== 2) return false;
  return left[0].split('+')[0] === right[0].split('+')[0] && left[1] === right[1];
}

function addressOf(value) {
  const text = String(value || '').trim().toLowerCase();
  return (text.match(/<([^>]+)>/)?.[1] || text).trim();
}

function inRange(date, range) {
  return date >= range.after && date < range.before;
}
