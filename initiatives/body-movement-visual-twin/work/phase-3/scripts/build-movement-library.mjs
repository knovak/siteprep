#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const phaseDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recordsDirectory = resolve(phaseDirectory, 'records');
const authoredOn = '2026-08-22';
const assetManifest = '../phase-0/assets/original/reference-rig.json';

const yogaSource = {
  title: 'Iyengar Yoga Level I curriculum',
  url: 'https://iyengar.hu/wp-content/uploads/2017/11/Curriculum-Level-I.pdf',
  supports: ['named standing postures', 'posture families', 'supported variants']
};
const yogaSequenceSource = {
  title: 'Geeta S. Iyengar practice sequence',
  url: 'https://iyengaryoga.org.uk/wp-content/uploads/2023/06/International-Day-of-Yoga-Sequence-IYUK.pdf',
  supports: ['Tadasana', 'Uttanasana', 'Utthita Trikonasana', 'Virabhadrasana', 'use of props']
};
const feldenkraisSampleSource = {
  title: 'Feldenkrais Guild sample lessons',
  url: 'https://feldenkrais.com/enjoy-a-free-sample-lesson/',
  supports: ['dynamic sitting and chair clock', 'pelvic and spinal exploration', 'shoulder exploration']
};
const feldenkraisHandsSource = {
  title: 'Pleasant Exploration of Hands and Feet',
  url: 'https://feldenkrais.com/pleasant-exploration-of-hands-and-feet/',
  supports: ['small clock movements', 'sliding a hand along a surface', 'initiating from different places']
};
const feldenkraisAnatomySource = {
  title: 'Skeletal anatomy as a basis for attention within the whole',
  url: 'https://feldenkrais.com/skeletal-anatomy-as-a-basis-for-constellating-attention-within-the-whole/',
  supports: ['whole-body skeletal relationships', 'shoulder and pelvic girdle relationship', 'anatomical observation']
};

function source(tradition, claimSources) {
  return {
    tradition_basis: tradition === 'yoga'
      ? 'Project-authored anatomical study using posture names listed by Iyengar Yoga organizations; no teacher sequence or instructional wording is copied.'
      : 'Project-authored anatomical study using movement themes published by the Feldenkrais Guild; no lesson text, recording, or teacher sequence is copied.',
    rights_basis: 'provisional: project-authored record and animation using a procedural fitted-reference body; no third-party movement media or anatomy asset is packaged',
    authored_by: 'Siteprep project',
    authored_on: authoredOn,
    claim_sources: claimSources,
    review: {
      status: 'unreviewed',
      notes: `Requires review by a ${tradition === 'yoga' ? 'yoga' : 'Feldenkrais'} practitioner and an anatomy reviewer.`
    }
  };
}

function yogaRecord({ id, title, summary, phases, posture, modification, props = ['wall'] }) {
  return {
    id,
    tradition: 'yoga',
    title,
    summary,
    asset_manifest: assetManifest,
    phases,
    instruction: {
      posture,
      transitions: [
        { phase: phases[0].id, direction: 'entry', cue: 'The reference animation moves from neutral into the displayed joint arrangement.' },
        { phase: phases.at(-1).id, direction: 'exit', cue: 'The final frames return the fitted reference toward neutral.' }
      ],
      modifications: [{ id: 'supported-reference', note: modification }],
      props
    },
    variations: [{ id: 'smaller-display-range', kind: 'range', note: 'The authored clip may be viewed over a smaller angular range.' }],
    safety: {
      cautions: ['This is an anatomical display, not a recommendation to attempt the posture or match its range.'],
      expects_teacher: false,
      notes: 'Suitability, balance, loading, and individual restrictions are outside this visualization.'
    },
    source: source('yoga', [yogaSource, yogaSequenceSource])
  };
}

function feldenkraisRecord({ id, title, summary, phases, exploration, smaller }) {
  return {
    id,
    tradition: 'feldenkrais',
    title,
    summary,
    asset_manifest: assetManifest,
    phases,
    instruction: {
      exploration,
      attention: phases.map((phase) => ({ phase: phase.id, cue: `The display emphasizes ${phase.joint_actions.map((entry) => entry.joint.replaceAll('-', ' ')).join(' and ')}.` })),
      range: { kind: 'optional', smaller_reference: smaller },
      rest_pauses: [{ after_phase: phases.at(-1).id, duration_seconds: 8, note: 'The animation ends at neutral so the anatomical relationship can be compared.' }]
    },
    variations: [{ id: 'reduced-amplitude', kind: 'range', note: 'A lower-amplitude rendering preserves the same joint relationships.' }],
    safety: {
      cautions: ['This animation visualizes an authored movement theme and is not an Awareness Through Movement lesson.'],
      expects_teacher: false,
      notes: 'The display does not replace verbal guidance, individual variation, or practitioner observation.'
    },
    source: source('feldenkrais', [feldenkraisSampleSource, feldenkraisHandsSource, feldenkraisAnatomySource])
  };
}

const phase = (id, start, end, joint_actions, muscles) => ({ id, t: [start, end], joint_actions, muscles });
const joint = (joint, action) => ({ joint, action });
const muscle = (id, behaviour) => ({ id, behaviour });

const records = [
  yogaRecord({
    id: 'mountain-arm-sweep-study',
    title: 'Tadasana arm-sweep anatomy',
    summary: 'A standing reference shows the shoulder girdle and arm paths as the arms travel from the sides to overhead.',
    phases: [
      phase('raise', 0, 7, [joint('scapula-left', 'upward rotation'), joint('scapula-right', 'upward rotation')], [muscle('serratus-anterior-left', 'shortens'), muscle('serratus-anterior-right', 'shortens')]),
      phase('overhead', 7, 12, [joint('humerus-left', 'elevation'), joint('humerus-right', 'elevation')], [muscle('deltoid-left', 'stabilises'), muscle('deltoid-right', 'stabilises')]),
      phase('return', 12, 18, [joint('scapula-left', 'downward return'), joint('scapula-right', 'downward return')], [muscle('latissimus-dorsi-left', 'lengthens'), muscle('latissimus-dorsi-right', 'lengthens')])
    ],
    posture: 'The model remains upright while both upper limbs move through a symmetrical overhead arc.',
    modification: 'A wall-supported reference would preserve the same shoulder and trunk landmarks.',
    props: ['wall']
  }),
  yogaRecord({
    id: 'warrior-two-study',
    title: 'Virabhadrasana II anatomy',
    summary: 'A wide standing reference exposes hip, knee, pelvis, shoulder, and trunk relationships in Warrior II.',
    phases: [
      phase('open', 0, 6, [joint('hip-left', 'abduction and external rotation'), joint('hip-right', 'abduction')], [muscle('gluteus-medius-left', 'stabilises'), muscle('gluteus-medius-right', 'stabilises')]),
      phase('display', 6, 14, [joint('femur-left', 'knee flexion'), joint('thoracic-upper', 'upright rotation')], [muscle('quadriceps-left', 'stabilises'), muscle('hamstrings-left', 'lengthens')]),
      phase('return', 14, 20, [joint('hip-left', 'return toward neutral'), joint('hip-right', 'return toward neutral')], [muscle('gluteus-maximus-left', 'lengthens'), muscle('gluteus-maximus-right', 'lengthens')])
    ],
    posture: 'The reference uses a wide base, one flexed knee, a vertical trunk, and arms extended in opposite directions.',
    modification: 'A shorter stance or wall support would reduce the displayed hip and knee angles.',
    props: ['wall', 'chair']
  }),
  yogaRecord({
    id: 'triangle-study',
    title: 'Utthita Trikonasana anatomy',
    summary: 'A frontal anatomical study shows a wide stance, lateral trunk angle, and opposing arm lines.',
    phases: [
      phase('lengthen', 0, 6, [joint('hip-left', 'abduction'), joint('hip-right', 'abduction')], [muscle('gluteus-medius-left', 'stabilises'), muscle('gluteus-medius-right', 'stabilises')]),
      phase('side-angle', 6, 14, [joint('lumbar-spine', 'lateral flexion'), joint('thoracic-upper', 'lateral flexion')], [muscle('external-oblique-left', 'shortens'), muscle('external-oblique-right', 'lengthens')]),
      phase('return', 14, 20, [joint('lumbar-spine', 'return toward neutral'), joint('thoracic-upper', 'return toward neutral')], [muscle('erector-spinae-left', 'stabilises'), muscle('erector-spinae-right', 'stabilises')])
    ],
    posture: 'The model keeps both legs long while the torso inclines laterally and the arms remain opposed.',
    modification: 'A hand supported on a chair would shorten the displayed lateral range.',
    props: ['chair', 'block']
  }),
  yogaRecord({
    id: 'chair-pose-study',
    title: 'Utkatasana anatomy',
    summary: 'A side-view-friendly study shows coordinated hip and knee flexion with the trunk and arms counterbalancing.',
    phases: [
      phase('bend', 0, 7, [joint('hip-left', 'flexion'), joint('hip-right', 'flexion'), joint('femur-left', 'knee flexion')], [muscle('quadriceps-left', 'shortens'), muscle('quadriceps-right', 'shortens')]),
      phase('display', 7, 13, [joint('thoracic-lower', 'small forward incline'), joint('scapula-left', 'upward rotation')], [muscle('gluteus-maximus-left', 'stabilises'), muscle('erector-spinae-left', 'stabilises')]),
      phase('return', 13, 20, [joint('hip-left', 'extension toward neutral'), joint('hip-right', 'extension toward neutral')], [muscle('quadriceps-left', 'lengthens'), muscle('quadriceps-right', 'lengthens')])
    ],
    posture: 'The reference bends at hips and knees while the arms travel overhead and the feet remain planted.',
    modification: 'A chair behind the model would mark a smaller hip and knee range.',
    props: ['chair', 'wall']
  }),
  yogaRecord({
    id: 'standing-forward-fold-study',
    title: 'Uttanasana anatomy',
    summary: 'A sagittal study displays hip flexion, spinal segmentation, and posterior-leg muscle paths during a forward fold.',
    phases: [
      phase('hinge', 0, 8, [joint('hip-left', 'flexion'), joint('hip-right', 'flexion')], [muscle('hamstrings-left', 'lengthens'), muscle('hamstrings-right', 'lengthens')]),
      phase('display', 8, 15, [joint('lumbar-spine', 'flexion'), joint('thoracic-lower', 'flexion')], [muscle('erector-spinae-left', 'lengthens'), muscle('erector-spinae-right', 'lengthens')]),
      phase('return', 15, 22, [joint('hip-left', 'extension toward neutral'), joint('lumbar-spine', 'return toward neutral')], [muscle('gluteus-maximus-left', 'shortens'), muscle('gluteus-maximus-right', 'shortens')])
    ],
    posture: 'The reference hinges forward at the hips with an authored degree of spinal flexion and relaxed arm position.',
    modification: 'A chair-supported reference would stop the trunk at a higher angle.',
    props: ['chair', 'blocks']
  }),
  feldenkraisRecord({
    id: 'dynamic-chair-clock-study',
    title: 'Dynamic sitting and chair-clock study',
    summary: 'A seated reference traces small pelvic shifts and shows their propagation through lumbar and thoracic segments.',
    phases: [
      phase('side-shift', 0, 10, [joint('pelvis', 'small lateral tilt'), joint('lumbar-spine', 'following lateral flexion')], [muscle('external-oblique-left', 'shortens'), muscle('external-oblique-right', 'lengthens')]),
      phase('return-across', 10, 22, [joint('pelvis', 'small opposite tilt'), joint('thoracic-lower', 'counterbalancing motion')], [muscle('multifidus-left', 'stabilises'), muscle('multifidus-right', 'stabilises')])
    ],
    exploration: 'An anatomical rendering of a chair-clock theme, emphasizing the relationship between pelvic shift and spinal response.',
    smaller: 'A smaller rendered shift would keep the same pelvis-to-spine relationship.'
  }),
  feldenkraisRecord({
    id: 'shoulder-clock-study',
    title: 'Shoulder-clock anatomy study',
    summary: 'A seated reference traces the scapula around a small clock-like path while the arm remains supported.',
    phases: [
      phase('up-down', 0, 10, [joint('scapula-left', 'elevation and depression')], [muscle('trapezius-superior-left', 'shortens'), muscle('trapezius-inferior-left', 'lengthens')]),
      phase('around', 10, 22, [joint('scapula-left', 'protraction and retraction')], [muscle('serratus-anterior-left', 'shortens'), muscle('rhomboids-left', 'lengthens')])
    ],
    exploration: 'An anatomical display of a small shoulder-clock path, keeping scapular motion distinct from humeral motion.',
    smaller: 'The scapular path can be rendered almost imperceptibly while remaining visible in the anatomy layer.'
  }),
  feldenkraisRecord({
    id: 'sliding-hand-study',
    title: 'Sliding-hand and rib-response study',
    summary: 'A seated reference slides one hand along the thigh and shows the connected elbow, shoulder, rib, and spine changes.',
    phases: [
      phase('slide', 0, 10, [joint('humerus-left', 'elbow flexion'), joint('scapula-left', 'downward glide')], [muscle('biceps-brachii-left', 'shortens'), muscle('triceps-brachii-left', 'lengthens')]),
      phase('follow', 10, 22, [joint('thoracic-upper', 'small lateral flexion'), joint('lumbar-spine', 'following motion')], [muscle('latissimus-dorsi-left', 'lengthens'), muscle('external-oblique-left', 'shortens')])
    ],
    exploration: 'An anatomical rendering of a hand slide with connected movement through the shoulder girdle and ribs.',
    smaller: 'A shorter hand path would preserve the elbow-to-rib relationship.'
  }),
  feldenkraisRecord({
    id: 'seated-counterturn-study',
    title: 'Head, ribs, and pelvis counter-turn study',
    summary: 'A seated reference separates small rotational contributions from the pelvis, ribs, upper thorax, and neck.',
    phases: [
      phase('turn-together', 0, 10, [joint('pelvis', 'small axial rotation'), joint('thoracic-lower', 'following axial rotation')], [muscle('multifidus-left', 'stabilises'), muscle('external-oblique-right', 'shortens')]),
      phase('differentiate', 10, 22, [joint('thoracic-upper', 'counter-rotation'), joint('neck-base', 'independent rotation')], [muscle('trapezius-superior-left', 'lengthens'), muscle('trapezius-superior-right', 'shortens')])
    ],
    exploration: 'An anatomical study of how pelvis, ribs, and head can rotate together and then differentiate.',
    smaller: 'The counter-turn can be rendered at lower amplitude without changing the segment order.'
  }),
  feldenkraisRecord({
    id: 'seated-weight-shift-study',
    title: 'Seated weight-shift and foot-response study',
    summary: 'A seated reference shifts across the pelvis while the hip, knee, ankle, and trunk paths remain visible.',
    phases: [
      phase('shift-left', 0, 10, [joint('pelvis', 'left lateral translation'), joint('hip-left', 'small adduction')], [muscle('gluteus-medius-left', 'stabilises'), muscle('external-oblique-right', 'lengthens')]),
      phase('shift-right', 10, 22, [joint('pelvis', 'right lateral translation'), joint('hip-right', 'small adduction')], [muscle('gluteus-medius-right', 'stabilises'), muscle('external-oblique-left', 'lengthens')])
    ],
    exploration: 'An anatomical rendering of a small seated weight shift and its relationship to both feet and the spine.',
    smaller: 'A narrower side-to-side shift would retain the same bilateral landmarks.'
  })
];

const armsDown = { 'scapula-left': [0, 0, 90], 'scapula-right': [0, 0, -90] };
const seated = { ...armsDown, 'hip-left': [90, 0, 0], 'hip-right': [90, 0, 0], 'femur-left': [-90, 0, 0], 'femur-right': [-90, 0, 0] };
const frame = (id, t, rotations_deg, translations_mm) => ({ id, t, rotations_deg, ...(translations_mm ? { translations_mm } : {}) });
const clip = (id, duration_seconds, description, frames) => ({ id, duration_seconds, description, required_samples: frames.map((entry) => entry.id), frames });

const clips = {
  'seated-pelvic-clock-exploration': clip('seated-pelvic-clock-exploration', 30, 'A seated fitted-reference pelvis and spine motion; project-authored, not measured.', [
    frame('start', 0, seated), frame('notice-center', .2, { ...seated, 'lumbar-spine': [2, 0, 0] }), frame('explore-forward', .45, { ...seated, 'lumbar-spine': [5, 0, 0], 'thoracic-lower': [2.5, 0, 0] }), frame('explore-back', .75, { ...seated, 'lumbar-spine': [-4, 0, 0], 'thoracic-lower': [-2, 0, 0] }), frame('return', 1, seated)
  ]),
  'supported-seated-side-reach': clip('supported-seated-side-reach', 28, 'A supported seated side-reach anatomical study; project-authored, not measured.', [
    frame('start', 0, seated), frame('enter', .28, { ...seated, 'scapula-left': [0, 0, -80], 'humerus-left': [0, 0, -10] }), frame('stay', .62, { ...seated, 'thoracic-lower': [0, 0, -4], 'thoracic-upper': [0, 0, -8], 'scapula-left': [0, 0, -90] }), frame('exit-upright', .86, { ...seated, 'scapula-left': [0, 0, -70] }), frame('end', 1, seated)
  ]),
  'pause-before-standing': clip('pause-before-standing', 14, 'A seated pause and whole-torso incline; it stops before claiming to reproduce standing.', [
    frame('start', 0, seated), frame('pause', .4, seated), frame('incline', .74, { ...seated, 'lumbar-spine': [4, 0, 0], 'thoracic-lower': [7, 0, 0], 'neck-base': [-2, 0, 0] }), frame('begin-standing', 1, { ...seated, 'hip-left': [72, 0, 0], 'hip-right': [72, 0, 0], 'femur-left': [-68, 0, 0], 'femur-right': [-68, 0, 0], 'lumbar-spine': [5, 0, 0], 'thoracic-lower': [9, 0, 0] })
  ]),
  'mountain-arm-sweep-study': clip('mountain-arm-sweep-study', 18, 'A symmetrical standing arm sweep on the fitted reference.', [frame('start', 0, armsDown), frame('raise', .38, { 'scapula-left': [0, 0, 20], 'scapula-right': [0, 0, -20] }), frame('overhead', .68, { 'scapula-left': [0, 0, -90], 'scapula-right': [0, 0, 90] }), frame('return', 1, armsDown)]),
  'warrior-two-study': clip('warrior-two-study', 20, 'A frontal wide-stance Warrior II anatomical estimate.', [frame('start', 0, armsDown), frame('open', .3, { 'hip-left': [0, 0, -24], 'hip-right': [0, 0, 24] }), frame('display', .7, { 'hip-left': [0, 0, -24], 'hip-right': [0, 0, 24], 'femur-left': [0, 0, 48] }), frame('return', 1, armsDown)]),
  'triangle-study': clip('triangle-study', 20, 'A frontal wide-stance triangle anatomical estimate.', [frame('start', 0, armsDown), frame('lengthen', .3, { 'hip-left': [0, 0, -22], 'hip-right': [0, 0, 22] }), frame('side-angle', .7, { 'hip-left': [0, 0, -22], 'hip-right': [0, 0, 22], 'lumbar-spine': [0, 0, -18], 'thoracic-lower': [0, 0, -12] }), frame('return', 1, armsDown)]),
  'chair-pose-study': clip('chair-pose-study', 20, 'A sagittal hip-and-knee flexion anatomical estimate.', [frame('start', 0, armsDown), frame('bend', .36, { ...armsDown, 'hip-left': [24, 0, 0], 'hip-right': [24, 0, 0], 'femur-left': [-42, 0, 0], 'femur-right': [-42, 0, 0] }), frame('display', .68, { 'scapula-left': [0, 0, -78], 'scapula-right': [0, 0, 78], 'hip-left': [32, 0, 0], 'hip-right': [32, 0, 0], 'femur-left': [-58, 0, 0], 'femur-right': [-58, 0, 0], 'thoracic-lower': [8, 0, 0] }), frame('return', 1, armsDown)]),
  'standing-forward-fold-study': clip('standing-forward-fold-study', 22, 'A sagittal hip-hinge and segmented forward-fold anatomical estimate.', [frame('start', 0, armsDown), frame('hinge', .36, { ...armsDown, 'hip-left': [50, 0, 0], 'hip-right': [50, 0, 0] }), frame('display', .7, { ...armsDown, 'hip-left': [72, 0, 0], 'hip-right': [72, 0, 0], 'lumbar-spine': [24, 0, 0], 'thoracic-lower': [18, 0, 0], 'neck-base': [-18, 0, 0] }), frame('return', 1, armsDown)]),
  'dynamic-chair-clock-study': clip('dynamic-chair-clock-study', 22, 'A seated pelvic side-shift anatomical estimate.', [frame('start', 0, seated), frame('side-shift', .45, { ...seated, pelvis: [0, 0, -6], 'lumbar-spine': [0, 0, 5] }, { root: [-28, 0, 0] }), frame('return-across', .8, { ...seated, pelvis: [0, 0, 6], 'lumbar-spine': [0, 0, -5] }, { root: [28, 0, 0] }), frame('end', 1, seated)]),
  'shoulder-clock-study': clip('shoulder-clock-study', 22, 'A seated left-scapula clock-path anatomical estimate.', [frame('start', 0, seated), frame('up-down', .35, { ...seated, 'scapula-left': [0, 0, 84] }, { 'scapula-left': [0, 22, 0] }), frame('around', .72, { ...seated, 'scapula-left': [0, 8, 96] }, { 'scapula-left': [-16, -10, 0] }), frame('end', 1, seated)]),
  'sliding-hand-study': clip('sliding-hand-study', 22, 'A seated hand-slide and rib-response anatomical estimate.', [frame('start', 0, seated), frame('slide', .45, { ...seated, 'scapula-left': [0, 0, 76], 'humerus-left': [0, 0, -55], 'forearm-left': [0, 0, -35] }), frame('follow', .78, { ...seated, 'scapula-left': [0, 0, 72], 'humerus-left': [0, 0, -68], 'thoracic-upper': [0, 0, -7], 'lumbar-spine': [0, 0, -3] }), frame('end', 1, seated)]),
  'seated-counterturn-study': clip('seated-counterturn-study', 22, 'A seated pelvis, ribs, and head counter-turn anatomical estimate.', [frame('start', 0, seated), frame('turn-together', .45, { ...seated, pelvis: [0, 9, 0], 'thoracic-lower': [0, 8, 0] }), frame('differentiate', .78, { ...seated, pelvis: [0, 9, 0], 'thoracic-lower': [0, 5, 0], 'thoracic-upper': [0, -8, 0], 'neck-base': [0, -12, 0] }), frame('end', 1, seated)]),
  'seated-weight-shift-study': clip('seated-weight-shift-study', 22, 'A seated bilateral weight-shift anatomical estimate.', [frame('start', 0, seated), frame('shift-left', .42, { ...seated, pelvis: [0, 0, -5], 'hip-left': [88, 0, -3] }, { root: [-34, 0, 0] }), frame('shift-right', .78, { ...seated, pelvis: [0, 0, 5], 'hip-right': [88, 0, 3] }, { root: [34, 0, 0] }), frame('end', 1, seated)]),
};

const baseRecords = [
  { tradition: 'feldenkrais', record: '../phase-1/fixtures/feldenkrais.json' },
  { tradition: 'yoga', record: '../phase-1/fixtures/yoga.json' },
  { tradition: 'alexander', record: '../phase-1/fixtures/alexander.json' }
];
const generatedRecords = records.map((record) => ({ tradition: record.tradition, record: `./records/${record.id}.json` }));
const collection = {
  id: 'anatomy-in-motion',
  title: 'Anatomy in motion across yoga, Feldenkrais, and Alexander Technique studies',
  records: [...baseRecords, ...generatedRecords]
};

await mkdir(recordsDirectory, { recursive: true });
for (const record of records) await writeFile(resolve(recordsDirectory, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
await writeFile(resolve(phaseDirectory, 'data/collection.json'), `${JSON.stringify(collection, null, 2)}\n`);
await writeFile(resolve(phaseDirectory, 'data/movement-clips.json'), `${JSON.stringify(clips, null, 2)}\n`);
console.log(`Built movement library with ${collection.records.length} records and ${Object.keys(clips).length} clips.`);
