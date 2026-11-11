#!/usr/bin/env node

/*
 * The channel stamp: a short label the build adds to the published entry page
 * of a demo that has a beta, saying which copy the reader has open and when it
 * last changed - "Released · changed 2026-07-20", "Beta · changed 2026-11-11".
 *
 * The label is added at publish time and is never part of the source. The
 * build knows which URL it is writing to, so the label comes from where a page
 * is published and cannot disagree with it; and promoting a beta to the
 * released copy is a plain copy, with no "beta" wording in the code to find
 * and change first.
 *
 * The stamp is one marked block inserted immediately before the page's last
 * </body>. It loads nothing: a page that runs offline from a single file still
 * does. `stripStamp` removes the block exactly, so
 * `stripStamp(stampHtml(page)) === page` byte for byte - which is how the
 * build tests show the stamp is the only thing the build changed.
 *
 *   channel_stamp.mjs apply FILE CHANNEL [--changed YYYY-MM-DD] [--anchor SELECTOR]
 *   channel_stamp.mjs strip FILE        the page without its stamp, on stdout
 *   channel_stamp.mjs read FILE         "channel<TAB>changed", or nothing
 *
 * See "Beta" in INITIATIVES_TECHDOC.md.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The channels a demo can be published on, and how each reads on the page. */
export const CHANNEL_LABELS = { released: 'Released', beta: 'Beta' };

export const STAMP_START = '<!-- siteprep-channel-stamp:start - added by the SitePrep build, not part of the source -->';
export const STAMP_END = '<!-- siteprep-channel-stamp:end -->';

/**
 * An anchor is written into an inline script, so it is held to a single id or
 * class selector rather than escaped: `#attribution`, `.credit`.
 */
export const STAMP_ANCHOR = /^[#.][A-Za-z][A-Za-z0-9_-]*$/;

const CHANGED = /^\d{4}-\d{2}-\d{2}$/;

// Used when the page names no anchor, or the anchor is not on the page: a small
// fixed label in the bottom-right corner that takes no pointer events.
const FALLBACK_STYLE = 'position:fixed;right:8px;bottom:4px;z-index:2147483000;'
  + 'font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#8b8fa3;opacity:.85;'
  + 'pointer-events:none';

/** The text a stamp shows: the channel, and the date when one is known. */
export function stampText(channel, changed) {
  const label = CHANNEL_LABELS[channel];
  if (!label) throw new Error(`unknown channel "${channel}" - one of ${Object.keys(CHANNEL_LABELS).join(', ')}`);
  if (changed && !CHANGED.test(changed)) throw new Error(`changed must be YYYY-MM-DD, not "${changed}"`);
  return changed ? `${label} · changed ${changed}` : label;
}

function stampBlock(channel, changed, anchor) {
  if (anchor && !STAMP_ANCHOR.test(anchor)) {
    throw new Error(`stamp anchor must be one #id or .class selector, not "${anchor}"`);
  }
  // Entities and escapes keep the block ASCII, so it is safe whatever encoding
  // the page declares.
  const text = stampText(channel, changed).replace('·', '&middot;');
  const lines = [
    STAMP_START,
    `<span id="siteprep-channel-stamp" data-channel="${channel}"`
      + `${changed ? ` data-changed="${changed}"` : ''} style="${FALLBACK_STYLE}">${text}</span>`
  ];
  if (anchor) {
    // With an anchor the label joins that element as trailing text and takes
    // its type and color. Without one on the page, the fixed label stays.
    lines.push(
      '<script>(function(){var s=document.getElementById("siteprep-channel-stamp"),'
      + `a=document.querySelector(${JSON.stringify(anchor)});`
      + 'if(s&&a){s.removeAttribute("style");s.insertAdjacentText("afterbegin"," \\u00b7 ");'
      + 'a.appendChild(s);}})();</script>'
    );
  }
  lines.push(STAMP_END);
  return `${lines.join('\n')}\n`;
}

function asBuffer(html) {
  return Buffer.isBuffer(html) ? html : Buffer.from(html, 'utf8');
}

/** Where the stamp block starts and ends in a page, or null when it has none. */
function stampRange(page) {
  const start = page.indexOf(STAMP_START);
  if (start === -1) return null;
  const endMarker = page.indexOf(STAMP_END, start);
  if (endMarker === -1) throw new Error('page has a channel stamp that never ends');
  let end = endMarker + Buffer.byteLength(STAMP_END);
  if (page[end] === 0x0a) end += 1;
  return { start, end };
}

/**
 * A page with the stamp added. Works on bytes, so everything outside the
 * inserted block is untouched whatever the page's encoding.
 */
export function stampHtml(html, { channel, changed = null, anchor = null } = {}) {
  const page = asBuffer(html);
  if (stampRange(page)) throw new Error('page already has a channel stamp');
  const at = page.toString('latin1').toLowerCase().lastIndexOf('</body>');
  if (at === -1) throw new Error('page has no </body> to place the stamp before');
  return Buffer.concat([
    page.subarray(0, at),
    Buffer.from(stampBlock(channel, changed, anchor), 'utf8'),
    page.subarray(at)
  ]);
}

/** A page with its stamp removed; a page without one is returned unchanged. */
export function stripStamp(html) {
  const page = asBuffer(html);
  const range = stampRange(page);
  if (!range) return page;
  return Buffer.concat([page.subarray(0, range.start), page.subarray(range.end)]);
}

/** The channel and date a page is stamped with, or null. */
export function readStamp(html) {
  const page = asBuffer(html);
  const range = stampRange(page);
  if (!range) return null;
  const block = page.subarray(range.start, range.end).toString('utf8');
  const channel = /data-channel="([^"]*)"/.exec(block)?.[1] || null;
  const changed = /data-changed="([^"]*)"/.exec(block)?.[1] || null;
  return { channel, changed };
}

function main() {
  const [command, file, ...rest] = process.argv.slice(2);
  const flag = (name) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : undefined);
  if (!command || !file) {
    throw new Error('usage: channel_stamp.mjs apply FILE CHANNEL [--changed YYYY-MM-DD] [--anchor SELECTOR]\n'
      + '       channel_stamp.mjs strip FILE\n'
      + '       channel_stamp.mjs read FILE');
  }
  const page = readFileSync(file);

  if (command === 'apply') {
    const channel = rest[0];
    writeFileSync(file, stampHtml(page, {
      channel, changed: flag('--changed') || null, anchor: flag('--anchor') || null
    }));
    return;
  }
  if (command === 'strip') {
    process.stdout.write(stripStamp(page));
    return;
  }
  if (command === 'read') {
    const stamp = readStamp(page);
    if (stamp) console.log(`${stamp.channel || ''}\t${stamp.changed || ''}`);
    return;
  }
  throw new Error(`unknown command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`channel stamp: ${error.message}`);
    process.exitCode = 1;
  }
}
