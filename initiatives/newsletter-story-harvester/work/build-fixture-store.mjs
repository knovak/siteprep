#!/usr/bin/env node

import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {emptyStore} from './src/store.mjs';
import {recordedModel} from './src/model.mjs';
import {fixtureMessageSource} from './src/fixture-source.mjs';
import {runHarvest} from './src/run.mjs';

const work = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(work, 'fixtures');
const inventory = JSON.parse(readFileSync(resolve(fixtures, 'inventory-fixture.json'), 'utf8'));
const mailbox = JSON.parse(readFileSync(resolve(fixtures, 'mailbox-fixture.json'), 'utf8'));
const store = emptyStore();
store.store_id = 'fixture-store-v1';

await runHarvest({
  inventory,
  range: {after: '2026-01-01', before: '2026-02-01'},
  source: fixtureMessageSource(mailbox, {root: fixtures}),
  model: recordedModel(resolve(fixtures, 'responses')),
  store,
  tagger: async ({record}) => [`theme:${record.source}`],
  now: '2026-08-18T09:00:00.000Z',
});

store.vocabularies.verdict = ['dropped', 'kept', 'emphasised'];
store.stories[0].verdict = 'to-be-shared';
store.stories[0].verdict_at = '2026-08-18T10:00:00.000Z';
writeFileSync(resolve(fixtures, 'store-fixture.json'), `${JSON.stringify(store, null, 2)}\n`, 'utf8');
process.stdout.write(`${store.stories.length} stories\n`);
