// Turns two collection files into a report that leads with what is wrong.
// Heights from different sources are never compared directly - each service
// publishes against its own datum - so the height checks are about the size of
// the swing between turning points and about whether the offset is constant.
import { readFileSync, writeFileSync } from 'node:fs';
import { pairEvents, swings, mean, formatMinutes } from './lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k.replace(/^--/, ''), v ?? true]));
const config = JSON.parse(readFileSync(new URL('../locations.json', import.meta.url)));
const apps = JSON.parse(readFileSync(args.apps ?? 'apps.json'));
const official = JSON.parse(readFileSync(args.official ?? 'official.json'));
const baseline = args.baseline ? JSON.parse(readFileSync(args.baseline)) : null;
const limits = config.thresholds;

const RANK = { problem: 0, warning: 1, note: 2 };
const findings = [];
const add = (severity, location, code, message) => findings.push({ severity, location, code, message });

function label(id) {
  return config.locations.find((l) => l.id === id)?.query ?? id;
}

// Compare one source against another. `left` is the reference.
function contrast(left, right) {
  const pairs = pairEvents(left.events, right.events);
  const matched = pairs.filter((p) => p.left && p.right);
  const offsets = matched
    .filter((p) => p.left.height !== null && p.right.height !== null)
    .map((p) => Number((p.right.height - p.left.height).toFixed(3)));
  // Swings are only comparable between two turning points that both sources
  // agree on. Walking the paired list skips any window containing an event one
  // source resolved and the other did not, which would otherwise read as a huge
  // range error rather than the missing event it is.
  const swingDiffs = [];
  for (let i = 0; i < pairs.length - 1; i += 1) {
    const [start, end] = [pairs[i], pairs[i + 1]];
    const events = [start.left, start.right, end.left, end.right];
    if (events.some((event) => !event || event.height === null)) continue;
    const reference = Math.abs(end.left.height - start.left.height);
    const other = Math.abs(end.right.height - start.right.height);
    swingDiffs.push({
      window: `${start.left.time}–${end.left.time}`,
      reference: Number(reference.toFixed(3)),
      other: Number(other.toFixed(3)),
      metres: Number((other - reference).toFixed(3)),
      percent: reference === 0 ? 0 : Number((((other - reference) / reference) * 100).toFixed(1))
    });
  }
  return {
    pairs,
    unmatchedLeft: pairs.filter((p) => p.left && !p.right).map((p) => p.left),
    unmatchedRight: pairs.filter((p) => !p.left && p.right).map((p) => p.right),
    maxDeltaMinutes: matched.length ? Math.max(...matched.map((p) => Math.abs(p.deltaMinutes))) : null,
    deltas: matched.map((p) => p.deltaMinutes),
    offsetMean: offsets.length ? Number(mean(offsets).toFixed(3)) : null,
    offsetSpread: offsets.length ? Number((Math.max(...offsets) - Math.min(...offsets)).toFixed(3)) : null,
    swingDiffs
  };
}

const report = {};
for (const location of config.locations) {
  const id = location.id;
  const appRecord = apps.locations?.[id];
  const off = official.locations?.[id];
  if (!appRecord) continue;
  const hosted = appRecord.hosted;
  const offline = appRecord.offline;
  const entry = { id, query: location.query, zone: location.zone, expectProvider: location.expectProvider, why: location.why };

  // --- availability ------------------------------------------------------
  const usable = (record) => record && Array.isArray(record.events) && record.events.length > 0;
  if (!usable(hosted)) add('problem', id, 'app-unavailable', `Hosted app returned no forecast: ${hosted?.unavailable ?? hosted?.error ?? 'unknown'}`);
  if (!usable(offline)) add('problem', id, 'app-unavailable', `Offline app returned no forecast: ${offline?.unavailable ?? offline?.error ?? 'unknown'}`);
  if (!off || !usable(off)) add('problem', id, 'official-unavailable', `${location.official.name} (${location.official.kind.toUpperCase()}) could not be read: ${off?.unavailable ?? 'not collected'}`);

  entry.hosted = hosted && { station: hosted.station, kind: hosted.stationKind, date: hosted.date, events: hosted.events, providerFailures: hosted.providerFailures ?? [] };
  entry.offline = offline && { station: offline.station, point: offline.modelPoint, date: offline.date, events: offline.events };
  entry.official = off && { station: off.station, datum: off.datum, date: off.date, events: off.events, url: off.url };

  // --- which provider answered ------------------------------------------
  if (usable(hosted) && location.expectProvider && !(hosted.stationKind ?? '').includes(location.expectProvider)) {
    const blame = hosted.providerFailures?.length
      ? ` Provider fetches that failed in this run: ${hosted.providerFailures.join('; ')}. A failure here may be this machine's network rather than the app.`
      : ' Every provider endpoint answered normally in this run, so this is the app choosing a different source.';
    add('problem', id, 'provider-fallback',
      `Expected a ${location.expectProvider} source; the hosted app used "${hosted.stationKind}".${blame}`);
  }

  // --- which day each app called today ----------------------------------
  if (usable(hosted) && usable(offline) && hosted.date !== offline.date) {
    add('problem', id, 'day-mismatch', `The two apps disagree on the coast-local day: hosted shows ${hosted.date}, offline shows ${offline.date}.`);
  }
  if (usable(hosted) && off?.date && hosted.date !== off.date) {
    add('warning', id, 'official-day', `Official table was read for ${off.date} but the hosted app showed ${hosted.date}.`);
  }

  // --- the two apps against each other ----------------------------------
  let identicalApps = false;
  if (usable(hosted) && usable(offline)) {
    const both = contrast(hosted, offline);
    entry.appsVsEachOther = both;
    const sameModel = (hosted.stationKind ?? '').includes('FES2022');
    if (sameModel) {
      identicalApps = both.unmatchedLeft.length === 0 && both.unmatchedRight.length === 0
        && both.pairs.every((p) => p.deltaMinutes === 0 && p.left.height === p.right.height);
      if (!identicalApps) {
        add('problem', id, 'apps-disagree',
          `Both apps fell back to the same FES2022 model but their answers differ (largest time gap ${both.maxDeltaMinutes} min). Two editions of the same model on the same point should be identical.`);
      } else {
        add('note', id, 'apps-identical', 'Both apps used FES2022 and agree exactly, as they should.');
      }
    }
  }

  // --- each app against the official service ----------------------------
  for (const [name, record] of [['hosted', hosted], ['offline', offline]]) {
    if (!usable(record) || !off || !usable(off)) continue;
    const comparison = contrast(off, record);
    entry[`${name}VsOfficial`] = comparison;
    // Identical apps produce identical findings; report them once.
    const quiet = identicalApps && name === 'offline';
    const who = identicalApps ? 'Both apps' : `${name} app`;
    if (quiet) continue;

    if (comparison.unmatchedLeft.length || comparison.unmatchedRight.length) {
      const missing = comparison.unmatchedLeft.map((e) => `${e.kind} ${e.time}`).join(', ');
      const extra = comparison.unmatchedRight.map((e) => `${e.kind} ${e.time}`).join(', ');
      const sameCount = record.events.length === off.events.length;
      add('problem', id, 'event-mismatch',
        (sameCount
          ? `${who} and ${off.station} each list ${off.events.length} turning points for the day, but not the same ones.`
          : `${who} show${identicalApps ? '' : 's'} ${record.events.length} turning points, ${off.station} shows ${off.events.length}.`)
        + (missing ? ` Missing from the app: ${missing}.` : '')
        + (extra ? ` In the app but not the official table: ${extra}.` : '')
        + ' An event near midnight can land on the neighbouring day rather than be absent, so check the next day before calling it lost.');
    }

    if (comparison.maxDeltaMinutes !== null) {
      const worst = comparison.pairs.filter((p) => p.left && p.right)
        .sort((a, b) => Math.abs(b.deltaMinutes) - Math.abs(a.deltaMinutes))[0];
      const detail = `worst at ${worst.left.kind} ${worst.left.time} official vs ${worst.right.time} in the app`;
      if (comparison.maxDeltaMinutes >= limits.timeProblemMinutes) {
        add('problem', id, 'time-error', `${who} ${identicalApps ? 'are' : 'is'} up to ${comparison.maxDeltaMinutes} min away from ${off.station} (${detail}).`);
      } else if (comparison.maxDeltaMinutes >= limits.timeWarningMinutes) {
        add('warning', id, 'time-drift', `${who} ${identicalApps ? 'are' : 'is'} up to ${comparison.maxDeltaMinutes} min away from ${off.station} (${detail}).`);
      }
    }

    for (const swing of comparison.swingDiffs) {
      const size = Math.abs(swing.metres);
      const pct = Math.abs(swing.percent);
      if (pct >= limits.rangeProblemPercent && size >= limits.rangeProblemMetres) {
        add('problem', id, 'range-error',
          `${who === 'Both apps' ? "Both apps'" : `${name} app's`} ${swing.window} swing is ${swing.other} m against ${off.station}'s ${swing.reference} m (${swing.percent > 0 ? '+' : ''}${swing.percent}%, ${swing.metres > 0 ? '+' : ''}${swing.metres} m). The app is predicting a different amount of water moving, which no datum correction fixes.`);
      } else if (pct >= limits.rangeWarningPercent && size >= limits.rangeWarningMetres) {
        add('warning', id, 'range-drift',
          `${who === 'Both apps' ? "Both apps'" : `${name} app's`} ${swing.window} swing is ${swing.other} m against ${off.station}'s ${swing.reference} m (${swing.percent > 0 ? '+' : ''}${swing.percent}%).`);
      }
    }

    if (comparison.offsetSpread !== null && comparison.offsetSpread >= limits.datumSpreadMetres) {
      add('warning', id, 'datum-spread',
        `${who === 'Both apps' ? 'Both apps have a' : `${name} app's`} height offset against ${off.station} ${identicalApps ? 'that is' : 'is'} not constant: it varies by ${comparison.offsetSpread} m across the day (mean ${comparison.offsetMean} m). A pure datum difference would be the same at every turning point.`);
    } else if (comparison.offsetMean !== null) {
      add('note', id, 'datum-shift',
        `${who} sit${identicalApps ? '' : 's'} ${comparison.offsetMean > 0 ? '+' : ''}${comparison.offsetMean} m from ${off.station} (${off.datum}), constant to within ${comparison.offsetSpread} m - a datum difference, not an error.`);
    }

    if (comparison.maxDeltaMinutes === 0 && comparison.offsetSpread === 0 && comparison.offsetMean === 0) {
      add('note', id, 'exact-match', `${who} reproduce${identicalApps ? '' : 's'} ${off.station} exactly.`);
    }
  }

  // --- station drift since a previous run --------------------------------
  const before = baseline?.locations?.[id];
  if (before?.hosted?.station && hosted?.station && before.hosted.station !== hosted.station) {
    add('warning', id, 'station-change', `Hosted app now uses "${hosted.station}"; the baseline run used "${before.hosted.station}".`);
  }
  if (before?.offline?.modelPoint && offline?.modelPoint && before.offline.modelPoint !== offline.modelPoint) {
    add('warning', id, 'station-change', `Offline app now uses ${offline.modelPoint}; the baseline run used ${before.offline.modelPoint}.`);
  }

  report[id] = entry;
}

// The published single file should be the one this repository committed.
if (apps.artifact && apps.artifact.matchesRepo === false) {
  add('problem', '(build)', 'artifact-drift',
    `The published offline app does not match ${'demos/experiment-with-wasm/tide-here/index.html'} in this checkout (published ${apps.artifact.publishedSha256?.slice(0, 12)}, repo ${apps.artifact.repoSha256?.slice(0, 12)}). The comparison is measuring a different build from the one in the tree.`);
}

const order = new Map(config.locations.map((l, index) => [l.id, index]));
findings.sort((a, b) => RANK[a.severity] - RANK[b.severity]
  || (order.get(a.location) ?? 99) - (order.get(b.location) ?? 99));

// ---- markdown -----------------------------------------------------------

const eventLine = (events) => events.map((e) => `${e.kind === 'H' ? 'High' : 'Low'} ${e.time} ${e.height === null ? '' : `${e.height > 0 ? '' : ''}${e.height.toFixed(2)} m`}`.trim()).join(' · ');
const bySeverity = (severity) => findings.filter((f) => f.severity === severity);

const lines = [];
lines.push('# Tide source comparison');
lines.push('');
lines.push(`Run ${new Date().toISOString()}. Sources: the ChatGPT Sites edition of Tide Here, the single-file WASM edition, and each location's official hydrographic service.`);
lines.push('');
const problems = bySeverity('problem');
const warnings = bySeverity('warning');
lines.push(`**${problems.length} problem${problems.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}** across ${Object.keys(report).length} locations.`);
lines.push('');

for (const [heading, group, blurb] of [
  ['Problems', problems, 'Things that would give a reader a wrong answer.'],
  ['Warnings', warnings, 'Differences worth knowing about but within what a global model can be expected to do.']
]) {
  lines.push(`## ${heading}`);
  lines.push('');
  if (!group.length) { lines.push(`None. ${blurb}`); lines.push(''); continue; }
  lines.push(blurb);
  lines.push('');
  for (const finding of group) lines.push(`- **${label(finding.location)}** \`${finding.code}\` — ${finding.message}`);
  lines.push('');
}

lines.push('## Readings');
lines.push('');
for (const entry of Object.values(report)) {
  lines.push(`### ${entry.query}`);
  lines.push('');
  lines.push(`${entry.why}`);
  lines.push('');
  lines.push('| Source | Station or model point | Day | Turning points |');
  lines.push('|---|---|---|---|');
  if (entry.hosted?.events?.length) lines.push(`| ChatGPT Sites | ${entry.hosted.station} (${entry.hosted.kind}) | ${entry.hosted.date} | ${eventLine(entry.hosted.events)} |`);
  if (entry.offline?.events?.length) lines.push(`| WASM offline | ${entry.offline.station} — ${entry.offline.point ?? ''} | ${entry.offline.date} | ${eventLine(entry.offline.events)} |`);
  if (entry.official?.events?.length) lines.push(`| Official | ${entry.official.station} (${entry.official.datum}) | ${entry.official.date} | ${eventLine(entry.official.events)} |`);
  lines.push('');
  for (const [name, comparison] of [['ChatGPT Sites', entry.hostedVsOfficial], ['WASM offline', entry.offlineVsOfficial]]) {
    if (!comparison?.swingDiffs?.length) continue;
    lines.push(`${name} vs official — timing ${comparison.deltas.map((d) => `${d > 0 ? '+' : ''}${d}`).join(', ')} min; ` +
      `swings ${comparison.swingDiffs.map((s) => `${s.other} vs ${s.reference} m (${s.percent > 0 ? '+' : ''}${s.percent}%)`).join('; ')}; ` +
      `height offset ${comparison.offsetMean > 0 ? '+' : ''}${comparison.offsetMean} m, varying by ${comparison.offsetSpread} m across the day.`);
    lines.push('');
  }
  const notes = findings.filter((f) => f.location === entry.id && f.severity === 'note');
  if (notes.length) { for (const note of notes) lines.push(`- ${note.message}`); lines.push(''); }
  if (entry.official?.url) { lines.push(`Official source: ${entry.official.url}`); lines.push(''); }
}

const markdown = lines.join('\n');
if (args.out) {
  writeFileSync(args.out, `${markdown}\n`);
  writeFileSync(args.out.replace(/\.md$/, '') + '.json', JSON.stringify({ findings, report, artifact: apps.artifact }, null, 2));
  console.error(`wrote ${args.out}`);
}
console.log(markdown);
