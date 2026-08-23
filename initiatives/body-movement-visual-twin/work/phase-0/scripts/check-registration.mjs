#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registrationSamples } from './rig-math.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PHASE_DIR = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PHASE_DIR, '../../../..');

const REQUIRED_MUSCLES = new Set([
  'trapezius-superior-left',
  'serratus-anterior-left',
  'deltoid-left',
  'erector-spinae-left',
  'multifidus-left',
  'gluteus-maximus-left',
  'iliopsoas-left',
  'quadriceps-left',
  'hamstrings-left',
  'gastrocnemius-left'
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

export function checkPhase0Data(rig, ledger, options = {}) {
  const errors = [];
  const root = options.repoRoot || REPO_ROOT;
  const assets = new Map(ledger.assets.map((asset) => [asset.id, asset]));

  assert(rig.units === 'mm', 'rig units must be mm', errors);
  assert(rig.registration_tolerance_mm === 8, 'reference tolerance must be exactly 8 mm', errors);
  assert(rig.layers.surface.length > 0, 'surface layer is empty', errors);
  assert(rig.layers.skeleton.length > 0, 'skeleton layer is empty', errors);

  const muscleIds = new Set(rig.layers.muscles.map((muscle) => muscle.id));
  for (const id of REQUIRED_MUSCLES) {
    assert(muscleIds.has(id), `required muscle or group is missing: ${id}`, errors);
  }
  for (const muscle of rig.layers.muscles) {
    assert(Boolean(muscle.review_status), `${muscle.id} has no anatomy review status`, errors);
    assert(assets.has(muscle.source_ref), `${muscle.id} references unknown source ${muscle.source_ref}`, errors);
  }

  const frameIds = new Set(rig.clip.frames.map((frame) => frame.id));
  for (const id of rig.clip.required_samples) {
    assert(frameIds.has(id), `required animation sample is missing: ${id}`, errors);
  }

  for (const ref of rig.rights_refs) {
    const asset = assets.get(ref);
    assert(Boolean(asset), `rig references missing ledger entry ${ref}`, errors);
    if (!asset) continue;
    assert(asset.use_status === 'used', `rig source ${ref} is not marked used`, errors);
    assert(
      ['permitted', 'reference_only'].includes(asset.hosted_private_use),
      `rig source ${ref} is not permitted or reference-only for private hosting`,
      errors
    );
  }
  for (const ref of rig.excluded_rights_refs) {
    assert(!rig.rights_refs.includes(ref), `excluded source ${ref} is packaged by the rig`, errors);
    assert(assets.get(ref)?.use_status === 'excluded', `excluded source ${ref} is not ledgered as excluded`, errors);
  }

  for (const asset of ledger.assets) {
    for (const repositoryPath of asset.repository_paths || []) {
      assert(existsSync(resolve(root, repositoryPath)), `${asset.id} path does not exist: ${repositoryPath}`, errors);
      if (asset.license.includes('BY-SA')) {
        assert(
          repositoryPath.includes('/assets/anatomy/share-alike/'),
          `${asset.id} share-alike material escapes the share-alike directory: ${repositoryPath}`,
          errors
        );
      }
    }
  }

  const attachmentCounts = new Map();
  for (const attachment of rig.attachments) {
    attachmentCounts.set(attachment.muscle_id, (attachmentCounts.get(attachment.muscle_id) || 0) + 1);
  }
  for (const id of muscleIds) {
    assert(attachmentCounts.get(id) === 2, `${id} must have exactly two attachment landmarks`, errors);
  }

  let samples = [];
  try {
    samples = registrationSamples(rig);
  } catch (error) {
    errors.push(error.message);
  }

  const maxSample = samples.reduce(
    (current, sample) => sample.distance_mm > current.distance_mm ? sample : current,
    { distance_mm: 0 }
  );
  for (const sample of samples) {
    assert(
      sample.distance_mm <= rig.registration_tolerance_mm,
      `${sample.muscle}/${sample.endpoint} misses by ${sample.distance_mm.toFixed(3)} mm at ${sample.frame}`,
      errors
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    report: {
      fixture: rig.title,
      clip: rig.clip.id,
      frame_count: rig.clip.frames.length,
      attachment_count: rig.attachments.length,
      registration_sample_count: samples.length,
      tolerance_mm: rig.registration_tolerance_mm,
      maximum_distance_mm: Number(maxSample.distance_mm.toFixed(3)),
      maximum_distance_sample: maxSample.distance_mm > 0
        ? `${maxSample.muscle}/${maxSample.endpoint}@${maxSample.frame}`
        : null,
      anatomy_review_status: rig.anatomy_review.status,
      packaged_rights_refs: rig.rights_refs,
      excluded_rights_refs: rig.excluded_rights_refs
    }
  };
}

export function runPhase0Check() {
  const rig = readJson(resolve(PHASE_DIR, 'assets/original/reference-rig.json'));
  const ledger = readJson(resolve(PHASE_DIR, 'rights-ledger.json'));
  return checkPhase0Data(rig, ledger);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runPhase0Check();
  console.log(JSON.stringify(result.report, null, 2));
  if (!result.ok) {
    for (const error of result.errors) console.error(`FAIL: ${error}`);
    process.exitCode = 1;
  } else {
    console.log('PHASE-0 PASS: rights containment, required layers, samples and 8 mm registration tolerance');
  }
}
