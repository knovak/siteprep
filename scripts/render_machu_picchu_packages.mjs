import { readFileSync, writeFileSync } from 'node:fs';

const folder = new URL('../gh-pages/decks/peru/sections/machu-picchu-packages/', import.meta.url);
const inventory = JSON.parse(readFileSync(new URL('packages.json', folder), 'utf8'));
const { packages, holding, locations } = inventory;
const ids = [...packages, ...holding].map(item => item.id);
if (new Set(ids).size !== ids.length || ids.some(id => !Number.isInteger(id) || id < 100 || id > 999)) {
  throw new Error('Machu Picchu package IDs must be unique three-digit numbers.');
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function sourceLinks(sources) {
  return (sources ?? []).map(({ label, url }) => {
    if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('Invalid source URL ' + url);
    return `<a href="${escape(url)}" rel="noopener" target="_blank">${escape(label)}</a>`;
  }).join(' · ');
}

const fullDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
function displayDate(iso) { return fullDate.format(new Date(iso + 'T00:00:00Z')); }
function days(d) { return (Date.parse(d.end) - Date.parse(d.start)) / 86400000 + 1; }
function price(d) {
  return Number.isFinite(d.amount) ? new Intl.NumberFormat('en-US', {
    style: 'currency', currency: d.currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(d.amount) + ' ' + d.currency : 'Price unverified';
}
function entryLabel(p) {
  return escape(p.name) + ' <span class="item-id">{' + p.id + '}</span>';
}
function line(label, value) {
  return `<p><strong>${escape(label)}</strong> ${escape(value)}</p>`;
}
function recordsByStyle(a, b) {
  return (a.p.priority ?? Infinity) - (b.p.priority ?? Infinity)
    || a.p.style.localeCompare(b.p.style) || a.d.start.localeCompare(b.d.start)
    || a.p.name.localeCompare(b.p.name);
}

for (const p of [...packages, ...holding.filter(item => item.departures)]) {
  if (!p.departures?.length) throw new Error('Missing departures for ' + p.id);
  p.departures = p.departures.map(d => ({ ...p.departureDefaults, ...d }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const starts = new Set();
  for (const d of p.departures) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.start) || !/^\d{4}-\d{2}-\d{2}$/.test(d.end)
      || !Number.isInteger(days(d)) || days(d) < 1 || starts.has(d.start)
      || !d.generalEvidence || !d.partyEvidence || !d.checked || !d.sources?.length) {
      throw new Error('Incomplete or duplicate departure for package ' + p.id + ' on ' + d.start);
    }
    if (d.roomQuote && (!d.roomQuote.seller || !Number.isFinite(d.roomQuote.total) || d.roomQuote.total <= 0)) {
      throw new Error('Invalid four-adult room quote for package ' + p.id + ' on ' + d.start);
    }
    starts.add(d.start);
  }
}
const records = packages.flatMap(p => p.departures.map(d => ({ p, d }))).sort(recordsByStyle);
const cols = [
  ['style', 'Travel style'], ['name', 'Package'], ['start', 'Departure'], ['days', 'Days'],
  ['amount', 'Per adult'], ['general', 'Tour availability'], ['party', 'Four adults · two rooms'],
  ['operatorReview', 'Operator reviews'], ['accommodationReview', 'Accommodation reviews'],
];
function row({ p, d }) {
  const operator = p.operatorReviewShort || p.operatorReview;
  const lodging = p.accommodationReviewShort || p.accommodationReview;
  const data = { style:p.style, name:p.name, start:d.start, days:days(d), amount:d.amount ?? '',
    currency:d.currency, general:d.general, party:d.party, 'operator-review':operator, 'accommodation-review':lodging };
  const attrs = Object.entries(data).map(([key, value]) => `data-${key}="${escape(value)}"`).join(' ');
  return `<tr ${attrs}>
    <td>${escape(p.style)}</td><td><a href="#departure-${p.id}-${d.start}">${entryLabel(p)}</a><small>${escape(p.operator)}</small></td>
    <td><time datetime="${d.start}">${escape(displayDate(d.start))}</time></td><td>${days(d)}</td>
    <td>${escape(price(d))}<small>${escape(d.fare)}</small></td>
    <td>${escape(d.general)}</td><td>${escape(d.party)}</td><td>${escape(operator)}</td><td>${escape(lodging)}</td></tr>`;
}
const pointers = [[637, 'Two rooms selected on a lodge trek'], [329, 'Seven-day rail departures'], [364, 'Two-day private rail trip']]
  .filter(([id]) => packages.some(p => p.id === id && (id !== 637 || p.departures.some(d => d.party.startsWith('Two rooms selected')))))
  .map(([id,label]) => `<a href="#package-${id}">${label}</a>`).join(' · ');
const pricedRooms = records.filter(({ d }) => d.roomQuote)
  .sort((a, b) => a.d.start.localeCompare(b.d.start));
const roomQuotes = pricedRooms.map(({ p, d }) => {
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: d.currency }).format(d.roomQuote.total);
  return `<li><a href="#departure-${p.id}-${d.start}">${escape(displayDate(d.start))} · ${escape(p.name)}</a>
    · <strong>${escape(total)} ${escape(d.currency)}</strong> for four via ${escape(d.roomQuote.seller)}. ${escape(d.party)}.</li>`;
}).join('\n');
const checked = records.map(r => r.d.checked).sort().at(-1);
const header = cols.map(([key,label]) => `<th scope="col"><button type="button" data-sort="${key}">${escape(label)}</button></th>`).join('');
const comparison = `<p class="package-shortcuts">${pointers}</p>
<p>Latest availability check ${escape(displayDate(checked))}. See each departure for the observed room setup and any confirmation still needed.</p>
<div class="package-controls" id="package-controls"><span id="package-count" role="status">${records.length} departures · ${packages.length} itineraries</span></div>
<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable package comparison"><table id="package-comparison" class="package-comparison">
<thead><tr>${header}</tr></thead><tbody>${records.map(row).join('\n')}</tbody></table></div>`;

function departureDetail(p, d) {
  return `<li id="departure-${p.id}-${d.start}">
<strong>${escape(displayDate(d.start))} – ${escape(displayDate(d.end))}</strong> · ${days(d)} days / ${days(d)-1} nights
${line('Price', price(d) + ' · ' + d.fare)}
${line('Tour availability', d.general + '. ' + d.generalEvidence)}
${line('Two couples', d.party + '. ' + d.partyEvidence)}
<p>Checked <time datetime="${d.checked}">${escape(displayDate(d.checked))}</time>. ${sourceLinks(d.sources)}</p></li>`;
}
function detail(p) {
  return `<li id="package-${p.id}"><strong>${entryLabel(p)}:</strong> ${escape(p.operator)}
${p.status ? line(p.status, p.reason) + line('Decision date', displayDate(p.checked)) + line('Next check', p.next) : ''}
${line('Route', p.itinerary)}${line('Accommodation', p.accommodation)}
${line('Costs for two couples', p.costs)}${line('Deposit and cancellation', p.terms)}
${line('Operator reviews', p.operatorReview)}${line('Accommodation reviews', p.accommodationReview)}
<p>Reviews checked ${escape(displayDate(p.reviewChecked))}. ${sourceLinks(p.sources)}</p>
<details><summary>Booking evidence for ${p.departures.length} departure${p.departures.length === 1 ? '' : 's'}</summary>
<ul class="departure-evidence">${p.departures.map(d => departureDetail(p, d)).join('\n')}</ul></details></li>`;
}
const sortedPackages = [...packages].sort((a,b) => recordsByStyle({p:a,d:a.departures[0]}, {p:b,d:b.departures[0]}));
const styles = [...new Set(sortedPackages.map(p => p.style))];
const details = styles.map(style => `<h2>${escape(style)}</h2><ul class="package-list">${sortedPackages.filter(p => p.style === style).map(detail).join('\n')}</ul>`).join('\n');

const markers = [...new Set(packages.flatMap(p => p.locations))].map(key => {
  const point = locations[key];
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) throw new Error('Missing location ' + key);
  return point;
}).sort((a,b) => a.name.localeCompare(b.name));
const points = markers.map(point => {
  const place = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(point.lat + ',' + point.lng);
  return `<li><strong>${escape(point.name)}</strong> · ${escape(point.type)}. ${escape(point.address)}.
    ${sourceLinks([{label:'Google Maps',url:place}, ...(point.source ? [{label:'Location reference',url:point.source}] : [])])}</li>`;
}).join('\n');
const colors = ['#9a3412', '#00747c', '#64509e', '#557122', '#a93f67', '#185b92'];
const types = [...new Set(markers.map(p => p.type))].sort();
const mapData = markers.map(p => ({ ...p, icon:'●', color:colors[types.indexOf(p.type) % colors.length] }));
const map = `<details><summary>Location references (${markers.length})</summary><ul>${points}</ul></details>
<script type="application/json" id="package-map-data">${JSON.stringify(mapData).replaceAll('<','\\u003c')}</script>`;

function holdingEntry(p) {
  if (p.departures?.length) return detail(p);
  return `<li id="package-${p.id}"><strong>${entryLabel(p)}:</strong> ${escape(p.style)} · ${escape(p.status)}
  ${line('Finding', p.reason)}${line('Next check',p.next)}<p>Checked ${escape(displayDate(p.checked))}. ${sourceLinks(p.sources)}</p></li>`;
}
const rejected = holding.filter(p => p.status === 'User rejected');
const research = holding.filter(p => p.status !== 'User rejected');
function holdingList(items, empty) {
  return items.length ? '<ul class="package-list">' + items.map(holdingEntry).join('\n') + '</ul>' : '<p>' + empty + '</p>';
}
const holdingMarkup = `<h2>Research holding</h2><p>These options can be reconsidered when the stated condition changes.</p>
${holdingList(research, 'No leads currently in holding.')}<h2>User-rejected options</h2>
${holdingList(rejected, 'No user-rejected options recorded.')}`;
function fillPage(name, blocks) {
  const url = new URL(name, folder);
  let html = readFileSync(url, 'utf8');
  for (const [marker, replacement] of Object.entries(blocks)) {
    const token = '<!-- ' + marker + ' -->';
    if (!html.includes(token)) throw new Error('Missing template marker ' + marker);
    html = html.replace(token, () => replacement);
  }
  writeFileSync(url, html);
}
fillPage('overview.html', {
  'room-quotes': roomQuotes ? `<h2>Departures with room quotes</h2>
    <p>Each total covers all four adults. Open a date for the booking evidence and bed arrangement.</p>
    <ul class="room-quotes">${roomQuotes}</ul>` : '',
  'departure-comparison': comparison,
  'package-details': details,
  'package-locations': map,
});
fillPage('overview-reject.html', {'holding-records':holdingMarkup});
