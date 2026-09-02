import {geoEqualEarth, geoGraticule10, geoPath} from 'd3-geo';
import {geoAirocean} from 'd3-geo-polygon';

const PROJECTION_LABELS = Object.freeze({
  'equal-earth': 'Equal Earth',
  airocean: 'Airocean',
  'population-cartogram': 'Fixed population cartogram',
});

function copy(value) {
  return structuredClone(value);
}

function datasetFor(fixture, datasetId) {
  const dataset = fixture.datasets.find(({id}) => id === datasetId);
  if (!dataset) throw new Error(`Unknown dataset ${datasetId}`);
  return dataset;
}

function layerForDataset(fixture, datasetId) {
  const layer = fixture.layers.find((candidate) => candidate.datasetId === datasetId);
  if (!layer) throw new Error(`No layer for ${datasetId}`);
  return layer;
}

function layerById(fixture, layerId) {
  const layer = fixture.layers.find(({id}) => id === layerId);
  if (!layer) throw new Error(`Unknown layer ${layerId}`);
  return layer;
}

function citationSet(fixture, ids) {
  return fixture.scene.citations.filter(({id}) => ids.includes(id)).map(copy);
}

export function projectionLabel(id) {
  return PROJECTION_LABELS[id] ?? id;
}

export function legendEntry(dataset, value, status) {
  if (status !== 'measured' || value === null || value === undefined) {
    return dataset.legend.find((entry) => entry.status === status)
      ?? dataset.legend.find((entry) => entry.id === 'missing')
      ?? dataset.legend.at(-1);
  }
  return dataset.legend.find((entry) => entry.status === undefined
    && value >= entry.min
    && (entry.max === null || value < entry.max)) ?? dataset.legend[0];
}

function recordsFor(fixture, dataset) {
  if (dataset.profile === 'points-events') return fixture.points.map(copy);
  return fixture.geography.features.map((feature) => ({
    id: feature.id,
    label: feature.properties.label,
    value: feature.properties.value,
    status: feature.properties.status,
    uncertainty: feature.properties.uncertainty,
    geometry: copy(feature.geometry),
  }));
}

function finding(layer, projection) {
  return {
    code: 'renderer.projection.refused',
    severity: 'error',
    layerId: layer.id,
    projection,
    message: `${layer.title ?? layer.id} supports ${layer.projections.map(projectionLabel).join(', ')}; ${projectionLabel(projection)} was not applied.`,
  };
}

function compatibleLayers(fixture, activeLayerIds, projection) {
  const layers = activeLayerIds.map((id) => layerById(fixture, id));
  const refused = layers.find((layer) => !layer.projections.includes(projection));
  return refused ? {compatible: false, finding: finding(refused, projection)} : {compatible: true, layers};
}

export function buildRenderModel(fixture, options = {}) {
  const datasetId = options.datasetId ?? fixture.datasets[0].id;
  const dataset = datasetFor(fixture, datasetId);
  const primaryLayer = layerForDataset(fixture, datasetId);
  const activeLayerIds = options.activeLayerIds ?? [primaryLayer.id];
  const projection = options.projection ?? fixture.scene.projection;
  const compatibility = compatibleLayers(fixture, activeLayerIds, projection);
  if (!compatibility.compatible) {
    throw Object.assign(new Error(compatibility.finding.message), {finding: compatibility.finding});
  }
  const records = recordsFor(fixture, dataset).map((record) => ({
    ...record,
    legend: copy(legendEntry(dataset, record.value, record.status)),
  }));
  const selectedId = records.some(({id}) => id === options.selectedId)
    ? options.selectedId
    : records[0]?.id ?? null;
  return {
    status: 'accepted',
    fixture,
    sceneId: fixture.scene.id,
    title: fixture.scene.title,
    summary: fixture.scene.summary,
    dataset: copy(dataset),
    datasetId,
    dataRevision: dataset.revision,
    encoding: dataset.encoding,
    period: dataset.period,
    projection,
    projectionLabel: projectionLabel(projection),
    camera: copy(options.camera ?? fixture.scene.camera),
    selectedId,
    activeLayerIds: [...activeLayerIds],
    records,
    legend: dataset.legend.map(copy),
    citations: citationSet(fixture, dataset.citationIds),
    findings: [],
    hitTargets: [],
  };
}

export function changeProjection(model, projection) {
  const compatibility = compatibleLayers(model.fixture, model.activeLayerIds, projection);
  if (!compatibility.compatible) {
    return {...model, status: 'refused', requestedProjection: projection, findings: [compatibility.finding]};
  }
  return buildRenderModel(model.fixture, {
    datasetId: model.datasetId,
    projection,
    camera: model.camera,
    selectedId: model.selectedId,
    activeLayerIds: model.activeLayerIds,
  });
}

export function changeDataset(model, datasetId) {
  const dataset = datasetFor(model.fixture, datasetId);
  const projection = dataset.projections.includes(model.projection) ? model.projection : 'equal-earth';
  return buildRenderModel(model.fixture, {datasetId, projection, camera: model.camera});
}

export function setReferenceRaster(model, enabled) {
  const primary = layerForDataset(model.fixture, model.datasetId).id;
  const activeLayerIds = enabled ? [primary, 'layer:reference-raster'] : [primary];
  const compatibility = compatibleLayers(model.fixture, activeLayerIds, model.projection);
  if (!compatibility.compatible) {
    return {...model, status: 'refused', findings: [compatibility.finding]};
  }
  return buildRenderModel(model.fixture, {
    datasetId: model.datasetId,
    projection: model.projection,
    camera: model.camera,
    selectedId: model.selectedId,
    activeLayerIds,
  });
}

export function setCamera(model, camera) {
  return buildRenderModel(model.fixture, {
    datasetId: model.datasetId,
    projection: model.projection,
    camera,
    selectedId: model.selectedId,
    activeLayerIds: model.activeLayerIds,
  });
}

export function selectRecord(model, selectedId) {
  if (!model.records.some(({id}) => id === selectedId)) return model;
  return {...model, status: 'accepted', selectedId, findings: []};
}

export function semanticSnapshot(model) {
  return {
    title: model.title,
    summary: model.summary,
    dataset: model.dataset.title,
    revision: model.dataRevision,
    encoding: model.encoding,
    period: model.period,
    projection: model.projectionLabel,
    legend: model.legend.map(({id, label, color}) => ({id, label, color})),
    rows: model.records.map(({id, label, value, status, uncertainty, legend}) => ({
      id,
      label,
      value,
      status,
      uncertainty,
      legendClass: legend.id,
      selected: id === model.selectedId,
    })),
    citations: model.citations.map(({label, url, rights, revision}) => ({label, url, rights, revision})),
  };
}

export function layoutForWidth(width) {
  if (width >= 2400) return {name: 'display-4k', controls: 'compact-rail', columns: 2};
  if (width <= 600) return {name: 'phone', controls: 'stacked', columns: 1};
  return {name: 'laptop', controls: 'side-panel', columns: 2};
}

export function projectionFor(id, width, height, camera = {center: [0, 0], zoom: 1, pan: [0, 0]}) {
  if (id === 'population-cartogram') return null;
  const projection = id === 'airocean' ? geoAirocean() : geoEqualEarth();
  projection.fitExtent([[24, 24], [width - 24, height - 24]], {type: 'Sphere'});
  const [baseX, baseY] = projection.translate();
  const [panX, panY] = camera.pan ?? [0, 0];
  projection
    .center(camera.center ?? [0, 0])
    .scale(projection.scale() * (camera.zoom ?? 1))
    .translate([baseX + panX, baseY + panY]);
  return projection;
}

function resetCanvas(canvas, width, height) {
  const ratio = Math.max(1, Math.min(globalThis.devicePixelRatio ?? 1, 2));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return context;
}

function drawRaster(context, width, height) {
  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = '#5cc8ff';
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += Math.max(30, width / 18)) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += Math.max(30, height / 10)) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function drawCartogram(context, model, width, height) {
  const records = new Map(model.records.map((record) => [record.id, record]));
  const hits = [];
  context.fillStyle = '#111a32';
  context.fillRect(0, 0, width, height);
  for (const cell of model.fixture.cartogram.cells) {
    const record = records.get(cell.id);
    if (!record) continue;
    const x = cell.x * width;
    const y = cell.y * height;
    const w = cell.width * width;
    const h = cell.height * height;
    context.fillStyle = record.legend.color;
    context.strokeStyle = record.id === model.selectedId ? '#ffffff' : '#0b1020';
    context.lineWidth = record.id === model.selectedId ? 4 : 2;
    context.fillRect(x, y, w, h);
    context.strokeRect(x, y, w, h);
    context.fillStyle = '#ffffff';
    context.font = `${Math.max(12, Math.min(18, w / 7))}px system-ui`;
    context.fillText(record.label, x + 8, y + 22, Math.max(20, w - 16));
    hits.push({id: record.id, x, y, width: w, height: h});
  }
  return hits;
}

function drawProjected(context, model, width, height) {
  const projection = projectionFor(model.projection, width, height, model.camera);
  const path = geoPath(projection, context);
  const hits = [];
  context.fillStyle = '#111a32';
  context.fillRect(0, 0, width, height);
  context.beginPath();
  path({type: 'Sphere'});
  context.fillStyle = '#0b2743';
  context.fill();
  context.strokeStyle = '#3c5a78';
  context.lineWidth = 1.2;
  context.stroke();
  context.beginPath();
  path(geoGraticule10());
  context.strokeStyle = 'rgba(197, 222, 255, .16)';
  context.lineWidth = 0.7;
  context.stroke();
  if (model.activeLayerIds.includes('layer:reference-raster')) drawRaster(context, width, height);

  if (model.dataset.profile === 'points-events') {
    for (const record of model.records) {
      const point = projection(record.coordinates);
      if (!point) continue;
      const [x, y] = point;
      context.beginPath();
      context.arc(x, y, record.id === model.selectedId ? 10 : 7, 0, Math.PI * 2);
      context.fillStyle = record.legend.color;
      context.fill();
      context.strokeStyle = record.id === model.selectedId ? '#ffffff' : '#0b1020';
      context.lineWidth = record.id === model.selectedId ? 3 : 2;
      context.stroke();
      hits.push({id: record.id, x: x - 13, y: y - 13, width: 26, height: 26});
    }
    return hits;
  }

  for (const record of model.records) {
    const feature = {type: 'Feature', id: record.id, properties: {label: record.label}, geometry: record.geometry};
    context.beginPath();
    path(feature);
    context.fillStyle = record.legend.color;
    context.fill();
    context.strokeStyle = record.id === model.selectedId ? '#ffffff' : '#091323';
    context.lineWidth = record.id === model.selectedId ? 3 : 1.5;
    context.stroke();
    const [[x0, y0], [x1, y1]] = path.bounds(feature);
    if (Number.isFinite(x0 + y0 + x1 + y1)) hits.push({id: record.id, x: x0, y: y0, width: x1 - x0, height: y1 - y0});
  }
  return hits;
}

export function renderCanvas(canvas, model, {width, height}) {
  const context = resetCanvas(canvas, width, height);
  const hitTargets = model.projection === 'population-cartogram'
    ? drawCartogram(context, model, width, height)
    : drawProjected(context, model, width, height);
  canvas.dataset.rendered = 'true';
  return {...model, hitTargets};
}

export function recordAtPoint(model, x, y) {
  const hit = [...model.hitTargets].reverse().find((target) => x >= target.x
    && x <= target.x + target.width
    && y >= target.y
    && y <= target.y + target.height);
  return hit ? model.records.find(({id}) => id === hit.id) ?? null : null;
}
