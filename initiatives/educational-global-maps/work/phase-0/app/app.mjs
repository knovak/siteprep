import fixture from '../fixtures/renderer-scene.json';
import temporalFixture from '../fixtures/temporal-scene.json';
import educationalFixture from '../fixtures/educational-scenes.json';
import QRCode from 'qrcode';
import {BrowserSessionLink} from './session-link.mjs';
import {
  buildRenderModel,
  changeDataset,
  changeProjection,
  layoutForWidth,
  recordAtPoint,
  renderCanvas,
  selectRecord,
  semanticSnapshot,
  setCamera,
  setReferenceRaster,
} from '../src/renderer.mjs';
import {
  buildTemporalFrame,
  renderTemporalOverlays,
  temporalSnapshot,
} from '../src/temporal.mjs';

const elements = Object.fromEntries([
  'dataset', 'projection', 'reference-raster', 'zoom-in', 'zoom-out', 'reset-view',
  'pause-inspection', 'refusal', 'revision', 'period', 'encoding', 'current-projection',
  'dataset-title', 'map-title', 'map-summary', 'selected-label', 'selected-value',
  'selected-detail', 'canvas-wrap', 'map', 'geography-caveat', 'legend', 'table-caption',
  'values', 'citations', 'cartogram-note', 'motion-status',
  'scene-time', 'temporal-layers', 'play-time', 'actual-periods', 'alignment-note',
  'scene-library', 'scene-title', 'scene-summary', 'scene-revision', 'scene-definition',
  'scene-caveat', 'scene-question', 'scene-stop', 'previous-stop', 'next-stop',
  'scene-share', 'upgrade-status', 'compare-upgrade', 'portable-status', 'prepare-bundle',
  'start-session', 'end-session', 'session-status', 'join-url', 'join-qr',
  'controller-app', 'controller-status', 'controller-time', 'controller-projection',
  'controller-layers', 'controller-feature', 'controller-pan-left', 'controller-pan-right',
  'controller-pan-up', 'controller-pan-down', 'controller-zoom-in', 'controller-zoom-out',
  'controller-previous-stop', 'controller-next-stop', 'controller-revision',
].map((id) => [id, document.getElementById(id)]));

const requestedProjection = new URL(window.location.href).searchParams.get('projection');
const initialProjection = fixture.datasets[0].projections.includes(requestedProjection)
  ? requestedProjection
  : fixture.scene.projection;
let model = buildRenderModel(fixture, {projection: initialProjection});
let temporalFrame = buildTemporalFrame(temporalFixture, {time: '2023-06', projection: initialProjection});
let inspectionPaused = true;
let animationTimer = null;
let temporalFinding = null;
const requestedSceneRevision = new URL(window.location.href).searchParams.get('sceneRevision');
let educationalScene = educationalFixture.scenes.find(({sceneId}) => requestedSceneRevision?.startsWith(`${sceneId}@`)) ?? educationalFixture.scenes[0];
let educationalRevision = Number.parseInt(requestedSceneRevision?.split('@').at(-1), 10) || 1;
let presentationStop = 0;
const sessionParameters = new URL(window.location.href).searchParams;
const controllerRole = sessionParameters.get('controller') === '1';
let sessionLink = null;
let sessionId = sessionParameters.get('session');
let sessionSecret = sessionParameters.get('secret');
let displaySessionRevision = 0;
let lastSessionState = '';
let controllerSnapshot = null;

for (const scene of educationalFixture.scenes) {
  const option = document.createElement('option');
  option.value = scene.sceneId;
  option.textContent = scene.title;
  elements['scene-library'].append(option);
}

for (const dataset of fixture.datasets) {
  const option = document.createElement('option');
  option.value = dataset.id;
  option.textContent = dataset.title;
  elements.dataset.append(option);
}

for (const period of temporalFixture.timeline) {
  const option = document.createElement('option');
  option.value = period;
  option.textContent = period;
  option.selected = period === temporalFrame.time;
  elements['scene-time'].append(option);
}

for (const layer of temporalFixture.layers) {
  const label = document.createElement('label');
  label.className = 'check-row temporal-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.value = layer.id;
  input.checked = layer.defaultActive === true;
  input.addEventListener('change', () => updateTemporal());
  const text = document.createElement('span');
  text.textContent = layer.title;
  label.append(input, text);
  elements['temporal-layers'].append(label);
}

function selectedTemporalLayers() {
  return [...elements['temporal-layers'].querySelectorAll('input:checked')].map(({value}) => value);
}

function temporalCandidate(options = {}) {
  return buildTemporalFrame(temporalFixture, {
    time: options.time ?? elements['scene-time'].value,
    projection: options.projection ?? model.projection,
    activeLayerIds: options.activeLayerIds ?? selectedTemporalLayers(),
  });
}

function updateTemporal(options = {}) {
  const candidate = temporalCandidate(options);
  if (candidate.status === 'refused') {
    temporalFinding = candidate.findings[0];
    for (const checkbox of elements['temporal-layers'].querySelectorAll('input')) checkbox.checked = temporalFrame.activeLayerIds.includes(checkbox.value);
    elements['scene-time'].value = temporalFrame.time;
  } else {
    temporalFrame = candidate;
    temporalFinding = null;
  }
  render();
  return candidate;
}

function formatValue(record) {
  if (record.status !== 'measured' || record.value === null) return 'Not available';
  if (model.dataset.unit === 'people') return new Intl.NumberFormat('en').format(record.value);
  return `${record.value} ${model.dataset.unit}`;
}

function renderSelected(snapshot) {
  const selected = snapshot.rows.find(({selected}) => selected) ?? snapshot.rows[0];
  elements['selected-label'].textContent = selected?.label ?? 'Nothing selected';
  elements['selected-value'].textContent = selected ? formatValue(selected) : '—';
  elements['selected-detail'].textContent = selected ? `${selected.status} · ${selected.uncertainty}` : '';
}

function renderSemantic(snapshot) {
  elements.legend.replaceChildren(...snapshot.legend.map((entry) => {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = entry.color;
    swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, entry.label);
    return item;
  }));
  elements['table-caption'].textContent = `${snapshot.dataset}, ${snapshot.period}; same values and classes as the Canvas view.`;
  elements.values.replaceChildren(...snapshot.rows.map((row) => {
    const tr = document.createElement('tr');
    tr.dataset.selected = String(row.selected);
    const place = document.createElement('td');
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.textContent = row.label;
    choose.disabled = !inspectionPaused;
    choose.addEventListener('click', () => {
      model = selectRecord(model, row.id);
      render();
    });
    place.append(choose);
    const value = document.createElement('td');
    value.textContent = formatValue(row);
    const status = document.createElement('td');
    status.textContent = row.status;
    const note = document.createElement('td');
    note.textContent = row.uncertainty;
    tr.append(place, value, status, note);
    return tr;
  }));
  elements.citations.replaceChildren(...snapshot.citations.map((citation) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = citation.url;
    link.textContent = citation.label;
    const detail = document.createTextNode(` — ${citation.revision}; ${citation.rights}`);
    item.append(link, detail);
    return item;
  }));
}

function renderTemporalFacts() {
  const snapshot = temporalSnapshot(temporalFrame);
  elements['actual-periods'].replaceChildren(...snapshot.layers.map((layer) => {
    const item = document.createElement('li');
    const transformation = layer.transformation ? ` · ${layer.transformation.method}` : '';
    item.textContent = `${layer.title}: ${layer.actualPeriod}${transformation}`;
    return item;
  }));
  elements['alignment-note'].textContent = `${snapshot.layers.length} active layers. Every label names the source period actually used; transformations remain inspectable.`;
}

function sceneRevisionId() {
  return `${educationalScene.sceneId}@${educationalRevision}`;
}

function renderEducationalScene() {
  const stops = educationalScene.presentationStops;
  const stop = stops[presentationStop];
  elements['scene-library'].value = educationalScene.sceneId;
  elements['scene-title'].textContent = educationalScene.title;
  elements['scene-summary'].textContent = educationalScene.summary;
  elements['scene-revision'].textContent = sceneRevisionId();
  elements['scene-definition'].textContent = educationalScene.definitions.join(' ');
  elements['scene-caveat'].textContent = educationalScene.caveats.join(' ');
  elements['scene-question'].textContent = educationalScene.discussionPrompts.join(' ');
  elements['scene-stop'].textContent = `${stop.order} of ${stops.length} · ${stop.title}`;
  elements['previous-stop'].disabled = presentationStop === 0;
  elements['next-stop'].disabled = presentationStop === stops.length - 1;
  const share = new URL(window.location.href);
  share.search = '';
  share.searchParams.set('sceneRevision', sceneRevisionId());
  elements['scene-share'].textContent = share.toString();
}

function render() {
  const width = Math.max(280, Math.round(elements['canvas-wrap'].getBoundingClientRect().width));
  const height = window.innerWidth <= 600 ? 384 : window.innerWidth >= 2400 ? 928 : 528;
  model = renderCanvas(elements.map, model, {width, height});
  renderTemporalOverlays(elements.map, model, temporalFrame);
  const snapshot = semanticSnapshot(model);
  document.body.dataset.layout = layoutForWidth(window.innerWidth).name;
  document.body.dataset.motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'standard';
  elements.dataset.value = model.datasetId;
  elements.projection.value = model.projection;
  elements['reference-raster'].checked = model.activeLayerIds.includes('layer:reference-raster');
  elements.revision.textContent = model.dataRevision;
  elements.revision.dataset.revision = model.dataRevision;
  elements.period.textContent = model.period;
  elements.encoding.textContent = model.encoding;
  elements['current-projection'].textContent = model.projectionLabel;
  elements['dataset-title'].textContent = model.dataset.title;
  elements['map-title'].textContent = model.title;
  elements['map-summary'].textContent = model.summary;
  elements['geography-caveat'].textContent = model.projection === 'population-cartogram'
    ? fixture.cartogram.caveat
    : fixture.geography.caveat;
  elements['cartogram-note'].hidden = model.projection !== 'population-cartogram';
  elements['cartogram-note'].textContent = `Cartogram geometry: ${fixture.cartogram.source}, ${fixture.cartogram.year}; ${fixture.cartogram.geometryVersion}.`;
  renderSelected(snapshot);
  renderSemantic(snapshot);
  renderTemporalFacts();
  renderEducationalScene();
  if (temporalFinding) {
    elements.refusal.hidden = false;
    elements.refusal.textContent = temporalFinding.message;
  } else if (model.status === 'refused') {
    elements.refusal.hidden = false;
    elements.refusal.textContent = model.findings[0].message;
  } else {
    elements.refusal.hidden = true;
    elements.refusal.textContent = '';
  }
  syncDisplaySession();
}

function displaySessionState() {
  return {
    period: temporalFrame.time,
    projection: model.projection,
    camera: structuredClone(model.camera),
    layers: [...temporalFrame.activeLayerIds],
    selectedFeature: model.selectedId ?? null,
    presentationStop,
  };
}

function displaySnapshot() {
  return {
    sessionId,
    baseSceneRevision: sceneRevisionId(),
    acceptedRevision: displaySessionRevision,
    scene: displaySessionState(),
  };
}

function syncDisplaySession() {
  if (!sessionLink || controllerRole) return;
  const state = JSON.stringify(displaySessionState());
  if (lastSessionState && state !== lastSessionState) displaySessionRevision += 1;
  if (state !== lastSessionState) {
    lastSessionState = state;
    sessionLink.publish(displaySnapshot());
    elements['session-status'].textContent = `Ready · revision ${displaySessionRevision}`;
  }
}

function controllerIntent(type, payload) {
  if (!sessionLink || !controllerSnapshot) return;
  const intentId = `intent:${crypto.randomUUID()}`;
  sessionLink.sendIntent({
    schema: 'educational-global-maps/intent/v1',
    id: `${intentId}-v1`,
    content: {intentId, sessionId, baseRevision: controllerSnapshot.acceptedRevision, type, payload},
  });
}

function renderController(snapshot) {
  controllerSnapshot = snapshot;
  elements['controller-revision'].textContent = `${snapshot.baseSceneRevision} · revision ${snapshot.acceptedRevision}`;
  elements['controller-time'].value = snapshot.scene.period;
  elements['controller-projection'].value = snapshot.scene.projection;
  elements['controller-feature'].value = snapshot.scene.selectedFeature ?? '';
  for (const checkbox of elements['controller-layers'].querySelectorAll('input')) {
    checkbox.checked = snapshot.scene.layers.includes(checkbox.value);
  }
}

function applyControllerIntent(message) {
  const intent = message.intent?.content;
  if (!intent || intent.sessionId !== sessionId) return;
  if (intent.baseRevision !== displaySessionRevision) {
    sessionLink.publish(displaySnapshot());
    return;
  }
  const payload = intent.payload;
  if (intent.type === 'set-time') {
    const candidate = updateTemporal({time: payload.period});
    if (candidate.status === 'accepted') elements['scene-time'].value = payload.period;
  } else if (intent.type === 'set-projection') {
    const candidate = temporalCandidate({projection: payload.projection});
    if (candidate.status === 'accepted') {
      model = changeProjection(model, payload.projection);
      temporalFrame = candidate;
      temporalFinding = null;
      render();
    }
  } else if (intent.type === 'set-layers') {
    for (const checkbox of elements['temporal-layers'].querySelectorAll('input')) checkbox.checked = payload.layers.includes(checkbox.value);
    updateTemporal({activeLayerIds: payload.layers});
  } else if (intent.type === 'set-camera') {
    model = setCamera(model, {center: payload.center, zoom: payload.zoom});
    render();
  } else if (intent.type === 'select-feature') {
    model = selectRecord(model, payload.featureId);
    render();
  } else if (intent.type === 'set-presentation-stop') {
    presentationStop = Math.min(educationalScene.presentationStops.length - 1, Math.max(0, payload.index));
    renderEducationalScene();
    syncDisplaySession();
  }
}

async function startDisplaySession() {
  sessionId = `session:${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  sessionSecret = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  const relayUrl = sessionParameters.get('relay');
  const join = new URL(window.location.href);
  join.search = '';
  join.searchParams.set('controller', '1');
  join.searchParams.set('session', sessionId);
  join.searchParams.set('secret', sessionSecret);
  if (relayUrl) join.searchParams.set('relay', relayUrl);
  displaySessionRevision = 0;
  lastSessionState = JSON.stringify(displaySessionState());
  sessionLink = new BrowserSessionLink({
    role: 'display', sessionId, secret: sessionSecret, relayUrl,
    onMessage: applyControllerIntent,
    onStatus: (status) => { elements['session-status'].textContent = status; },
  });
  sessionLink.connect(displaySnapshot());
  elements['join-url'].href = join;
  elements['join-url'].textContent = join.toString();
  elements['join-qr'].src = await QRCode.toDataURL(join.toString(), {width: 180, margin: 1, color: {dark: '#07111f', light: '#ffffff'}});
  elements['join-qr'].hidden = false;
  elements['start-session'].hidden = true;
  elements['end-session'].hidden = false;
}

function configureController() {
  document.querySelector('.masthead').hidden = true;
  document.querySelector('.workspace').hidden = true;
  elements['controller-app'].hidden = false;
  for (const period of temporalFixture.timeline) elements['controller-time'].append(new Option(period, period));
  for (const projection of ['equal-earth', 'airocean', 'population-cartogram']) elements['controller-projection'].append(new Option(projection, projection));
  for (const layer of temporalFixture.layers) {
    const label = document.createElement('label');
    label.className = 'check-row';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = layer.id;
    input.addEventListener('change', () => controllerIntent('set-layers', {layers: [...elements['controller-layers'].querySelectorAll('input:checked')].map(({value}) => value)}));
    label.append(input, document.createTextNode(layer.title));
    elements['controller-layers'].append(label);
  }
  for (const row of semanticSnapshot(model).rows) elements['controller-feature'].append(new Option(row.label, row.id));
  const relayUrl = sessionParameters.get('relay');
  sessionLink = new BrowserSessionLink({
    role: 'controller', sessionId, secret: sessionSecret, relayUrl,
    onMessage: (message) => { if (message.snapshot) renderController(message.snapshot); },
    onStatus: (status) => { elements['controller-status'].textContent = status; },
  });
  sessionLink.connect();
}

function activateEducationalScene(scene, revision = 1) {
  educationalScene = scene;
  educationalRevision = revision;
  presentationStop = 0;
  elements['upgrade-status'].textContent = 'Pinned to the saved dataset revisions.';
  elements['portable-status'].textContent = '';
  model = changeDataset(model, scene.app.datasetId);
  for (const checkbox of elements['temporal-layers'].querySelectorAll('input')) checkbox.checked = scene.app.layerIds.includes(checkbox.value);
  const candidate = temporalCandidate({time: scene.app.time, activeLayerIds: scene.app.layerIds});
  if (candidate.status === 'accepted') temporalFrame = candidate;
  elements['scene-time'].value = temporalFrame.time;
  render();
}

elements['scene-library'].addEventListener('change', () => {
  activateEducationalScene(educationalFixture.scenes.find(({sceneId}) => sceneId === elements['scene-library'].value));
});

elements['previous-stop'].addEventListener('click', () => {
  presentationStop = Math.max(0, presentationStop - 1);
  renderEducationalScene();
});

elements['next-stop'].addEventListener('click', () => {
  presentationStop = Math.min(educationalScene.presentationStops.length - 1, presentationStop + 1);
  renderEducationalScene();
});

elements['compare-upgrade'].addEventListener('click', () => {
  const population = educationalScene.layers.find(({layerId}) => layerId === 'layer:population-field');
  if (!population || population.datasetRevision.endsWith('@2024')) {
    elements['upgrade-status'].textContent = 'This scene already uses the latest prepared population revision.';
    return;
  }
  educationalScene = structuredClone(educationalScene);
  const upgradedPopulation = educationalScene.layers.find(({layerId}) => layerId === 'layer:population-field');
  upgradedPopulation.datasetRevision = 'dataset:population@2024';
  upgradedPopulation.period = '2024';
  educationalRevision += 1;
  elements['upgrade-status'].textContent = 'Upgrade accepted as a new scene revision: dataset 2023 → 2024, geography v1 → v2, transformation v1 → v2.';
  renderEducationalScene();
});

elements['prepare-bundle'].addEventListener('click', () => {
  const restricted = educationalScene.layers.some(({layerId}) => layerId === 'layer:learner-movement');
  elements['portable-status'].textContent = restricted
    ? 'Bundle ready: permitted population bytes embedded. Learner movement remains a reference; classroom token required and live data is not redistributed.'
    : 'Bundle ready: all selected permitted assets embedded for offline single-device use.';
});

elements.dataset.addEventListener('change', () => {
  model = changeDataset(model, elements.dataset.value);
  render();
});

elements.projection.addEventListener('change', () => {
  const requested = elements.projection.value;
  const candidate = temporalCandidate({projection: requested});
  if (candidate.status === 'refused') {
    temporalFinding = candidate.findings[0];
    elements.projection.value = model.projection;
    render();
    return;
  }
  const changed = changeProjection(model, requested);
  model = changed;
  if (changed.status === 'accepted') {
    temporalFrame = candidate;
    temporalFinding = null;
  }
  render();
});

elements['scene-time'].addEventListener('change', () => updateTemporal({time: elements['scene-time'].value}));

function stopAnimation() {
  if (animationTimer) window.clearInterval(animationTimer);
  animationTimer = null;
  elements['play-time'].textContent = 'Play time';
  elements['play-time'].setAttribute('aria-pressed', 'false');
}

elements['play-time'].addEventListener('click', () => {
  if (animationTimer) {
    stopAnimation();
    return;
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    temporalFinding = {message: 'Automatic time animation is disabled by the reduced-motion preference; choose a time directly.'};
    render();
    return;
  }
  elements['play-time'].textContent = 'Pause time';
  elements['play-time'].setAttribute('aria-pressed', 'true');
  animationTimer = window.setInterval(() => {
    const index = temporalFixture.timeline.indexOf(temporalFrame.time);
    const next = temporalFixture.timeline[(index + 1) % temporalFixture.timeline.length];
    const candidate = updateTemporal({time: next});
    if (candidate.status === 'accepted') elements['scene-time'].value = next;
    else stopAnimation();
  }, 1200);
});

elements['reference-raster'].addEventListener('change', () => {
  model = setReferenceRaster(model, elements['reference-raster'].checked);
  render();
});

elements['zoom-in'].addEventListener('click', () => {
  model = setCamera(model, {...model.camera, zoom: Math.min(2.5, model.camera.zoom * 1.2)});
  render();
});

elements['zoom-out'].addEventListener('click', () => {
  model = setCamera(model, {...model.camera, zoom: Math.max(.65, model.camera.zoom / 1.2)});
  render();
});

elements['reset-view'].addEventListener('click', () => {
  model = setCamera(model, structuredClone(fixture.scene.camera));
  render();
});

elements['pause-inspection'].addEventListener('click', () => {
  inspectionPaused = !inspectionPaused;
  elements['pause-inspection'].setAttribute('aria-pressed', String(inspectionPaused));
  elements['pause-inspection'].textContent = inspectionPaused ? 'Inspection paused · values enabled' : 'Pause to inspect exact values';
  elements['motion-status'].textContent = inspectionPaused ? 'Paused' : 'Exploring';
  render();
});

elements.map.addEventListener('click', (event) => {
  if (!inspectionPaused) return;
  const rect = elements.map.getBoundingClientRect();
  const record = recordAtPoint(model, event.clientX - rect.left, event.clientY - rect.top);
  if (record) {
    model = selectRecord(model, record.id);
    render();
  }
});

window.addEventListener('resize', render);
elements['start-session'].addEventListener('click', startDisplaySession);
elements['end-session'].addEventListener('click', () => {
  sessionLink?.end();
  sessionLink = null;
  elements['session-status'].textContent = 'Ended · display remains usable';
  elements['end-session'].hidden = true;
  elements['start-session'].hidden = false;
});
elements['controller-time'].addEventListener('change', () => controllerIntent('set-time', {period: elements['controller-time'].value}));
elements['controller-projection'].addEventListener('change', () => controllerIntent('set-projection', {projection: elements['controller-projection'].value}));
elements['controller-feature'].addEventListener('change', () => controllerIntent('select-feature', {featureId: elements['controller-feature'].value || null}));
for (const [id, longitude, latitude] of [
  ['controller-pan-left', -10, 0], ['controller-pan-right', 10, 0],
  ['controller-pan-up', 0, 8], ['controller-pan-down', 0, -8],
]) {
  elements[id].addEventListener('click', () => {
    const camera = controllerSnapshot.scene.camera;
    controllerIntent('set-camera', {center: [camera.center[0] + longitude, camera.center[1] + latitude], zoom: camera.zoom});
  });
}
elements['controller-zoom-in'].addEventListener('click', () => {
  const camera = controllerSnapshot.scene.camera;
  controllerIntent('set-camera', {center: camera.center, zoom: Math.min(2.5, camera.zoom * 1.2)});
});
elements['controller-zoom-out'].addEventListener('click', () => {
  const camera = controllerSnapshot.scene.camera;
  controllerIntent('set-camera', {center: camera.center, zoom: Math.max(.65, camera.zoom / 1.2)});
});
elements['controller-previous-stop'].addEventListener('click', () => controllerIntent('set-presentation-stop', {index: Math.max(0, controllerSnapshot.scene.presentationStop - 1)}));
elements['controller-next-stop'].addEventListener('click', () => controllerIntent('set-presentation-stop', {index: controllerSnapshot.scene.presentationStop + 1}));
elements['upgrade-status'].textContent = 'Pinned to the saved dataset revisions.';
render();
if (controllerRole) configureController();
