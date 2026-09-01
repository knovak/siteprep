import {canonicalJson, deepClone} from './canonical.mjs';
import {finding} from './findings.mjs';
import {validateObject} from './validate.mjs';

const INTENT_FIELDS = Object.freeze({
  'set-time': ['period'],
  'set-projection': ['projection'],
  'set-camera': ['center', 'zoom'],
  'set-layers': ['layers'],
});

export function compatibility(scene, layersById, projection = scene.projection) {
  const findings = [];
  for (const layerId of scene.layers) {
    const layer = layersById.get(layerId);
    if (!layer) {
      findings.push(finding('compatibility.layer.missing', '$.layers', `Layer ${layerId} is absent`));
      continue;
    }
    if (!layer.content.projections.includes(projection)) {
      findings.push(finding('compatibility.projection.refused', '$.projection', `${layerId} cannot preserve meaning on ${projection}`));
    }
  }
  const geographyIds = new Set(
    scene.layers.map((id) => layersById.get(id)?.content.geographyRef).filter(Boolean),
  );
  if (geographyIds.size > 1) {
    findings.push(finding('compatibility.geography.crosswalk_required', '$.layers', 'Layers use different geography sets without a declared crosswalk'));
  }
  return {
    compatible: findings.length === 0,
    projection,
    layerIds: [...scene.layers],
    findings,
  };
}

export function createSession(scene, sessionId = 'session:local') {
  return {
    sessionId,
    acceptedRevision: scene.intentRevision,
    scene: deepClone(scene),
    seenIntentIds: [],
  };
}

function refuse(session, code, path, message, status = 'refused') {
  return {status, session: deepClone(session), findings: [finding(code, path, message)]};
}

export function applyIntent(session, intentObject, layersById) {
  const objectFindings = validateObject(intentObject, '$.intent');
  if (objectFindings.some(({severity}) => severity === 'error')) {
    return {status: 'refused', session: deepClone(session), findings: objectFindings};
  }
  const intent = intentObject.content;
  if (intent.sessionId !== session.sessionId) return refuse(session, 'intent.session.mismatch', '$.intent.content.sessionId', 'Intent addresses another session');
  if (session.seenIntentIds.includes(intent.intentId)) {
    return {status: 'duplicate', session: deepClone(session), findings: []};
  }
  if (intent.baseRevision !== session.acceptedRevision) {
    return refuse(session, 'intent.revision.stale', '$.intent.content.baseRevision', 'Intent base revision is stale', 'stale');
  }
  if (!INTENT_FIELDS[intent.type]) return refuse(session, 'intent.type.unsupported', '$.intent.content.type', `Unsupported intent type ${intent.type}`);
  if (Buffer.byteLength(canonicalJson(intent.payload), 'utf8') > 64 * 1024) return refuse(session, 'intent.payload.limit', '$.intent.content.payload', 'Intent payload exceeds 64 KiB');
  const allowed = new Set(INTENT_FIELDS[intent.type]);
  for (const field of Object.keys(intent.payload)) {
    if (!allowed.has(field)) return refuse(session, 'intent.payload.unknown', `$.intent.content.payload.${field}`, `Unknown ${intent.type} payload field ${field}`);
  }

  const next = deepClone(session);
  if (intent.type === 'set-time') {
    if (typeof intent.payload.period !== 'string' || !intent.payload.period) return refuse(session, 'intent.period.invalid', '$.intent.content.payload.period', 'Period must be a non-empty string');
    next.scene.period = intent.payload.period;
  } else if (intent.type === 'set-projection') {
    const result = compatibility(next.scene, layersById, intent.payload.projection);
    if (!result.compatible) return {status: 'refused', session: deepClone(session), findings: result.findings};
    next.scene.projection = intent.payload.projection;
  } else if (intent.type === 'set-camera') {
    const {center, zoom} = intent.payload;
    if (!Array.isArray(center) || center.length !== 2 || center.some((value) => !Number.isFinite(value)) || !Number.isFinite(zoom) || zoom <= 0) {
      return refuse(session, 'intent.camera.invalid', '$.intent.content.payload', 'Camera requires finite [longitude, latitude] and positive zoom');
    }
    next.scene.camera = {center: [...center], zoom};
  } else if (intent.type === 'set-layers') {
    if (!Array.isArray(intent.payload.layers) || intent.payload.layers.length === 0) return refuse(session, 'intent.layers.invalid', '$.intent.content.payload.layers', 'At least one layer is required');
    const candidate = {...next.scene, layers: [...intent.payload.layers]};
    const result = compatibility(candidate, layersById, candidate.projection);
    if (!result.compatible) return {status: 'refused', session: deepClone(session), findings: result.findings};
    next.scene.layers = candidate.layers;
  }
  next.acceptedRevision += 1;
  next.scene.intentRevision = next.acceptedRevision;
  next.seenIntentIds.push(intent.intentId);
  return {status: 'accepted', session: next, findings: []};
}
