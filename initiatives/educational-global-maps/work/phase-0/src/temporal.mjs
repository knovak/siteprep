import {geoCentroid} from 'd3-geo';
import {projectionFor} from './renderer.mjs';

const DAY = 86_400_000;
const STATE_ENCODINGS = Object.freeze({
  measured: {label: 'Measured', pattern: 'solid'},
  missing: {label: 'Missing', pattern: 'blank'},
  zero: {label: 'Reported zero', pattern: 'zero-ring'},
  unavailable: {label: 'Unavailable', pattern: 'diagonal'},
  suppressed: {label: 'Suppressed', pattern: 'crosshatch'},
  'outside-range': {label: 'Outside coverage', pattern: 'outline'},
  filtered: {label: 'Filtered', pattern: 'faded'},
  interpolated: {label: 'Interpolated', pattern: 'dotted'},
  modeled: {label: 'Modelled', pattern: 'dashed'},
});

function copy(value) {
  return structuredClone(value);
}

function dateForPeriod(period) {
  if (/^\d{4}$/u.test(period)) return new Date(`${period}-07-01T00:00:00.000Z`);
  if (/^\d{4}-\d{2}$/u.test(period)) return new Date(`${period}-15T00:00:00.000Z`);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(period)) return new Date(`${period}T00:00:00.000Z`);
  throw new TypeError(`Unsupported period ${period}`);
}

function distanceDays(left, right) {
  return Math.abs(dateForPeriod(left) - dateForPeriod(right)) / DAY;
}

function finding(code, layer, time, message) {
  return {code, severity: 'error', layerId: layer.id, time, message};
}

function interpolateRecords(before, after, ratio) {
  const later = new Map(after.records.map((record) => [record.id, record]));
  return before.records.map((record) => {
    const next = later.get(record.id);
    if (!next || record.status !== 'measured' || next.status !== 'measured') {
      return {...copy(record), value: null, status: next?.status ?? record.status ?? 'unavailable'};
    }
    return {
      ...copy(record),
      value: record.value + ((next.value - record.value) * ratio),
      status: 'interpolated',
      uncertainty: `Linear interpolation between ${before.period} and ${after.period}`,
    };
  });
}

function aggregateRecords(observations, reducer) {
  const ids = [...new Set(observations.flatMap(({records}) => records.map(({id}) => id)))];
  return ids.map((id) => {
    const inputs = observations.map(({records}) => records.find((record) => record.id === id)).filter(Boolean);
    if (!inputs.length || inputs.some(({status}) => status !== 'measured')) {
      return {id, value: null, status: inputs.find(({status}) => status !== 'measured')?.status ?? 'unavailable'};
    }
    const total = inputs.reduce((sum, {value}) => sum + value, 0);
    return {...copy(inputs[0]), value: reducer === 'mean' ? total / inputs.length : total, status: 'modeled'};
  });
}

export function alignLayer(layer, time) {
  if (layer.kind === 'points') {
    const records = layer.records.map((record) => {
      const inside = dateForPeriod(record.start) <= dateForPeriod(time)
        && dateForPeriod(record.end) >= dateForPeriod(time);
      return inside ? copy(record) : {...copy(record), status: 'outside-range'};
    });
    return {status: 'accepted', actualPeriod: time, records, transformation: {method: 'coverage-filter', inputs: [time], parameters: {inclusive: true}, outputStatus: 'measured', revision: layer.revision}};
  }

  const exact = layer.observations.find(({period}) => period === time);
  if (exact) return {status: 'accepted', actualPeriod: exact.period, records: copy(exact.records), frameId: exact.frameId, transformation: null};
  const rule = layer.alignment;
  if (!rule) return {status: 'refused', finding: finding('time.alignment.rule_required', layer, time, `${layer.title} has no declared alignment rule for ${time}.`)};

  const ordered = [...layer.observations].sort((a, b) => dateForPeriod(a.period) - dateForPeriod(b.period));
  if (rule.method === 'nearest') {
    const selected = ordered.toSorted((a, b) => distanceDays(a.period, time) - distanceDays(b.period, time))[0];
    const distance = selected ? distanceDays(selected.period, time) : Infinity;
    if (!selected || distance > rule.maxDays) return {status: 'refused', finding: finding('time.alignment.outside_tolerance', layer, time, `${layer.title} has no period within ${rule.maxDays} days of ${time}.`)};
    return {status: 'accepted', actualPeriod: selected.period, records: copy(selected.records), frameId: selected.frameId, transformation: {method: 'nearest', inputs: [selected.period], parameters: {maxDays: rule.maxDays, distanceDays: distance}, outputStatus: 'measured', revision: layer.revision}};
  }
  if (rule.method === 'forward-fill') {
    const selected = ordered.filter(({period}) => dateForPeriod(period) <= dateForPeriod(time)).at(-1);
    if (!selected || distanceDays(selected.period, time) > rule.maxDays) return {status: 'refused', finding: finding('time.alignment.outside_tolerance', layer, time, `${layer.title} cannot be forward-filled to ${time}.`)};
    return {status: 'accepted', actualPeriod: selected.period, records: copy(selected.records), transformation: {method: 'forward-fill', inputs: [selected.period], parameters: {maxDays: rule.maxDays}, outputStatus: 'modeled', revision: layer.revision}};
  }
  if (rule.method === 'interpolate') {
    const before = ordered.filter(({period}) => dateForPeriod(period) < dateForPeriod(time)).at(-1);
    const after = ordered.find(({period}) => dateForPeriod(period) > dateForPeriod(time));
    if (!before || !after) return {status: 'refused', finding: finding('time.alignment.bounds_required', layer, time, `${layer.title} cannot interpolate ${time} without values on both sides.`)};
    const ratio = (dateForPeriod(time) - dateForPeriod(before.period)) / (dateForPeriod(after.period) - dateForPeriod(before.period));
    return {status: 'accepted', actualPeriod: `${before.period} → ${after.period}`, records: interpolateRecords(before, after, ratio), transformation: {method: 'linear-interpolation', inputs: [before.period, after.period], parameters: {ratio}, outputStatus: 'interpolated', revision: layer.revision}};
  }
  if (rule.method === 'aggregate') {
    const inputs = ordered.filter(({period}) => period.startsWith(time.slice(0, 4)));
    if (!inputs.length) return {status: 'refused', finding: finding('time.alignment.inputs_missing', layer, time, `${layer.title} has no inputs to aggregate for ${time}.`)};
    return {status: 'accepted', actualPeriod: inputs.map(({period}) => period).join(', '), records: aggregateRecords(inputs, rule.reducer), transformation: {method: `${rule.reducer}-aggregation`, inputs: inputs.map(({period}) => period), parameters: {calendar: 'UTC year'}, outputStatus: 'modeled', revision: layer.revision}};
  }
  return {status: 'refused', finding: finding('time.alignment.method_unsupported', layer, time, `${layer.title} uses unsupported alignment ${rule.method}.`)};
}

export function buildTemporalFrame(fixture, options = {}) {
  const time = options.time ?? fixture.timeline[0];
  const projection = options.projection ?? fixture.projection;
  const activeLayerIds = options.activeLayerIds ?? fixture.layers.filter(({defaultActive}) => defaultActive).map(({id}) => id);
  const layers = [];
  for (const layerId of activeLayerIds) {
    const layer = fixture.layers.find(({id}) => id === layerId);
    if (!layer) return {status: 'refused', time, projection, activeLayerIds: [...activeLayerIds], layers: [], findings: [{code: 'layer.missing', severity: 'error', layerId, time, message: `Unknown layer ${layerId}.`}]};
    if (!layer.projections.includes(projection)) return {status: 'refused', time, projection, activeLayerIds: [...activeLayerIds], layers: [], findings: [finding('layer.projection.refused', layer, time, `${layer.title} cannot render on ${projection}.`)]};
    const aligned = alignLayer(layer, time);
    if (aligned.status === 'refused') return {status: 'refused', time, projection, activeLayerIds: [...activeLayerIds], layers: [], findings: [aligned.finding]};
    const limit = layer.kind === 'flow' ? 5_000 : layer.kind === 'points' ? 10_000 : Infinity;
    layers.push({...copy(layer), ...aligned, records: aligned.records.slice(0, limit), totalRecords: aligned.records.length, visibleRecords: Math.min(aligned.records.length, limit)});
  }
  return {status: 'accepted', time, projection, activeLayerIds: [...activeLayerIds], layers, findings: []};
}

export function addTemporalLayer(frame, fixture, layerId) {
  const candidateIds = [...frame.activeLayerIds, layerId];
  const candidate = buildTemporalFrame(fixture, {time: frame.time, projection: frame.projection, activeLayerIds: candidateIds});
  return candidate.status === 'accepted' ? candidate : {status: 'refused', frame: copy(frame), findings: candidate.findings};
}

export function setTemporalTime(frame, fixture, time) {
  const candidate = buildTemporalFrame(fixture, {time, projection: frame.projection, activeLayerIds: frame.activeLayerIds});
  return candidate.status === 'accepted' ? candidate : {status: 'refused', frame: copy(frame), findings: candidate.findings};
}

export function stateEncoding(status) {
  return copy(STATE_ENCODINGS[status] ?? {label: status, pattern: 'unknown'});
}

export function temporalSnapshot(frame) {
  return {
    sceneTime: frame.time,
    projection: frame.projection,
    layers: frame.layers.map((layer) => ({
      id: layer.id,
      title: layer.title,
      kind: layer.kind,
      unit: layer.unit,
      actualPeriod: layer.actualPeriod,
      transformation: copy(layer.transformation),
      rows: layer.records.map((record) => ({...copy(record), encoding: stateEncoding(record.status)})),
    })),
  };
}

export function createAnimation(frame, fixture, options = {}) {
  return {frame: copy(frame), fixture, paused: options.reducedMotion === true, reducedMotion: options.reducedMotion === true};
}

export function advanceAnimation(animation) {
  if (animation.paused) return copy(animation);
  const index = animation.fixture.timeline.indexOf(animation.frame.time);
  const time = animation.fixture.timeline[(index + 1) % animation.fixture.timeline.length];
  const next = setTemporalTime(animation.frame, animation.fixture, time);
  return next.status === 'accepted' ? {...animation, frame: next} : {...animation, paused: true, finding: next.findings[0]};
}

export function setAnimationPaused(animation, paused) {
  return {...copy(animation), paused};
}

export function renderTemporalOverlays(canvas, baseModel, frame) {
  if (frame.status !== 'accepted' || baseModel.projection === 'population-cartogram') return frame;
  const context = canvas.getContext('2d');
  const width = Number.parseFloat(canvas.style.width);
  const height = Number.parseFloat(canvas.style.height);
  const projection = projectionFor(baseModel.projection, width, height, baseModel.camera);
  context.save();
  for (const layer of frame.layers) {
    if (layer.kind === 'raster') {
      context.globalAlpha = .18;
      for (const [index, cell] of layer.records.entries()) {
        context.fillStyle = cell.color;
        context.fillRect((index / layer.records.length) * width, 0, width / layer.records.length, height);
      }
    } else if (layer.kind === 'flow') {
      context.globalAlpha = .72;
      for (const record of layer.records) {
        if (record.status === 'missing' || record.status === 'unavailable') continue;
        const start = projection(record.fromCoordinates);
        const end = projection(record.toCoordinates);
        if (!start || !end) continue;
        context.beginPath();
        context.moveTo(...start);
        context.lineTo(...end);
        context.strokeStyle = record.status === 'zero' ? '#a8b8d6' : layer.color;
        context.lineWidth = record.status === 'zero' ? 1 : Math.max(1.5, Math.sqrt(record.value) / 2);
        context.setLineDash(record.status === 'zero' ? [3, 5] : []);
        context.stroke();
      }
    } else if (layer.kind === 'points') {
      context.setLineDash([]);
      for (const record of layer.records.filter(({status}) => status !== 'outside-range')) {
        const point = projection(record.coordinates);
        if (!point) continue;
        context.beginPath();
        context.arc(point[0], point[1], 5, 0, Math.PI * 2);
        context.fillStyle = layer.color;
        context.fill();
      }
    } else if (layer.kind === 'scalar' && layer.overlay) {
      context.setLineDash([]);
      for (const record of layer.records) {
        const coordinates = record.coordinates ?? (() => {
          const feature = baseModel.fixture.geography.features.find(({id}) => id === record.id);
          return feature ? geoCentroid(feature) : null;
        })();
        const point = coordinates ? projection(coordinates) : null;
        if (!point) continue;
        context.beginPath();
        context.arc(point[0], point[1], record.status === 'interpolated' ? 9 : 7, 0, Math.PI * 2);
        context.strokeStyle = layer.color;
        context.lineWidth = 2.5;
        context.setLineDash(record.status === 'interpolated' ? [2, 4] : []);
        context.stroke();
      }
    }
  }
  context.restore();
  canvas.dataset.temporalLayers = String(frame.layers.length);
  canvas.dataset.sceneTime = frame.time;
  return frame;
}
