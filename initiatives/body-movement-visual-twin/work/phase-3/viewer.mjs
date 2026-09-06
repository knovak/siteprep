import { globalMatrices, transformPoint } from '../phase-0/scripts/rig-math.mjs';
import { interpolateMovementPose } from './src/movement-pose.mjs';
import { createAxialGeometry, createMuscleGeometry, createSkullGeometry } from './src/anatomy-geometry.mjs';
import { TRADITION_LABELS, anatomySummary, instructionSections, movementCompleteness } from './src/collection.mjs';
import {
  DEFAULT_VISUAL_PROFILE,
  PRESENTATIONS,
  describeProfileChange,
  normalizeVisualProfile,
  personalizeSurfacePoint,
  scaleMuscleData,
  scaleReferenceRig,
  surfaceAppearance
} from '../phase-4/src/visual-twin-controls.mjs';
import {
  claimDescriptors,
  createReviewReport,
  reviewEmailUrl,
  serializeReviewReport
} from '../phase-5/src/review-report.mjs';
import {
  LAYER_STATES,
  anatomyIsVisible,
  cameraPreset,
  createViewerState,
  musclesAreRequested,
  orbit,
  setIsolatedJoint,
  setLayer,
  setPinned,
  setTime,
  zoom
} from '../phase-2/src/viewer-state.mjs';

const $ = (selector) => document.querySelector(selector);
const stage = $('#stage');
const canvas = $('#model-canvas');
const context = canvas.getContext('2d');
let state = setLayer(createViewerState(), 2);
let rig;
let movement;
let movements;
let collection;
let clips;
let clip;
let muscles;
let muscleRequest;
let lastFrameTime = 0;
let dragPoint;
let visualProfile = DEFAULT_VISUAL_PROFILE;
let selectedClaim;
let projectionFrame = { centerX: 0, centerY: 850, scale: 1, offsetY: 0 };
let projectionKey = '';
const reviewInbox = '';

const [coreResponse, collectionResponse, clipsResponse] = await Promise.all([
  fetch('../phase-2/data/rig-core.json'),
  fetch('./data/collection.json'),
  fetch('./data/movement-clips.json')
]);
if (!coreResponse.ok || !collectionResponse.ok || !clipsResponse.ok) throw new Error('The movement collection data could not be loaded.');
rig = await coreResponse.json();
collection = await collectionResponse.json();
clips = await clipsResponse.json();
const recordResponses = await Promise.all(collection.records.map((entry) => fetch(entry.record)));
if (recordResponses.some((response) => !response.ok)) throw new Error('A movement record could not be loaded.');
movements = await Promise.all(recordResponses.map((response) => response.json()));
movement = movements[0];
clip = clips[movement.id];

$('#movement-select').replaceChildren(...Object.keys(TRADITION_LABELS).flatMap((tradition) => {
  const records = movements.filter((record) => record.tradition === tradition);
  if (!records.length) return [];
  const group = document.createElement('optgroup');
  group.label = TRADITION_LABELS[tradition];
  group.append(...records.map((record) => Object.assign(document.createElement('option'), {
    value: record.id,
    textContent: record.title
  })));
  return [group];
}));

function startWebGL() {
  if (new URLSearchParams(location.search).has('noWebgl')) return false;
  const gl = $('#gl-canvas').getContext('webgl', { antialias: true, alpha: false });
  if (!gl) return false;
  gl.clearColor(0.075, 0.09, 0.11, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return true;
}

const interactive = startWebGL();
if (!interactive) {
  stage.hidden = true;
  $('#webgl-fallback').hidden = false;
  for (const element of document.querySelectorAll('.control-card button, .control-card input, .control-card select:not(#movement-select)')) element.disabled = true;
}

function interpolateFrame(time) {
  return interpolateMovementPose(scaleReferenceRig(rig, visualProfile), clip, time);
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function cameraPoint(point) {
  const [x, y, z] = point;
  const cosineYaw = Math.cos(state.camera.yaw);
  const sineYaw = Math.sin(state.camera.yaw);
  const horizontal = x * cosineYaw + z * sineYaw;
  const depth = -x * sineYaw + z * cosineYaw;
  const cosinePitch = Math.cos(state.camera.pitch);
  const sinePitch = Math.sin(state.camera.pitch);
  const vertical = y * cosinePitch - depth * sinePitch;
  return [horizontal, vertical, depth];
}

function fitProjection(displayRig) {
  const nextKey = [
    clip.id,
    canvas.width,
    canvas.height,
    state.camera.yaw.toFixed(4),
    state.camera.pitch.toFixed(4),
    state.camera.zoom.toFixed(4),
    visualProfile.statureCm,
    visualProfile.build.toFixed(3),
    visualProfile.torsoToLimb.toFixed(3),
    visualProfile.presentation
  ].join(':');
  if (nextKey === projectionKey) return;
  const points = clip.frames.flatMap((frame) => {
    const matrices = globalMatrices(displayRig, frame);
    return [...displayRig.nodes
      .filter((node) => node.id !== 'root')
      .map((node) => cameraPoint(transformPoint(matrices.get(node.id), [0, 0, 0]))),
      ...createSkullGeometry(displayRig, matrices).bones.flatMap((bone) => bone.points.map(cameraPoint))];
  });
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const stature = displayRig.reference_stature_mm / 1700;
  const minX = Math.min(...xs) - 90 * stature;
  const maxX = Math.max(...xs) + 90 * stature;
  const minY = Math.min(...ys) - 50 * stature;
  const maxY = Math.max(...ys) + 110 * stature;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const top = 112 * ratio;
  const bottom = 64 * ratio;
  const padding = canvas.width * .06;
  const fitted = Math.min(
    (canvas.width - padding * 2) / Math.max(360, maxX - minX),
    (canvas.height - top - bottom) / Math.max(620, maxY - minY)
  );
  projectionFrame = {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    scale: fitted * state.camera.zoom,
    offsetY: (top - bottom) / 2
  };
  projectionKey = nextKey;
}

function project(point) {
  const [horizontal, vertical, depth] = cameraPoint(point);
  return [
    canvas.width / 2 + (horizontal - projectionFrame.centerX) * projectionFrame.scale,
    canvas.height / 2 + projectionFrame.offsetY - (vertical - projectionFrame.centerY) * projectionFrame.scale,
    depth
  ];
}

function visibleAround(nodeId) {
  if (state.isolatedJoint === 'none') return true;
  const accepted = new Set([state.isolatedJoint]);
  let current = rig.nodes.find((node) => node.id === state.isolatedJoint);
  for (let count = 0; current && count < 2; count += 1) {
    accepted.add(current.id);
    current = rig.nodes.find((node) => node.id === current.parent);
  }
  for (const node of rig.nodes) if (node.parent === state.isolatedJoint) accepted.add(node.id);
  return accepted.has(nodeId);
}

function line(a, b, options = {}) {
  const start = project(a);
  const end = project(b);
  context.save();
  context.strokeStyle = options.color || '#f5f0e6';
  context.globalAlpha = options.alpha ?? 1;
  context.lineWidth = options.width || 4;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(start[0], start[1]);
  context.lineTo(end[0], end[1]);
  context.stroke();
  context.restore();
}

function point(location, radius, color, alpha = 1) {
  const projected = project(location);
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.arc(projected[0], projected[1], radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function visibility() {
  return {
    surface: [0, 1, 2, 3, 4].includes(state.layer) || state.pinned === 'surface',
    skeleton: [1, 4, 5].includes(state.layer) || state.pinned === 'skeleton',
    superficial: [2, 4].includes(state.layer) || state.pinned === 'muscles',
    deep: [3, 4].includes(state.layer) || state.pinned === 'muscles'
  };
}

function drawSurface(matrices, alpha, displayRig) {
  const appearance = surfaceAppearance(visualProfile);
  const shells = displayRig.layers.surface.filter((shell) => !['torso', 'pelvis', 'head'].includes(shell.region)).map((shell) => {
    const start = personalizeSurfacePoint(transformPoint(matrices.get(shell.from), [0, 0, 0]), shell.from, visualProfile);
    const end = personalizeSurfacePoint(transformPoint(matrices.get(shell.to), [0, 0, 0]), shell.to, visualProfile);
    return { shell, start, end, depth: (project(start)[2] + project(end)[2]) / 2 };
  }).sort((a, b) => a.depth - b.depth);
  for (const { shell, start, end } of shells) {
    if (!visibleAround(shell.from) && !visibleAround(shell.to)) continue;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const regionFactor = shell.region === 'torso' ? appearance.torsoFactor : shell.region === 'limb' ? appearance.limbFactor : 1;
    const width = Math.max(20, shell.radius_mm * appearance.radiusFactor * regionFactor * 1.28 * projectionFrame.scale);
    line(start, end, { color: '#2d1d19', alpha: alpha * .62, width: width * 1.08 });
    line(start, end, { color: appearance.color, alpha, width });
  }
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const world = (nodeId, local = [0, 0, 0]) => personalizeSurfacePoint(transformPoint(matrices.get(nodeId), local), nodeId, visualProfile);
  const leftShoulder = world('scapula-left', [-45, 38, 0]);
  const rightShoulder = world('scapula-right', [45, 38, 0]);
  const leftChest = world('thoracic-lower', [-128, 55, 0]);
  const rightChest = world('thoracic-lower', [128, 55, 0]);
  const leftWaist = world('lumbar-spine', [-82, 15, 0]);
  const rightWaist = world('lumbar-spine', [82, 15, 0]);
  const leftHip = world('pelvis', [-126, -34, 0]);
  const rightHip = world('pelvis', [126, -34, 0]);
  const neck = personalizeSurfacePoint(transformPoint(matrices.get('neck-base'), [0, 0, 0]), 'neck-base', visualProfile);
  const frontSilhouette = [leftShoulder, leftChest, leftWaist, leftHip, rightHip, rightWaist, rightChest, rightShoulder];
  const sideSilhouette = [
    world('thoracic-upper', [0, 45, -68]),
    world('thoracic-lower', [0, 55, -98]),
    world('lumbar-spine', [0, 15, -76]),
    world('pelvis', [0, -34, -108]),
    world('pelvis', [0, -34, 112]),
    world('lumbar-spine', [0, 15, 84]),
    world('thoracic-lower', [0, 55, 118]),
    world('thoracic-upper', [0, 45, 78])
  ];
  const sideAmount = Math.abs(Math.sin(state.camera.yaw));
  const silhouette = frontSilhouette.map((front, index) => front.map((value, axis) => (
    value + (sideSilhouette[index][axis] - value) * sideAmount
  ))).map(project);
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = appearance.color;
  context.strokeStyle = '#4b3029';
  context.lineWidth = 2 * ratio;
  context.beginPath();
  context.moveTo(silhouette[0][0], silhouette[0][1]);
  for (const location of silhouette.slice(1)) context.lineTo(location[0], location[1]);
  context.closePath();
  context.fill();
  context.stroke();
  traceProjected(convexHull(createSkullGeometry(displayRig, matrices).bones.flatMap((bone) => bone.points.map(project))), true);
  context.fill();
  context.stroke();
  context.restore();
  line(world('thoracic-upper'), neck, { color: appearance.color, alpha, width: 58 * appearance.radiusFactor * projectionFrame.scale });
  for (const joint of ['scapula-left', 'scapula-right', 'humerus-left', 'humerus-right', 'forearm-left', 'forearm-right', 'hip-left', 'hip-right', 'femur-left', 'femur-right', 'tibia-left', 'tibia-right']) {
    point(world(joint), 14 * projectionFrame.scale, appearance.color, alpha);
  }
}

function boneLandmarks(matrices, alpha = 1) {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const ellipseAt = (nodeId, radiusX, radiusY, color) => {
    if (!visibleAround(nodeId)) return;
    const [x, y] = project(transformPoint(matrices.get(nodeId), [0, 0, 0]));
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.strokeStyle = '#8c7855';
    context.lineWidth = 1.5 * ratio;
    context.beginPath();
    context.ellipse(x, y, radiusX * projectionFrame.scale, radiusY * projectionFrame.scale, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  };
  ellipseAt('pelvis', 135, 72, '#d8c69f');
}

function drawSkeleton(matrices, displayRig, activeJoints) {
  const axialNodes = new Set(['pelvis', 'lumbar-spine', 'thoracic-lower', 'thoracic-upper', 'neck-base', 'head']);
  const segments = displayRig.nodes.map((node) => {
    if (!node.parent || node.id === 'root' || axialNodes.has(node.id) || node.id.startsWith('clavicle-') || node.id.startsWith('scapula-') || !visibleAround(node.id)) return null;
    const start = transformPoint(matrices.get(node.parent), [0, 0, 0]);
    const end = transformPoint(matrices.get(node.id), [0, 0, 0]);
    return { node, start, end, depth: (project(start)[2] + project(end)[2]) / 2 };
  }).filter(Boolean).sort((a, b) => a.depth - b.depth);
  boneLandmarks(matrices, .9);
  const axial = createAxialGeometry(displayRig, matrices);
  const palette = { bone: '#decba8', 'bone-light': '#fff0ce', 'bone-shade': '#ad9270', disc: '#a6b1ae', cartilage: '#c0d5ce', cavity: '#514838' };
  const ordered = axial.bones.filter((bone) => visibleAround(bone.node)).map((bone) => ({ ...bone, depth: bone.points.reduce((sum, p) => sum + project(p)[2], 0) / bone.points.length })).sort((a, b) => a.depth - b.depth);
  for (const bone of ordered) {
    context.save();
    const active = activeJoints.has(bone.node);
    context.strokeStyle = active ? '#e4b360' : '#79664e';
    context.fillStyle = palette[bone.material];
    context.lineJoin = 'round';
    context.lineCap = 'round';
    const points = bone.points.map(project);
    traceProjected(points, !bone.line);
    if (bone.line) {
      context.lineWidth = Math.max(1, bone.width * projectionFrame.scale + 1.5);
      context.stroke();
      context.strokeStyle = palette[bone.material];
      context.lineWidth = Math.max(.6, bone.width * projectionFrame.scale);
      context.stroke();
    } else {
      context.fill();
      context.lineWidth = .55 * Math.min(devicePixelRatio || 1, 2);
      context.stroke();
    }
    context.restore();
  }
  for (const { node, start, end } of segments) {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const active = activeJoints.has(node.id) || activeJoints.has(node.parent);
    const width = (active ? 11 : 7) * projectionFrame.scale;
    line(start, end, { color: active ? '#684414' : '#7f6b49', width: width * 1.55, alpha: .86 });
    line(start, end, { color: active ? '#ffd36e' : '#f0e4c9', width });
    if (['forearm-left', 'forearm-right', 'tibia-left', 'tibia-right'].includes(node.id)) {
      const a = project(start);
      const b = project(end);
      const length = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
      const offsetX = (-(b[1] - a[1]) / length) * 5 * ratio;
      const offsetY = ((b[0] - a[0]) / length) * 5 * ratio;
      context.save();
      context.strokeStyle = active ? '#ffd36e' : '#f0e4c9';
      context.globalAlpha = .92;
      context.lineWidth = Math.max(2, width * .46);
      context.lineCap = 'round';
      for (const direction of [-1, 1]) {
        context.beginPath();
        context.moveTo(a[0] + offsetX * direction, a[1] + offsetY * direction);
        context.lineTo(b[0] + offsetX * direction, b[1] + offsetY * direction);
        context.stroke();
      }
      context.restore();
    }
    point(end, (active ? 9 : 6.5) * projectionFrame.scale, active ? '#ffd36e' : '#fff4d8');
  }
}

function traceProjected(points, closed = false) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (const p of points.slice(1)) context.lineTo(p[0], p[1]);
  if (closed) context.closePath();
}

function convexHull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a, b, c) => (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);
  const half = (list) => {
    const result = [];
    for (const p of list) {
      while (result.length > 1 && cross(result.at(-2),result.at(-1),p) <= 0) result.pop();
      result.push(p);
    }
    return result.slice(0,-1);
  };
  return [...half(sorted),...half(sorted.reverse())];
}

let muscleGeometryCache;
let muscleGeometryKey = '';
function drawMuscles(frame, kinds, displayRig, displayMuscles, activeMuscles, matrices) {
  if (!muscles || !kinds.length) return;
  const key = `${clip.id}:${state.time}:${visualProfile.statureCm}`;
  if (key !== muscleGeometryKey) {
    muscleGeometryCache = createMuscleGeometry(displayRig, matrices);
    muscleGeometryKey = key;
  }
  const facing = Math.cos(state.camera.yaw);
  const availableClaims = new Set(displayMuscles.layers.muscles.map((entry) => entry.id));
  const patches = muscleGeometryCache.filter((patch) => kinds.includes(patch.depth)
    && (patch.claimId === null || availableClaims.has(patch.claimId))
    && visibleAround(patch.node)
    && !(facing > .16 && patch.facing === 'back')
    && !(facing < -.16 && patch.facing === 'front'))
    .sort((a, b) => project(a.center)[2] - project(b.center)[2]);
  const ratio = Math.min(devicePixelRatio || 1, 2);
  for (const patch of patches) {
    const active = activeMuscles.has(patch.claimId);
    const points = patch.contour.map(project);
    context.save();
    context.globalAlpha = .98;
    traceProjected(points, true);
    context.fillStyle = '#823e32';
    context.fill();
    context.strokeStyle = '#46271f';
    context.lineWidth = 1.4 * ratio;
    context.lineJoin = 'round';
    context.stroke();
    for (const strip of patch.strips) {
      const light = strip.shade;
      context.fillStyle = `rgb(${Math.round(120 + light * 79)},${Math.round(36 + light * 56)},${Math.round(32 + light * 43)})`;
      traceProjected(strip.points.map(project), true);
      context.fill();
    }
    for (let i = 0; i < patch.fibers.length; i += 1) {
      context.strokeStyle = i % 3 === 0 ? 'rgba(251,205,173,.43)' : 'rgba(86,29,26,.36)';
      context.lineWidth = (i % 3 === 0 ? .6 : .5) * ratio;
      traceProjected(patch.fibers[i].map(project));
      context.stroke();
    }
    for (const tendon of patch.tendons) {
      const p = tendon.map(project);
      traceProjected(p, true);
      const gradient = context.createLinearGradient(p[0][0], p[0][1], p.at(-1)[0], p.at(-1)[1]);
      gradient.addColorStop(0, 'rgba(250,234,204,.9)');
      gradient.addColorStop(1, 'rgba(243,214,181,.28)');
      context.fillStyle = gradient;
      context.fill();
    }
    if (active) {
      traceProjected(points, true);
      context.strokeStyle = '#f7ce82';
      context.lineWidth = 1.5 * ratio;
      context.stroke();
    }
    context.restore();
  }
}

function render() {
  if (!interactive) return;
  resizeCanvas();
  context.clearRect(0, 0, canvas.width, canvas.height);
  const frame = interpolateFrame(state.time);
  const displayRig = scaleReferenceRig(rig, visualProfile);
  const displayMuscles = muscles ? scaleMuscleData(muscles, visualProfile) : null;
  const matrices = globalMatrices(displayRig, frame);
  fitProjection(displayRig);
  const shown = visibility();
  const phase = activePhase();
  const activeJoints = new Set(phase.joint_actions.map((entry) => entry.joint));
  const activeMuscles = new Set(phase.muscles.map((entry) => entry.id));
  if (shown.surface) drawSurface(matrices, state.layer === 0 ? .9 : state.layer === 1 ? .18 : .28, displayRig);
  if (shown.skeleton) drawSkeleton(matrices, displayRig, activeJoints);
  const muscleKinds = [];
  if (shown.superficial) muscleKinds.push('superficial');
  if (shown.deep) muscleKinds.push('deep');
  drawMuscles(frame, muscleKinds, displayRig, displayMuscles, activeMuscles, matrices);
}

function activePhase() {
  const movementTime = state.time * clip.duration_seconds;
  return movement.phases.find((phase) => movementTime >= phase.t[0] && movementTime <= phase.t[1]) || movement.phases.at(-1);
}

function updateReadout() {
  const phase = activePhase();
  $('#time-output').value = `${Math.round(state.time * clip.duration_seconds)}s · ${Math.round(state.time * 100)}%`;
  $('#timeline').value = Math.round(state.time * 1000);
  $('#phase-name').textContent = phase.id;
  $('#phase-cue').textContent = anatomySummary(movement, phase.id);
  $('#anatomy-status').textContent = `${phase.joint_actions.length} joint claim${phase.joint_actions.length === 1 ? '' : 's'} · ${phase.muscles.length} highlighted muscle group${phase.muscles.length === 1 ? '' : 's'}`;
  $('#layer-output').value = LAYER_STATES[state.layer];
  $('#reference-label').hidden = !anatomyIsVisible(state);
  $('#play').textContent = state.playing ? 'Pause' : 'Play';
  const fullTurn = Math.PI * 2;
  const normalizedYaw = ((state.camera.yaw % fullTurn) + fullTurn) % fullTurn;
  const presetViews = [
    { id: 'front', label: 'Front view', yaw: 0 },
    { id: 'side', label: 'Side view', yaw: Math.PI / 2 },
    { id: 'back', label: 'Back view', yaw: Math.PI }
  ];
  const distance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const activeView = presetViews.find((preset) => distance(normalizedYaw, preset.yaw) < .01 && Math.abs(state.camera.pitch) < .01);
  $('#view-label').textContent = `${activeView?.label || `${Math.round((normalizedYaw * 180) / Math.PI)}° orbit`} · ${state.camera.zoom.toFixed(1)}×`;
  for (const button of document.querySelectorAll('.camera-presets [data-camera]')) button.setAttribute('aria-pressed', String(button.dataset.camera === activeView?.id));
  const currentClaims = claimDescriptors(movement, { phaseId: phase.id }).filter((claim) => claim.kind === 'movement' || claim.kind === 'anatomy');
  $('#claims-list').replaceChildren(...currentClaims.map(flaggableClaim));
  Object.assign(stage.dataset, {
    time: state.time.toFixed(4),
    camera: `${state.camera.yaw.toFixed(4)},${state.camera.pitch.toFixed(4)},${state.camera.zoom.toFixed(4)}`,
    layer: String(state.layer),
    pinned: state.pinned,
    isolatedJoint: state.isolatedJoint,
    musclesLoaded: String(Boolean(muscles)),
    movement: movement.id,
    clip: clip.id,
    profile: `${visualProfile.statureCm},${visualProfile.build.toFixed(2)},${visualProfile.torsoToLimb.toFixed(2)},${visualProfile.presentation}`,
    cameraView: activeView?.id || 'orbit'
  });
  render();
  stage.dataset.projectionScale = projectionFrame.scale.toFixed(6);
}

async function loadMusclesIfNeeded() {
  if (!musclesAreRequested(state) || muscles) return;
  if (!muscleRequest) {
    $('#muscle-loading').hidden = false;
    muscleRequest = Promise.all([
      fetch('../phase-2/data/muscles.json'),
      new Promise((resolve) => setTimeout(resolve, 240))
    ]).then(async ([response]) => {
      if (!response.ok) throw new Error('Named muscle paths could not be loaded.');
      muscles = await response.json();
      state = { ...state, musclesLoaded: true };
    }).finally(() => { $('#muscle-loading').hidden = true; });
  }
  await muscleRequest;
  updateReadout();
}

function apply(next) {
  state = next;
  updateReadout();
  void loadMusclesIfNeeded();
}

function populateRecord() {
  $('#movement-select').value = movement.id;
  $('#movement-title').textContent = movement.title;
  $('#movement-summary').textContent = movement.summary;
  $('#clip-boundary').textContent = clip.description;
  $('#review-pill').textContent = movement.source.review.status;
  $('#authored-by').textContent = movement.source.authored_by;
  $('#authored-on').textContent = movement.source.authored_on;
  $('#review-status').textContent = `${movement.source.review.status}: ${movement.source.review.notes}`;
  $('#rights-basis').textContent = movement.source.rights_basis;
  $('#source-basis').textContent = movement.source.tradition_basis;
  const claims = claimDescriptors(movement);
  const safetyClaims = claims.filter((claim) => claim.kind === 'safety');
  $('#safety-notes').replaceChildren(flaggableClaim(safetyClaims.at(-1)));
  $('#caution-list').replaceChildren(...safetyClaims.slice(0, -1).map(flaggableClaim));
  $('#instruction-sections').replaceChildren(...instructionSections(movement).flatMap((section) => {
    const heading = Object.assign(document.createElement('h3'), { textContent: section.label });
    const copy = Object.assign(document.createElement('p'), { textContent: section.body });
    return [heading, copy];
  }));
  const completeness = movementCompleteness(movement);
  $('#record-incomplete').hidden = completeness.complete;
  $('#record-incomplete').textContent = completeness.complete ? '' : `Incomplete record: missing ${completeness.missing.join(', ')}.`;
  $('#claim-source-list').replaceChildren(...movement.source.claim_sources.map((source) => {
    const item = document.createElement('li');
    const link = Object.assign(document.createElement('a'), {
      href: source.url,
      textContent: source.title,
      target: '_blank',
      rel: 'noreferrer'
    });
    const supports = Object.assign(document.createElement('small'), {
      textContent: `Supports: ${source.supports.join(', ')}`
    });
    const claim = claims.find((candidate) => candidate.path === `source.claim_sources.${movement.source.claim_sources.indexOf(source)}`);
    item.append(link, supports, flagButton(claim));
    return item;
  }));
}

function flagButton(claim) {
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'claim-flag',
    textContent: 'Flag'
  });
  button.dataset.claimPath = claim.path;
  button.dataset.claimKind = claim.kind;
  button.dataset.claimLabel = claim.label;
  button.setAttribute('aria-label', `Flag claim: ${claim.label}`);
  return button;
}

function flaggableClaim(claim) {
  const item = document.createElement('li');
  const text = Object.assign(document.createElement('span'), { textContent: claim.label });
  item.append(text, flagButton(claim));
  return item;
}

function openFlagDialog(claim) {
  selectedClaim = claim;
  $('#flag-claim-label').textContent = claim.label;
  $('#flag-claim-path').textContent = claim.path;
  $('#flag-form').elements.kind.value = claim.kind;
  $('#flag-form').elements.reviewer.value = '';
  $('#flag-form').elements.note.value = '';
  $('#report-preview').hidden = true;
  $('#report-preview').textContent = '';
  $('#report-status').textContent = '';
  $('#email-flag').hidden = !reviewInbox;
  $('#flag-dialog').showModal();
}

function reportFromForm() {
  const fields = new FormData($('#flag-form'));
  return createReviewReport({
    movement,
    claimPath: selectedClaim.path,
    reviewer: fields.get('reviewer'),
    kind: selectedClaim.kind,
    severity: fields.get('severity'),
    note: fields.get('note')
  });
}

function revealReport(report, message) {
  $('#report-preview').textContent = serializeReviewReport(report);
  $('#report-preview').hidden = false;
  $('#report-status').textContent = message;
}

function animate(timestamp) {
  if (state.playing) {
    const elapsed = lastFrameTime ? timestamp - lastFrameTime : 0;
    const nextTime = state.time + elapsed / (clip.duration_seconds * 1000);
    state = nextTime >= 1 ? { ...setTime(state, 1), playing: false } : setTime(state, nextTime);
    updateReadout();
  }
  lastFrameTime = timestamp;
  requestAnimationFrame(animate);
}

function resetMovement() {
  state = { ...setTime(state, 0), playing: false };
  $('#play').disabled = !state.cautionsAccepted;
  $('#play').textContent = 'Play';
  $('#caution-panel').classList.toggle('accepted', state.cautionsAccepted);
  $('#accept-cautions').textContent = state.cautionsAccepted ? 'Playback enabled for this session' : 'Acknowledge boundary — enable playback';
  $('#accept-cautions').disabled = !interactive || state.cautionsAccepted;
}

$('#movement-select').addEventListener('change', (event) => {
  movement = movements.find((record) => record.id === event.target.value);
  clip = clips[movement.id];
  resetMovement();
  populateRecord();
  updateReadout();
});

$('#accept-cautions').addEventListener('click', () => {
  state = { ...state, cautionsAccepted: true };
  $('#play').disabled = false;
  $('#caution-panel').classList.add('accepted');
  $('#accept-cautions').textContent = 'Playback enabled for this session';
  $('#accept-cautions').disabled = true;
});
$('#play').addEventListener('click', () => apply({ ...state, playing: !state.playing }));
$('#replay').addEventListener('click', () => apply({ ...setTime(state, 0), playing: state.cautionsAccepted }));
$('#step-back').addEventListener('click', () => apply({ ...setTime(state, state.time - .025), playing: false }));
$('#step-forward').addEventListener('click', () => apply({ ...setTime(state, state.time + .025), playing: false }));
$('#timeline').addEventListener('input', (event) => apply({ ...setTime(state, Number(event.target.value) / 1000), playing: false }));
function applyVisualProfile(patch) {
  const previous = visualProfile;
  const next = normalizeVisualProfile({ ...visualProfile, ...patch });
  if (Object.keys(next).every((key) => next[key] === previous[key])) return;
  visualProfile = next;
  $('#stature-output').value = `${visualProfile.statureCm} cm`;
  $('#build-output').value = visualProfile.build === 0 ? 'Reference' : visualProfile.build < 0 ? 'Narrower' : 'Fuller';
  $('#proportion-output').value = visualProfile.torsoToLimb === 0 ? 'Reference' : visualProfile.torsoToLimb < 0 ? 'Shorter torso' : 'Longer torso';
  $('#profile-output').value = PRESENTATIONS[visualProfile.presentation].label;
  $('#profile-note').textContent = describeProfileChange(previous, visualProfile);
  updateReadout();
}
function bindRangeControl(selector, applyValue) {
  const control = $(selector);
  const update = (event) => applyValue(Number(event.target.value));
  control.addEventListener('input', update);
  control.addEventListener('change', update);
}
bindRangeControl('#stature', (value) => applyVisualProfile({ statureCm: value }));
bindRangeControl('#build', (value) => applyVisualProfile({ build: value / 100 }));
bindRangeControl('#torso-to-limb', (value) => applyVisualProfile({ torsoToLimb: value / 100 }));
$('#presentation').addEventListener('change', (event) => applyVisualProfile({ presentation: event.target.value }));
$('#layer').addEventListener('change', (event) => apply(setLayer(state, Number(event.target.value))));
$('#pin-layer').addEventListener('change', (event) => apply(setPinned(state, event.target.value)));
$('#isolate-joint').addEventListener('change', (event) => apply(setIsolatedJoint(state, event.target.value)));
for (const button of document.querySelectorAll('.camera-presets [data-camera]')) button.addEventListener('click', () => apply(cameraPreset(state, button.dataset.camera)));

stage.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  dragPoint = [event.clientX, event.clientY];
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener('pointermove', (event) => {
  if (!dragPoint) return;
  const next = [event.clientX, event.clientY];
  apply(orbit(state, (next[0] - dragPoint[0]) * .008, (next[1] - dragPoint[1]) * .008));
  dragPoint = next;
});
stage.addEventListener('pointerup', () => { dragPoint = undefined; });
stage.addEventListener('pointercancel', () => { dragPoint = undefined; });
stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  apply(zoom(state, event.deltaY > 0 ? .9 : 1.1));
}, { passive: false });
stage.addEventListener('keydown', (event) => {
  const actions = {
    ArrowLeft: () => orbit(state, -.08, 0),
    ArrowRight: () => orbit(state, .08, 0),
    ArrowUp: () => orbit(state, 0, -.08),
    ArrowDown: () => orbit(state, 0, .08),
    '+': () => zoom(state, 1.1),
    '=': () => zoom(state, 1.1),
    '-': () => zoom(state, .9),
    ' ': () => ({ ...state, playing: state.cautionsAccepted ? !state.playing : false })
  };
  if (!actions[event.key]) return;
  event.preventDefault();
  apply(actions[event.key]());
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('.claim-flag');
  if (!button) return;
  openFlagDialog({ path: button.dataset.claimPath, kind: button.dataset.claimKind, label: button.dataset.claimLabel });
});
$('#flag-form').addEventListener('submit', (event) => event.preventDefault());
for (const selector of ['#close-flag', '#cancel-flag']) $(selector).addEventListener('click', () => $('#flag-dialog').close());
$('#download-flag').addEventListener('click', () => {
  const report = reportFromForm();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([serializeReviewReport(report)], { type: 'application/json' }));
  link.download = `movement-review-flag-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  revealReport(report, 'JSON downloaded. The movement record was not changed.');
});
$('#copy-flag').addEventListener('click', async () => {
  const report = reportFromForm();
  await navigator.clipboard.writeText(serializeReviewReport(report));
  revealReport(report, 'JSON copied. The identifier and report were not retained.');
});
$('#email-flag').addEventListener('click', () => {
  const report = reportFromForm();
  location.href = reviewEmailUrl(report, reviewInbox);
  revealReport(report, 'Email draft opened for a deliberate handoff.');
});

populateRecord();
updateReadout();
await loadMusclesIfNeeded();
stage.dataset.ready = 'true';
$('.control-card').setAttribute('aria-busy', 'false');
if (interactive) requestAnimationFrame(animate);
