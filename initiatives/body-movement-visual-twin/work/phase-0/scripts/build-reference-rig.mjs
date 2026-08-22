#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const nodes = [
  ['root', null, [0, 0, 0]],
  ['pelvis', 'root', [0, 900, 0]],
  ['lumbar-spine', 'pelvis', [0, 105, 0]],
  ['thoracic-lower', 'lumbar-spine', [0, 170, 0]],
  ['thoracic-upper', 'thoracic-lower', [0, 190, 0]],
  ['neck-base', 'thoracic-upper', [0, 125, 0]],
  ['head', 'neck-base', [0, 150, 0]],
  ['clavicle-left', 'thoracic-upper', [-40, 85, 18]],
  ['clavicle-right', 'thoracic-upper', [40, 85, 18]],
  ['scapula-left', 'thoracic-upper', [-105, 50, -25]],
  ['scapula-right', 'thoracic-upper', [105, 50, -25]],
  ['humerus-left', 'scapula-left', [-215, 0, 0]],
  ['humerus-right', 'scapula-right', [215, 0, 0]],
  ['forearm-left', 'humerus-left', [-235, 0, 0]],
  ['forearm-right', 'humerus-right', [235, 0, 0]],
  ['hand-left', 'forearm-left', [-145, 0, 0]],
  ['hand-right', 'forearm-right', [145, 0, 0]],
  ['hip-left', 'pelvis', [-90, -35, 0]],
  ['hip-right', 'pelvis', [90, -35, 0]],
  ['femur-left', 'hip-left', [0, -395, 0]],
  ['femur-right', 'hip-right', [0, -395, 0]],
  ['tibia-left', 'femur-left', [0, -390, 0]],
  ['tibia-right', 'femur-right', [0, -390, 0]],
  ['foot-left', 'tibia-left', [0, -55, 115]],
  ['foot-right', 'tibia-right', [0, -55, 115]],
  ['toe-left', 'foot-left', [0, 0, 145]],
  ['toe-right', 'foot-right', [0, 0, 145]]
].map(([id, parent, translation_mm]) => ({ id, parent, translation_mm }));

const surface = [
  ['pelvis-shell', 'pelvis', 'lumbar-spine', 155, 'pelvis'],
  ['abdomen-shell', 'lumbar-spine', 'thoracic-lower', 132, 'torso'],
  ['chest-shell', 'thoracic-lower', 'neck-base', 166, 'torso'],
  ['head-shell', 'neck-base', 'head', 92, 'head'],
  ['left-upper-arm-shell', 'scapula-left', 'humerus-left', 62, 'limb'],
  ['right-upper-arm-shell', 'scapula-right', 'humerus-right', 62, 'limb'],
  ['left-forearm-shell', 'humerus-left', 'forearm-left', 49, 'limb'],
  ['right-forearm-shell', 'humerus-right', 'forearm-right', 49, 'limb'],
  ['left-hand-shell', 'forearm-left', 'hand-left', 37, 'extremity'],
  ['right-hand-shell', 'forearm-right', 'hand-right', 37, 'extremity'],
  ['left-thigh-shell', 'hip-left', 'femur-left', 91, 'limb'],
  ['right-thigh-shell', 'hip-right', 'femur-right', 91, 'limb'],
  ['left-calf-shell', 'femur-left', 'tibia-left', 69, 'limb'],
  ['right-calf-shell', 'femur-right', 'tibia-right', 69, 'limb'],
  ['left-foot-shell', 'tibia-left', 'toe-left', 45, 'extremity'],
  ['right-foot-shell', 'tibia-right', 'toe-right', 45, 'extremity']
].map(([id, from, to, radius_mm, region]) => ({ id, kind: 'capsule', from, to, radius_mm, region }));

const muscleSpecs = [];
const addPair = (base, label, depth, region, left, right) => {
  for (const [side, endpoints] of [['left', left], ['right', right]]) {
    muscleSpecs.push({
      id: `${base}-${side}`,
      label: `${label}, ${side}`,
      depth,
      region,
      side,
      endpoints
    });
  }
};

addPair('trapezius-superior', 'Trapezius, superior part', 'superficial', 'upper-back', ['neck-base', 'scapula-left'], ['neck-base', 'scapula-right']);
addPair('trapezius-middle', 'Trapezius, middle part', 'superficial', 'upper-back', ['thoracic-upper', 'scapula-left'], ['thoracic-upper', 'scapula-right']);
addPair('trapezius-inferior', 'Trapezius, inferior part', 'superficial', 'upper-back', ['thoracic-lower', 'scapula-left'], ['thoracic-lower', 'scapula-right']);
addPair('serratus-anterior', 'Serratus anterior', 'deep', 'chest', ['thoracic-lower', 'scapula-left'], ['thoracic-lower', 'scapula-right']);
addPair('rhomboids', 'Rhomboids, grouped', 'deep', 'upper-back', ['thoracic-upper', 'scapula-left'], ['thoracic-upper', 'scapula-right']);
addPair('deltoid', 'Deltoid', 'superficial', 'shoulder', ['scapula-left', 'humerus-left'], ['scapula-right', 'humerus-right']);
addPair('pectoralis-major', 'Pectoralis major', 'superficial', 'chest', ['thoracic-upper', 'humerus-left'], ['thoracic-upper', 'humerus-right']);
addPair('latissimus-dorsi', 'Latissimus dorsi', 'superficial', 'back', ['lumbar-spine', 'humerus-left'], ['lumbar-spine', 'humerus-right']);
addPair('biceps-brachii', 'Biceps brachii', 'superficial', 'upper-arm', ['scapula-left', 'forearm-left'], ['scapula-right', 'forearm-right']);
addPair('triceps-brachii', 'Triceps brachii', 'superficial', 'upper-arm', ['scapula-left', 'forearm-left'], ['scapula-right', 'forearm-right']);
addPair('erector-spinae', 'Erector spinae, grouped', 'superficial', 'back', ['pelvis', 'thoracic-upper'], ['pelvis', 'thoracic-upper']);
addPair('multifidus', 'Multifidus, grouped', 'deep', 'back', ['pelvis', 'thoracic-lower'], ['pelvis', 'thoracic-lower']);
addPair('rectus-abdominis', 'Rectus abdominis', 'superficial', 'abdomen', ['pelvis', 'thoracic-lower'], ['pelvis', 'thoracic-lower']);
addPair('external-oblique', 'External oblique', 'superficial', 'abdomen', ['pelvis', 'thoracic-lower'], ['pelvis', 'thoracic-lower']);
addPair('gluteus-maximus', 'Gluteus maximus', 'superficial', 'hip', ['pelvis', 'femur-left'], ['pelvis', 'femur-right']);
addPair('gluteus-medius', 'Gluteus medius', 'deep', 'hip', ['pelvis', 'femur-left'], ['pelvis', 'femur-right']);
addPair('iliopsoas', 'Iliopsoas, grouped', 'deep', 'hip', ['lumbar-spine', 'femur-left'], ['lumbar-spine', 'femur-right']);
addPair('quadriceps', 'Quadriceps, grouped', 'superficial', 'thigh', ['hip-left', 'tibia-left'], ['hip-right', 'tibia-right']);
addPair('hamstrings', 'Hamstrings, grouped', 'superficial', 'thigh', ['pelvis', 'tibia-left'], ['pelvis', 'tibia-right']);
addPair('gastrocnemius', 'Gastrocnemius', 'superficial', 'lower-leg', ['femur-left', 'foot-left'], ['femur-right', 'foot-right']);

const offsets = {
  left: [-5, 0, 9],
  right: [5, 0, 9]
};

const muscles = muscleSpecs.map(({ endpoints, ...muscle }) => ({
  ...muscle,
  source_ref: muscle.region === 'shoulder' || muscle.region === 'upper-arm' ? 'open3dmodel-upper-limb' : 'visible-human-reference',
  review_status: 'unreviewed'
}));

const attachments = muscleSpecs.flatMap((muscle) => muscle.endpoints.map((bone_id, index) => {
  const sideOffset = offsets[muscle.side];
  const longitudinal = index === 0 ? 8 : -8;
  const bone_landmark_local_mm = [sideOffset[0], longitudinal, sideOffset[2]];
  return {
    muscle_id: muscle.id,
    endpoint: index === 0 ? 'origin' : 'insertion',
    bone_id,
    bone_landmark_local_mm,
    geometry_landmark_local_mm: [bone_landmark_local_mm[0] + 1.5, bone_landmark_local_mm[1] + .5, bone_landmark_local_mm[2] + .5]
  };
}));

const clip = {
  id: 'full-body-neutral-reference',
  description: 'A project-authored full-body reference pose used to verify registration; it is not measured motion.',
  required_samples: ['start', 'midpoint', 'end', 'shoulder-angle-extremum', 'thoracic-angle-extremum'],
  frames: [
    { id: 'start', t: 0, kind: 'start', rotations_deg: {} },
    { id: 'shoulder-angle-extremum', t: .25, kind: 'joint-angle-extremum', rotations_deg: { 'scapula-left': [0, 0, -12], 'scapula-right': [0, 0, 12], 'humerus-left': [0, 0, -28], 'humerus-right': [0, 0, 28] } },
    { id: 'midpoint', t: .5, kind: 'midpoint', rotations_deg: { 'thoracic-lower': [0, 3, 0], 'thoracic-upper': [0, 0, 3], 'hip-left': [0, 0, -6], 'hip-right': [0, 0, 6] } },
    { id: 'thoracic-angle-extremum', t: .75, kind: 'joint-angle-extremum', rotations_deg: { 'thoracic-lower': [0, 6, 0], 'thoracic-upper': [2, 0, 5], 'scapula-left': [0, 0, -5], 'scapula-right': [0, 0, 5] } },
    { id: 'end', t: 1, kind: 'end', rotations_deg: {} }
  ]
};

const rig = {
  schema_version: 2,
  title: 'Full-body shared fitted-reference rig',
  units: 'mm',
  reference_stature_mm: 1700,
  registration_tolerance_mm: 8,
  rights_refs: ['project-procedural-fixture', 'open3dmodel-skeleton', 'open3dmodel-upper-limb', 'visible-human-reference'],
  excluded_rights_refs: ['skel-data-software', 'smpl-model'],
  layers: {
    surface,
    skeleton: nodes.filter((node) => node.id !== 'root').map((node) => node.id),
    muscles
  },
  nodes,
  attachments,
  clip,
  anatomy_review: {
    status: 'unreviewed',
    scope: 'All procedural bone proportions, muscle names, grouping, landmarks, and paths in this fitted-reference rig.',
    required_before_claiming_anatomical_accuracy: true
  }
};

await writeFile(resolve(phaseDirectory, 'assets/original/reference-rig.json'), `${JSON.stringify(rig, null, 2)}\n`);
console.log(`Built ${nodes.length}-node, ${muscles.length}-muscle fitted-reference rig.`);
