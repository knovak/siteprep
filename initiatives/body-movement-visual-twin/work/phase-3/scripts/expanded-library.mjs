import { REGIONS } from './expanded-studies.mjs';

const SOURCES = {
  yoga: { title: 'Iyengar Yoga UK teaching syllabi', url: 'https://iyengaryoga.org.uk/wp-content/uploads/2022/09/I8-Teaching-syllabi.pdf', supports: ['named asanas and posture families; not the authored animation angles'] },
  feldenkrais: { title: 'International Feldenkrais Federation competency profile', url: 'https://feldenkrais-method.org/wp-content/uploads/English-Competency-Profile.pdf', supports: ['original movement exploration, attention, differentiation, and rest; not a reproduction of a lesson'] },
  hands: { title: 'Pleasant Exploration of Hands and Feet', url: 'https://feldenkrais.com/pleasant-exploration-of-hands-and-feet/', supports: ['hand and foot exploration themes; not the authored keyframes'] },
  rolling: { title: 'Feldenkrais Guild: Falling and Getting Up', url: 'https://feldenkrais.com/excerpts-from-the-little-book-of-falling-and-getting-up-by-lavinia-plonka/', supports: ['back-to-side rolling as a movement exploration theme; no lesson wording is copied'] },
  alexander: { title: 'Learning the Alexander Technique', url: 'https://alexandertechnique.co.uk/learning-it/learning-alexander-technique', supports: ['everyday activity, verbal directions, and hands-on guidance; not an exercise prescription'] },
  activities: { title: 'STAT introductory activity themes', url: 'https://alexandertechnique.co.uk/public/course/alexander-technique-introductory-classes', supports: ['sitting, standing, bending, lifting, walking, stairs, and desk activities'] }
};
const muscleFocus = {
  head: ['trapezius-superior-left', 'trapezius-superior-right'],
  shoulders: ['deltoid-left', 'serratus-anterior-left'],
  spine: ['erector-spinae-left', 'external-oblique-right'],
  hips: ['gluteus-medius-left', 'gluteus-maximus-right'],
  legs: ['quadriceps-left', 'hamstrings-right'],
  whole: ['erector-spinae-left', 'gluteus-medius-right']
};
const frame = (id, t, rotations_deg, translations_mm) => ({ id, t, rotations_deg, ...(translations_mm && Object.keys(translations_mm).length ? { translations_mm } : {}) });

function jointAction(joint, base, poses) {
  const family = joint.replace(/-(left|right)$/, '');
  const terms = {
    head: ['nodding', 'turning', 'side bending'],
    'neck-base': ['neck inclination', 'neck turning', 'neck side bending'],
    pelvis: ['pelvic tilt', 'pelvic turning', 'lateral pelvic tilt'],
    'lumbar-spine': ['lumbar rounding and extension', 'lumbar turning', 'lumbar side bending'],
    'thoracic-lower': ['lower-chest rounding and extension', 'lower-chest turning', 'lower-chest side bending'],
    'thoracic-upper': ['upper-chest rounding and extension', 'upper-chest turning', 'upper-chest side bending'],
    clavicle: ['collarbone rotation', 'collarbone turning', 'collarbone elevation and settling'],
    scapula: ['upper-arm rotation', 'forward/backward arm reach', 'arm elevation and lowering'],
    humerus: ['forearm turning', 'elbow folding and opening', 'elbow folding and opening'],
    forearm: ['hand turning', 'wrist deviation', 'wrist flexion and extension'],
    hip: ['hip flexion and extension', 'thigh rotation', 'thigh opening or crossing'],
    femur: ['knee folding and opening', 'lower-leg orientation', 'lower-leg orientation'],
    tibia: ['ankle flexion and extension', 'foot turning', 'foot tilting']
  }[family] || ['bending', 'turning', 'side bending'];
  const changed = terms.filter((_, axis) => poses.some(pose => Math.abs((pose[joint]?.[axis] ?? base[joint]?.[axis] ?? 0) - (base[joint]?.[axis] || 0)) > .01));
  return `illustrative ${[...new Set(changed)].join(' with ') || 'held reference relationship'}`;
}

export function buildExpandedStudy(study) {
  const { id, tradition, summary, base, poses } = study;
  const duration = tradition === 'feldenkrais' ? 30 : 20;
  const changedJoints = [...new Set(poses.flatMap(pose => Object.keys(pose)))].filter(id => id !== 'root');
  const joints = changedJoints.length ? changedJoints : ['pelvis'];
  const actions = joints.map(joint => ({ joint, action: jointAction(joint, base, poses) }));
  const muscles = muscleFocus[study.region].map(id => ({ id, behaviour: 'stabilises' }));
  const phase = (id, start, end, action) => ({ id, t: [start, end], joint_actions: actions.map(entry => ({ ...entry, action: action || entry.action })), muscles });
  const phases = tradition === 'feldenkrais'
    ? [phase('notice', 0, 3, 'observe the starting arrangement'), phase('explore', 3, 19), phase('return', 19, 22, 'return toward the starting arrangement'), phase('rest', 22, 30, 'pause in the starting arrangement')]
    : tradition === 'alexander'
      ? [phase('pause', 0, 4, 'pause before the everyday action'), phase('activity', 4, 14), phase('return', 14, 20, 'return toward the starting arrangement')]
      : [phase('entry', 0, 6), phase('display', 6, 14), phase('exit', 14, 20, 'return toward the starting arrangement')];
  const instruction = tradition === 'feldenkrais' ? {
    exploration: summary,
    attention: [{ phase: 'notice', cue: 'Compare the starting relationships before movement begins.' }, { phase: 'explore', cue: `Observe ${REGIONS[study.region].toLowerCase()} as one region moves relative to another.` }, { phase: 'rest', cue: 'Compare the still reference with the preceding motion; a smaller movement is also an option.' }],
    range: { kind: 'optional', smaller_reference: 'The smaller-range display halves angular and translation excursions from the starting arrangement.' },
    rest_pauses: [{ after_phase: 'return', duration_seconds: 8, note: 'The final eight seconds hold the starting arrangement for comparison.' }]
  } : tradition === 'yoga' ? {
    posture: summary,
    transitions: [{ phase: 'entry', direction: 'entry', cue: 'The animation moves from its stated starting arrangement toward the posture.' }, { phase: 'exit', direction: 'exit', cue: 'The display retraces its path to the starting arrangement.' }],
    modifications: [{ id: 'smaller-range', note: 'A smaller-range illustration reduces movement away from the stated starting arrangement; it is not an individually adapted practice.' }],
    props: [study.position === 'Inverted' ? 'Qualified-teacher support is part of the source practice; support is not rendered.' : 'Optional support is described, not rendered or simulated.']
  } : {
    activity: study.label,
    directions: [{ phase: 'pause', cue: 'Leave room to reconsider the first effort before the action begins.' }, { phase: 'activity', cue: `Allow the head, neck, and back relationship to remain part of ${study.label.toLowerCase()}, without arranging a fixed posture.` }, { phase: 'return', cue: 'Notice the whole action as the reference returns.' }],
    inhibition: 'The initial pause represents not immediately carrying out a habitual response; it does not mean bracing or freezing.',
    manual_guidance_boundary: 'A teacher’s observation, hands-on guidance, and individual directions are not reproduced by this animation.'
  };
  const caution = tradition === 'yoga'
    ? study.position === 'Inverted' ? 'Inverted arrangements can place demands on the neck or upper limbs; this reference cannot assess those demands or whether a posture is suitable.'
      : study.region === 'hips' || study.region === 'legs' ? 'Deep hip or knee arrangements are not a target range; individual joint restrictions and support needs are not represented.'
        : 'This posture illustration does not assess balance, support, joint restrictions, or suitability for an individual.'
    : tradition === 'alexander' ? 'Support, balance, and object weight are not simulated; the display does not replace a teacher’s observation.'
      : 'This is an original movement-theme illustration, not a guided Feldenkrais lesson or a range to reproduce.';
  const sources = [SOURCES[tradition]];
  if (tradition === 'alexander') sources.push(SOURCES.activities);
  if (tradition === 'feldenkrais' && ['shoulders', 'legs'].includes(study.region)) sources.push(SOURCES.hands);
  if (tradition === 'feldenkrais' && /rolling|side-lying/.test(id)) sources.push(SOURCES.rolling);
  const record = {
    id, tradition, title: study.label,
    summary, asset_manifest: '../phase-0/assets/original/reference-rig.json', phases, instruction,
    variations: [{ id: 'smaller-display-range', kind: 'range', note: 'Halve excursions from the authored starting pose while preserving timing and rest.' }, { id: 'mirrored-display', kind: 'side', note: 'Reflect the reference across its sagittal plane; the original source record stays unchanged.' }],
    safety: { cautions: [caution], expects_teacher: tradition === 'alexander' || study.position === 'Inverted', notes: [study.note, 'Educational fitted-reference geometry, not measured motion or individual instruction.'].filter(Boolean).join(' ') },
    source: { tradition_basis: 'Project-authored description and keyframes. Sources identify the practice context or named posture; they do not validate these angles or anatomy annotations.', rights_basis: 'provisional: project-authored record and animation; no third-party movement media or lesson text is packaged', authored_by: 'Siteprep project', authored_on: '2026-09-06', claim_sources: sources,
      review: { status: 'unreviewed', notes: 'Anatomical and tradition claims await review. Highlighted muscle groups are provisional stabilisation hypotheses, not measured activity. The user authorized collection expansion without waiting for practitioner review.' } }
  };
  const firstTime = tradition === 'yoga' ? .3 : tradition === 'alexander' ? .35 : .24;
  const lastTime = tradition === 'feldenkrais' ? 19 / 30 : .7;
  const frames = [frame('start', 0, base, study.placement)];
  if (tradition !== 'yoga') frames.push(frame(tradition === 'alexander' ? 'pause' : 'notice', tradition === 'alexander' ? .2 : .1, base, study.placement));
  poses.forEach((pose, index) => frames.push(frame(`waypoint-${index + 1}`, firstTime + (lastTime - firstTime) * index / Math.max(1, poses.length - 1), { ...base, ...pose }, { ...study.placement, ...study.translations?.[index] })));
  if (tradition === 'feldenkrais') frames.push(frame('rest-start', 22 / 30, base, study.placement));
  frames.push(frame('end', 1, base, study.placement));
  return { record, clip: { id, duration_seconds: duration, description: `${summary} ${study.note || ''} Project-authored, unreviewed illustration.`.replaceAll('  ', ' '), required_samples: frames.map(frame => frame.id), frames, ...(study.planted ? { planted_sagittal_feet: true } : {}) },
    navigation: { id, label: study.label, aliases: (study.alias || '').split(' ').filter(Boolean), group: study.group, position: study.position, regions: [study.region] } };
}

const legacyMetadata = {
  'seated-pelvic-clock-exploration': ['Pelvic clock', 'hips', 'Seated'],
  'supported-seated-side-reach': ['Supported seated side reach', 'spine', 'Seated'],
  'pause-before-standing': ['Pause before standing', 'whole', 'Seated'],
  'mountain-arm-sweep-study': ['Mountain arm sweep', 'shoulders', 'Standing', 'Tadasana'],
  'warrior-two-study': ['Warrior II', 'hips', 'Standing', 'Virabhadrasana II'],
  'triangle-study': ['Triangle', 'spine', 'Standing', 'Utthita Trikonasana'],
  'chair-pose-study': ['Chair pose', 'legs', 'Standing', 'Utkatasana'],
  'standing-forward-fold-study': ['Standing forward fold', 'hips', 'Standing', 'Uttanasana'],
  'dynamic-chair-clock-study': ['Chair clock', 'hips', 'Seated'],
  'shoulder-clock-study': ['Shoulder clock', 'shoulders', 'Seated'],
  'sliding-hand-study': ['Sliding hand and rib response', 'shoulders', 'Seated'],
  'seated-counterturn-study': ['Head, ribs, and pelvis counterturn', 'spine', 'Seated'],
  'seated-weight-shift-study': ['Seated weight shift', 'whole', 'Seated'],
  'ankle-flexion-study': ['Ankle flexion and extension', 'legs', 'Seated'],
  'ankle-circle-study': ['Ankle circle', 'legs', 'Seated'],
  'foot-edge-tilt-study': ['Foot-edge tilt', 'legs', 'Seated'],
  'wrist-flexion-study': ['Wrist flexion and extension', 'shoulders', 'Seated'],
  'wrist-clock-study': ['Wrist clock', 'shoulders', 'Seated'],
  'elbow-fold-study': ['Elbow folding', 'shoulders', 'Seated'],
  'shoulder-glide-study': ['Shoulder glide', 'shoulders', 'Seated'],
  'forward-arm-reach-study': ['Forward reach and chest response', 'shoulders', 'Seated'],
  'head-nod-study': ['Head nod', 'head', 'Seated'],
  'head-sidebend-study': ['Head side bend', 'head', 'Seated'],
  'spinal-round-arch-study': ['Spinal rounding and arching', 'spine', 'Seated'],
  'supine-knee-tilt-study': ['Back-lying knee tilt', 'hips', 'Supine'],
  'heel-slide-study': ['Heel slide', 'legs', 'Supine'],
  'diagonal-lengthening-study': ['Diagonal lengthening', 'whole', 'Supine'],
  'seated-knee-extension-study': ['Seated knee extension', 'legs', 'Seated'],
  'tree-pose-study': ['Tree', 'hips', 'Standing', 'Vrksasana Vrikshasana'],
  'warrior-one-study': ['Warrior I', 'hips', 'Standing', 'Virabhadrasana I'],
  'extended-side-angle-study': ['Extended side angle', 'spine', 'Standing', 'Utthita Parsvakonasana'],
  'wide-standing-fold-study': ['Wide standing fold', 'hips', 'Standing', 'Prasarita Padottanasana'],
  'pyramid-pose-study': ['Pyramid', 'hips', 'Standing', 'Parsvottanasana'],
  'half-moon-study': ['Half moon', 'whole', 'Standing', 'Ardha Chandrasana'],
  'eagle-arms-study': ['Eagle arms', 'shoulders', 'Standing', 'Garudasana'],
  'cow-face-arms-study': ['Cow-face arms', 'shoulders', 'Standing', 'Gomukhasana'],
  'prayer-position-study': ['Prayer position', 'shoulders', 'Standing', 'Namaskarasana'],
  'upward-prayer-study': ['Upward prayer', 'shoulders', 'Standing', 'Urdhva Namaskarasana'],
  'chair-twist-study': ['Chair twist', 'spine', 'Seated', 'Bharadvajasana'],
  'staff-pose-study': ['Staff pose', 'legs', 'Long sitting', 'Dandasana'],
  'seated-forward-fold-study': ['Seated forward fold', 'hips', 'Long sitting', 'Paschimottanasana'],
  'wide-seated-angle-study': ['Wide seated angle', 'hips', 'Long sitting', 'Upavistha Konasana'],
  'legs-up-wall-study': ['Legs up the wall', 'legs', 'Supine', 'Viparita Karani']
};
export function legacyNavigation(record) {
  const metadata = legacyMetadata[record.id];
  if (!metadata) throw new Error(`Missing navigation metadata: ${record.id}`);
  const [label, region, position, aliases = ''] = metadata;
  return { id: record.id, label, aliases: aliases.split(' ').filter(Boolean), regions: [region], position,
    group: record.tradition === 'feldenkrais' ? REGIONS[region] : record.tradition === 'alexander' ? 'Standing and walking' : position };
}
