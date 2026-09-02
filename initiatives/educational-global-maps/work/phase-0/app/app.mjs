import fixture from '../fixtures/renderer-scene.json';
import temporalFixture from '../fixtures/temporal-scene.json';
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
}

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
render();
