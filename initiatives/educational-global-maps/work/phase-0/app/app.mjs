import fixture from '../fixtures/renderer-scene.json';
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

const elements = Object.fromEntries([
  'dataset', 'projection', 'reference-raster', 'zoom-in', 'zoom-out', 'reset-view',
  'pause-inspection', 'refusal', 'revision', 'period', 'encoding', 'current-projection',
  'dataset-title', 'map-title', 'map-summary', 'selected-label', 'selected-value',
  'selected-detail', 'canvas-wrap', 'map', 'geography-caveat', 'legend', 'table-caption',
  'values', 'citations', 'cartogram-note', 'motion-status',
].map((id) => [id, document.getElementById(id)]));

const requestedProjection = new URL(window.location.href).searchParams.get('projection');
const initialProjection = fixture.datasets[0].projections.includes(requestedProjection)
  ? requestedProjection
  : fixture.scene.projection;
let model = buildRenderModel(fixture, {projection: initialProjection});
let inspectionPaused = true;

for (const dataset of fixture.datasets) {
  const option = document.createElement('option');
  option.value = dataset.id;
  option.textContent = dataset.title;
  elements.dataset.append(option);
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

function render() {
  const width = Math.max(280, Math.round(elements['canvas-wrap'].getBoundingClientRect().width));
  const height = window.innerWidth <= 600 ? 384 : window.innerWidth >= 2400 ? 928 : 528;
  model = renderCanvas(elements.map, model, {width, height});
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
  if (model.status === 'refused') {
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
  const changed = changeProjection(model, elements.projection.value);
  model = changed;
  render();
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
