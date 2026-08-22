import { globalMatrices, muscleWorldPaths, transformPoint } from '../phase-0/scripts/rig-math.mjs';
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
} from './src/viewer-state.mjs';

const $ = (selector) => document.querySelector(selector);
const stage = $('#stage');
const canvas = $('#model-canvas');
const context = canvas.getContext('2d');
let state = createViewerState();
let rig;
let movement;
let muscles;
let muscleRequest;
let lastFrameTime = 0;
let dragPoint;

const [coreResponse, movementResponse] = await Promise.all([
  fetch('./data/rig-core.json'),
  fetch('./data/movement.json')
]);
if (!coreResponse.ok || !movementResponse.ok) throw new Error('The packaged vertical-slice data could not be loaded.');
rig = await coreResponse.json();
movement = await movementResponse.json();

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
  for (const element of document.querySelectorAll('.control-card button, .control-card input, .control-card select')) element.disabled = true;
}

function interpolateFrame(time) {
  const frames = rig.clip.frames;
  let before = frames[0];
  let after = frames.at(-1);
  for (let index = 1; index < frames.length; index += 1) {
    if (time <= frames[index].t) {
      before = frames[index - 1];
      after = frames[index];
      break;
    }
  }
  const span = Math.max(after.t - before.t, Number.EPSILON);
  const amount = Math.max(0, Math.min(1, (time - before.t) / span));
  const rotations = {};
  for (const node of rig.nodes) {
    const a = before.rotations_deg[node.id] || [0, 0, 0];
    const b = after.rotations_deg[node.id] || [0, 0, 0];
    rotations[node.id] = a.map((value, index) => value + ((b[index] || 0) - value) * amount);
  }
  return { id: `${before.id}-${after.id}`, rotations_deg: rotations };
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

function project(point) {
  const [x, y, z] = point;
  const cosineYaw = Math.cos(state.camera.yaw);
  const sineYaw = Math.sin(state.camera.yaw);
  const horizontal = x * cosineYaw + z * sineYaw;
  const depth = -x * sineYaw + z * cosineYaw;
  const cosinePitch = Math.cos(state.camera.pitch);
  const sinePitch = Math.sin(state.camera.pitch);
  const vertical = y * cosinePitch - depth * sinePitch;
  const scale = Math.min(canvas.width / 1050, canvas.height / 1200) * state.camera.zoom;
  return [canvas.width / 2 + horizontal * scale, canvas.height * .55 - (vertical - 975) * scale, depth];
}

function visibleAround(nodeId) {
  if (state.isolatedJoint === 'none') return true;
  const accepted = new Set([state.isolatedJoint]);
  let current = rig.nodes.find((node) => node.id === nodeId);
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
    surface: [0, 1].includes(state.layer) || state.pinned === 'surface',
    skeleton: [1, 4, 5].includes(state.layer) || state.pinned === 'skeleton',
    superficial: [2, 4].includes(state.layer) || state.pinned === 'muscles',
    deep: [3, 4].includes(state.layer) || state.pinned === 'muscles'
  };
}

function drawSurface(matrices, alpha) {
  for (const shell of rig.layers.surface) {
    if (!visibleAround(shell.from) && !visibleAround(shell.to)) continue;
    const start = transformPoint(matrices.get(shell.from), [0, 0, 0]);
    const end = transformPoint(matrices.get(shell.to), [0, 0, 0]);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    line(start, end, { color: '#b7d8cc', alpha, width: Math.max(26, shell.radius_mm * .82 * ratio * state.camera.zoom) });
  }
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const leftShoulder = transformPoint(matrices.get('scapula-left'), [0, 0, 0]);
  const rightShoulder = transformPoint(matrices.get('scapula-right'), [0, 0, 0]);
  const neck = transformPoint(matrices.get('neck-base'), [0, 0, 0]);
  const lowerTorso = transformPoint(matrices.get('lumbar-spine'), [0, 0, 0]);
  line(leftShoulder, rightShoulder, { color: '#b7d8cc', alpha, width: 54 * ratio * state.camera.zoom });
  point(neck, 44 * ratio * state.camera.zoom, '#b7d8cc', alpha);
  point(lowerTorso, 49 * ratio * state.camera.zoom, '#b7d8cc', alpha);
}

function drawSkeleton(matrices) {
  for (const node of rig.nodes) {
    if (!node.parent || node.id === 'root' || !visibleAround(node.id)) continue;
    const start = transformPoint(matrices.get(node.parent), [0, 0, 0]);
    const end = transformPoint(matrices.get(node.id), [0, 0, 0]);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    line(start, end, { color: '#f2e9d3', width: 5 * ratio * state.camera.zoom });
    point(end, 6 * ratio * state.camera.zoom, '#fff7e5');
  }
}

function drawMuscles(frame, kinds) {
  if (!muscles) return;
  const fullRig = { ...rig, layers: { ...rig.layers, muscles: muscles.layers.muscles }, attachments: muscles.attachments };
  const paths = muscleWorldPaths(fullRig, frame);
  const ids = kinds.flatMap((kind) => kind === 'superficial'
    ? muscles.layers.muscles.slice(0, 8).map((entry) => entry.id)
    : muscles.layers.muscles.slice(8).map((entry) => entry.id));
  for (const id of ids) {
    const path = paths.get(id);
    if (!path || path.length < 2) continue;
    const attachmentNodes = muscles.attachments.filter((entry) => entry.muscle_id === id).map((entry) => entry.bone_id);
    if (!attachmentNodes.some(visibleAround)) continue;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    line(path[0].point, path.at(-1).point, { color: kinds.includes('deep') && id.includes('spinae') ? '#8ab8ff' : '#ff816f', width: 9 * ratio * state.camera.zoom, alpha: .92 });
  }
}

function render() {
  if (!interactive) return;
  resizeCanvas();
  context.clearRect(0, 0, canvas.width, canvas.height);
  const frame = interpolateFrame(state.time);
  const matrices = globalMatrices(rig, frame);
  const shown = visibility();
  if (shown.surface) drawSurface(matrices, state.layer === 1 ? .22 : .52);
  const muscleKinds = [];
  if (shown.superficial) muscleKinds.push('superficial');
  if (shown.deep) muscleKinds.push('deep');
  drawMuscles(frame, muscleKinds);
  if (shown.skeleton) drawSkeleton(matrices);
}

function activePhase() {
  return movement.phases.find((phase) => state.time >= phase.t[0] && state.time <= phase.t[1]) || movement.phases.at(-1);
}

function updateReadout() {
  const phase = activePhase();
  const cue = movement.instruction.attention.find((entry) => entry.phase === phase.id);
  $('#time-output').value = `${Math.round(state.time * 100)}%`;
  $('#timeline').value = Math.round(state.time * 1000);
  $('#phase-name').textContent = phase.id;
  $('#phase-cue').textContent = cue?.cue || movement.instruction.exploration;
  $('#layer-output').value = LAYER_STATES[state.layer];
  $('#reference-label').hidden = !anatomyIsVisible(state);
  $('#play').textContent = state.playing ? 'Pause' : 'Play';
  $('#view-label').textContent = `${Math.round((state.camera.yaw * 180) / Math.PI)}° orbit · ${state.camera.zoom.toFixed(1)}×`;
  $('#claims-list').replaceChildren(...[
    ...phase.joint_actions.map((claim) => `${claim.joint}: ${claim.action}`),
    ...phase.muscles.map((claim) => `${claim.id}: ${claim.behaviour}`)
  ].map((text) => Object.assign(document.createElement('li'), { textContent: text })));
  Object.assign(stage.dataset, {
    time: state.time.toFixed(4),
    camera: `${state.camera.yaw.toFixed(4)},${state.camera.pitch.toFixed(4)},${state.camera.zoom.toFixed(4)}`,
    layer: String(state.layer),
    pinned: state.pinned,
    isolatedJoint: state.isolatedJoint,
    musclesLoaded: String(Boolean(muscles))
  });
  render();
}

async function loadMusclesIfNeeded() {
  if (!musclesAreRequested(state) || muscles) return;
  if (!muscleRequest) {
    $('#muscle-loading').hidden = false;
    muscleRequest = Promise.all([
      fetch('./data/muscles.json'),
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
  $('#movement-title').textContent = movement.title;
  $('#movement-summary').textContent = movement.summary;
  $('#attention-copy').textContent = movement.instruction.exploration;
  $('#range-copy').textContent = movement.instruction.range.smaller_reference;
  $('#authored-by').textContent = movement.source.authored_by;
  $('#authored-on').textContent = movement.source.authored_on;
  $('#review-status').textContent = `${movement.source.review.status}: ${movement.source.review.notes}`;
  $('#rights-basis').textContent = movement.source.rights_basis;
  $('#source-basis').textContent = movement.source.tradition_basis;
  $('#caution-list').replaceChildren(...movement.safety.cautions.map((text) => Object.assign(document.createElement('li'), { textContent: text })));
}

function animate(timestamp) {
  if (state.playing) {
    const elapsed = lastFrameTime ? timestamp - lastFrameTime : 0;
    const nextTime = state.time + elapsed / 8000;
    state = nextTime >= 1 ? { ...setTime(state, 1), playing: false } : setTime(state, nextTime);
    updateReadout();
  }
  lastFrameTime = timestamp;
  requestAnimationFrame(animate);
}

$('#accept-cautions').addEventListener('click', () => {
  state = { ...state, cautionsAccepted: true };
  $('#play').disabled = false;
  $('#caution-panel').classList.add('accepted');
  $('#accept-cautions').textContent = 'Playback enabled';
  $('#accept-cautions').disabled = true;
});
$('#play').addEventListener('click', () => apply({ ...state, playing: !state.playing }));
$('#replay').addEventListener('click', () => apply({ ...setTime(state, 0), playing: state.cautionsAccepted }));
$('#step-back').addEventListener('click', () => apply({ ...setTime(state, state.time - .025), playing: false }));
$('#step-forward').addEventListener('click', () => apply({ ...setTime(state, state.time + .025), playing: false }));
$('#timeline').addEventListener('input', (event) => apply({ ...setTime(state, Number(event.target.value) / 1000), playing: false }));
$('#layer').addEventListener('input', (event) => apply(setLayer(state, Number(event.target.value))));
$('#pin-layer').addEventListener('change', (event) => apply(setPinned(state, event.target.value)));
$('#isolate-joint').addEventListener('change', (event) => apply(setIsolatedJoint(state, event.target.value)));
for (const button of document.querySelectorAll('[data-camera]')) button.addEventListener('click', () => apply(cameraPreset(state, button.dataset.camera)));

stage.addEventListener('pointerdown', (event) => {
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

$('#flag-record').addEventListener('click', () => $('#flag-dialog').showModal());
$('#flag-form').addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'default') return;
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const report = {
    movement_id: movement.id,
    phase_id: activePhase().id,
    animation_time: state.time,
    kind: fields.get('kind'),
    severity: fields.get('severity'),
    note: fields.get('note'),
    created_at: new Date().toISOString(),
    record_changed: false
  };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' }));
  link.download = `movement-review-flag-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  $('#flag-dialog').close();
});

populateRecord();
updateReadout();
if (interactive) requestAnimationFrame(animate);
