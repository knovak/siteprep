#!/usr/bin/env node
import {randomUUID} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gmailSearchString} from './src/gmail-source.mjs';
import {reviewPageHtml} from './src/review-page.mjs';

const work = dirname(fileURLToPath(import.meta.url));

/** Build only from protected local inputs; never substitute fixture data. */
export function buildPrivateSite(privateDir = join(work, 'private')) {
  const info = lstatSync(privateDir);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Private input directory must be a real directory.');
  const readPrivate = (name) => {
    const path = join(privateDir, name);
    const stat = lstatSync(path);
    if (!stat.isFile() || (stat.mode & 0o077)) throw new Error(`${name} must be a regular owner-only file (mode 0600).`);
    return JSON.parse(readFileSync(path, 'utf8'));
  };
  const store = readPrivate('store.json');
  const inventory = readPrivate('inventory.json');
  const sources = inventory.sources.map(source => ({name: source.name, slug: source.slug, search: gmailSearchString(source)}));
  const html = reviewPageHtml(store, {sources});
  const site = join(privateDir, 'site');
  if (existsSync(site) && !lstatSync(site).isDirectory()) throw new Error('Site output must be a real directory.');
  mkdirSync(site, {recursive: true, mode: 0o700});
  const temporary = join(site, `.index-${randomUUID()}.tmp`);
  const output = join(site, 'index.html');
  try {
    writeFileSync(temporary, html, {flag: 'wx', mode: 0o600});
    renameSync(temporary, output);
  } finally {
    rmSync(temporary, {force: true});
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(buildPrivateSite()); }
  catch (error) { console.error(`Private review build failed: ${error.message}`); process.exitCode = 1; }
}
