// Shared helpers for the tide source comparison.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

export const HOSTED_URL = 'https://tide-here-five-coast-local-days.ken-novak.chatgpt.site/phase-6/index.html';
export const OFFLINE_URL = 'https://knovak.github.io/siteprep/demos/experiment-with-wasm/tide-here/index.html';
export const OFFLINE_REPO_COPY = 'demos/experiment-with-wasm/tide-here/index.html';

// Playwright lives in the repository root, not in the skill directory.
export function loadPlaywright(repoRoot) {
  const require = createRequire(`${repoRoot}/package.json`);
  return require('playwright');
}

// A sandboxed session reaches the internet through an HTTPS proxy that
// re-terminates TLS. Chromium's TLS 1.3 handshake is reset by some of those
// relays, so cap at 1.2 when a proxy is configured. Outside a proxied
// environment none of this applies and the defaults are used.
export function launchOptions() {
  const options = { args: [] };
  const bundled = '/opt/pw-browsers/chromium';
  if (existsSync(bundled)) options.executablePath = bundled;
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) {
    options.proxy = { server: proxy };
    options.args.push('--disable-features=EncryptedClientHello,PostQuantumKyber,TLS13EarlyData', '--ssl-version-max=tls1.2');
  }
  return options;
}

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export async function fetchText(url, extraHeaders = {}) {
  const response = await fetch(url, { headers: { 'user-agent': BROWSER_UA, ...extraHeaders } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

export async function fetchJson(url, extraHeaders = {}) {
  return JSON.parse(await fetchText(url, extraHeaders));
}

// ---- time helpers -------------------------------------------------------

export function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutes(total) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// "3:21 AM" -> "03:21"
export function from12Hour(text) {
  const match = /^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/.exec(text.trim());
  if (!match) throw new Error(`unrecognised clock time: ${text}`);
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === 'p') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

// A UTC instant rendered as { date: 'YYYY-MM-DD', time: 'HH:MM' } in an IANA zone.
export function inZone(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(instant).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}` };
}

export function todayIn(timeZone) {
  return inZone(new Date(), timeZone).date;
}

export function shiftDate(isoDate, days) {
  const moved = new Date(`${isoDate}T12:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

// ---- event helpers ------------------------------------------------------

export function makeEvent(kind, time, height) {
  return { kind, time, minutes: minutesOf(time), height: height === null ? null : Number(height) };
}

export function sortEvents(events) {
  return [...events].sort((a, b) => a.minutes - b.minutes);
}

// Successive |height| differences: the low-to-high swings that a reader
// actually cares about.
export function swings(events) {
  const ordered = sortEvents(events);
  const out = [];
  for (let i = 0; i < ordered.length - 1; i += 1) {
    if (ordered[i].height === null || ordered[i + 1].height === null) continue;
    out.push({
      from: ordered[i].time, to: ordered[i + 1].time,
      metres: Number(Math.abs(ordered[i + 1].height - ordered[i].height).toFixed(3))
    });
  }
  return out;
}

// Pair events between two sources by kind and nearest time, so a source with
// an extra turning point does not shift every later comparison by one.
export function pairEvents(left, right) {
  const pairs = [];
  const spare = sortEvents(right).map((event) => ({ event, taken: false }));
  for (const event of sortEvents(left)) {
    let best = null;
    for (const candidate of spare) {
      if (candidate.taken || candidate.event.kind !== event.kind) continue;
      const gap = Math.abs(candidate.event.minutes - event.minutes);
      if (!best || gap < best.gap) best = { candidate, gap };
    }
    if (best && best.gap <= 180) {
      best.candidate.taken = true;
      pairs.push({ left: event, right: best.candidate.event, deltaMinutes: best.candidate.event.minutes - event.minutes });
    } else {
      pairs.push({ left: event, right: null, deltaMinutes: null });
    }
  }
  for (const leftover of spare.filter((entry) => !entry.taken)) {
    pairs.push({ left: null, right: leftover.event, deltaMinutes: null });
  }
  return pairs.sort((a, b) => (a.left ?? a.right).minutes - (b.left ?? b.right).minutes);
}

export function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
