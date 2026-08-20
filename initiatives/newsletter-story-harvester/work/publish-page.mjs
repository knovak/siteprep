#!/usr/bin/env node

// spec.md §12: the review page's renderer with the verdict controls removed and
// the selection narrowed to kept and emphasised. Two arguments, one generator.

import {readFileSync, writeFileSync, chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {reviewPageHtml} from './src/review-page.mjs';

const PUBLISHED = ['kept', 'emphasised'];

const args = process.argv.slice(2);
const titleAt = args.indexOf('--title');
const title = titleAt === -1 ? 'Newsletter stories' : args[titleAt + 1];
const positional = titleAt === -1 ? args : [...args.slice(0, titleAt), ...args.slice(titleAt + 2)];
const [storeArgument, outputArgument] = positional;

if (!storeArgument || !outputArgument || (titleAt !== -1 && !title)) {
  process.stderr.write('Usage: publish-page.mjs <store.json> <published.html> [--title "..."]\n');
  process.exitCode = 2;
} else {
  const storePath = resolve(storeArgument);
  const outputPath = resolve(outputArgument);
  const store = JSON.parse(readFileSync(storePath, 'utf8'));
  const html = reviewPageHtml(store, {title, include: PUBLISHED, judgeable: false});
  writeFileSync(outputPath, html, 'utf8');

  // Deliberately not the 0600 of a private store: this file exists to be shared,
  // which is exactly why nothing of the mailbox is allowed into it.
  chmodSync(outputPath, 0o644);

  const counts = Object.fromEntries(
    PUBLISHED.map(verdict => [verdict, store.stories.filter(story => story.verdict === verdict).length])
  );
  process.stdout.write(`${outputPath}\n`);
  process.stdout.write(`published ${counts.kept + counts.emphasised} of ${store.stories.length} stories `);
  process.stdout.write(`(${counts.kept} kept, ${counts.emphasised} emphasised), mode 0644\n`);
}
