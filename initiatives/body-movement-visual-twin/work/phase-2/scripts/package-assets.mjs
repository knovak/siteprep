#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const phaseZeroDirectory = resolve(phaseDirectory, '../phase-0');
const source = JSON.parse(await readFile(resolve(phaseZeroDirectory, 'assets/original/reference-rig.json'), 'utf8'));
const dataDirectory = resolve(phaseDirectory, 'data');

const core = {
  schema_version: source.schema_version,
  title: source.title,
  units: source.units,
  reference_stature_mm: source.reference_stature_mm,
  registration_tolerance_mm: source.registration_tolerance_mm,
  rights_refs: source.rights_refs,
  excluded_rights_refs: source.excluded_rights_refs,
  layers: {
    surface: source.layers.surface,
    skeleton: source.layers.skeleton
  },
  nodes: source.nodes,
  clip: source.clip,
  anatomy_review: source.anatomy_review
};

const muscles = {
  schema_version: source.schema_version,
  source_rig: 'phase-0/assets/original/reference-rig.json',
  layers: { muscles: source.layers.muscles },
  attachments: source.attachments
};

await mkdir(dataDirectory, { recursive: true });
await writeFile(resolve(dataDirectory, 'rig-core.json'), `${JSON.stringify(core, null, 2)}\n`);
await writeFile(resolve(dataDirectory, 'muscles.json'), `${JSON.stringify(muscles, null, 2)}\n`);
console.log('Packaged Phase 0 rig as lazy core and muscle payloads.');
