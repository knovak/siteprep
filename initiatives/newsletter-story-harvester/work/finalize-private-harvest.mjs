#!/usr/bin/env node

import {randomUUID} from 'node:crypto';
import {chmodSync, existsSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';

import {summariseRun} from './src/extract.mjs';
import {mergeRecords, recordRun} from './src/merge.mjs';
import {loadPrivateInventory} from './src/private-inventory.mjs';
import {reviewPageHtml} from './src/review-page.mjs';
import {emptyStore, saveStore} from './src/store.mjs';

const [inventoryArgument, storeArgument, reviewArgument, after, before] = process.argv.slice(2);
if (!inventoryArgument || !storeArgument || !reviewArgument || !/^\d{4}-\d{2}-\d{2}$/.test(after || '') || !/^\d{4}-\d{2}-\d{2}$/.test(before || '') || after >= before) {
  process.stderr.write('Usage: finalize-private-harvest.mjs <inventory.json> <store.json> <review.html> <after> <before>\n');
  process.exit(2);
}

const inventory = loadPrivateInventory(resolve(inventoryArgument));
const storePath = resolve(storeArgument);
const reviewPath = resolve(reviewArgument);
if (existsSync(storePath) || existsSync(reviewPath)) {
  process.stderr.write('Private harvest refuses to replace an existing store or review page.\n');
  process.exit(1);
}

const store = emptyStore();
store.store_id = randomUUID();
const bySource = new Map(inventory.sources.map(entry => [entry.key, entry]));
const issueReports = [];
const seenIssues = new Set();
const merge = {added: 0, matched: 0, merged: 0, conflicted: 0, refused: 0, conflicts: []};
const input = createInterface({input: process.stdin, crlfDelay: Infinity});

try {
  for await (const line of input) {
    if (!line.trim()) continue;
    const value = JSON.parse(line);
    if (value.type === 'finish') {
      finish(value);
      input.close();
      break;
    }
    accept(value);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

function accept(value) {
  const report = value?.report;
  const records = value?.records;
  if (!report?.issue_id || !bySource.has(report.source) || !Array.isArray(records)) throw new Error('Private harvest received an invalid extraction result');
  if (seenIssues.has(report.issue_id)) throw new Error(`Private harvest received duplicate issue ${report.issue_id}`);
  if (records.some(record => record.source_doc !== report.issue_id || record.source !== report.source)) {
    throw new Error(`Private harvest extraction identity disagrees for ${report.issue_id}`);
  }
  seenIssues.add(report.issue_id);
  issueReports.push(report);
  const next = mergeRecords(store, records, {mode: 'harvest'});
  for (const key of ['added', 'matched', 'merged', 'conflicted', 'refused']) merge[key] += next[key] || 0;
  merge.conflicts.push(...next.conflicts);
  process.stdout.write(`${JSON.stringify({accepted: true, source: report.source, issues: issueReports.length, stories: store.stories.length})}\n`);
}

function finish(value) {
  const expected = value.expected_issues;
  if (!Number.isInteger(expected) || expected !== issueReports.length) {
    throw new Error(`Private harvest expected ${expected} issues but received ${issueReports.length}`);
  }
  const extraction = summariseRun(issueReports);
  const issuesPerSource = Object.fromEntries(inventory.sources.map(entry => [entry.key, issueReports.filter(report => report.source === entry.key).length]));
  const flaggedPerSource = Object.fromEntries(inventory.sources.map(entry => [entry.key, issueReports.filter(report => report.source === entry.key && report.flagged).length]));
  const report = {
    issues: issueReports.length,
    issues_per_source: issuesPerSource,
    stories_extracted: extraction.stories,
    extraction_refused: extraction.refused,
    extraction_refused_by_reason: extraction.refused_by_reason,
    loud: extraction.loud,
    flagged: extraction.flagged,
    flagged_per_source: flaggedPerSource,
    overridden: extraction.overridden,
    unattributed: value.unattributed || 0,
    added: merge.added,
    matched: merge.matched,
    merged: merge.merged,
    conflicted: merge.conflicted,
    conflicts: merge.conflicts,
    verdicts_refused: merge.refused,
    merge_rate: extraction.stories ? merge.merged / extraction.stories : 0,
    connector_operations: {searches: value.searches, reads: value.reads, writes: 0},
  };
  recordRun(store, {
    kind: 'harvest',
    report,
    at: value.harvested_at || new Date().toISOString(),
    range: {after, before, sources: Object.fromEntries(inventory.sources.map(entry => [entry.key, {after: daysBefore(before, entry.lookback_days), before}]))},
    inventory: {id: inventory.id || null, sources: inventory.sources.map(entry => entry.key)},
  });
  saveStore(storePath, store);
  chmodSync(storePath, 0o600);
  writeFileSync(reviewPath, reviewPageHtml(store, {title: 'Real newsletter story review'}), {encoding: 'utf8', mode: 0o600, flag: 'wx'});
  chmodSync(reviewPath, 0o600);
  process.stdout.write(`${JSON.stringify({complete: true, store: storePath, review: reviewPath, stories: store.stories.length, report})}\n`);
}

function daysBefore(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - days * 86_400_000).toISOString().slice(0, 10);
}
