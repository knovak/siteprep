import {contentIdentity, deepClone, sha256} from './canonical.mjs';
import {finding} from './findings.mjs';

const RIGHTS_ALLOWED = new Set(['redistributable', 'reference-only']);

function layerFinding(code, index, layer, correction) {
  return finding(code, `$.layers[${index}]`, `${layer.title ?? layer.id}: ${correction}`);
}

export function validateSceneDraft(draft, catalogue) {
  const findings = [];
  const resolved = [];
  for (const [index, selected] of (draft.layers ?? []).entries()) {
    const available = catalogue.filter(({id}) => id === selected.layerId);
    const layer = available.find(({revision}) => revision === selected.datasetRevision) ?? available[0];
    if (!layer) {
      findings.push(finding('composer.layer.missing', `$.layers[${index}]`, `Layer ${selected.layerId} is not in the catalogue; choose an available revision`));
      continue;
    }
    resolved.push({selected, layer, index});
    if (selected.datasetRevision !== layer.revision) findings.push(layerFinding('composer.dataset.revision_missing', index, layer, `select the catalogue revision ${layer.revision}`));
    if (!layer.projections.includes(draft.projection)) findings.push(layerFinding('composer.projection.incompatible', index, layer, `choose one of ${layer.projections.join(', ')} or remove this layer`));
    if (!RIGHTS_ALLOWED.has(layer.rights.status)) findings.push(layerFinding('composer.rights.blocked', index, layer, 'record permitted reuse terms or keep the layer out of the scene'));
    if (!layer.citation?.url || !layer.citation?.revision || !layer.citation?.rights) findings.push(layerFinding('composer.citation.incomplete', index, layer, 'supply source URL, revision, and rights before saving'));
    if (layer.formula && layer.formula.resultUnit !== layer.unit) findings.push(layerFinding('composer.unit.formula_mismatch', index, layer, `correct the formula result unit to ${layer.unit}`));
    if (selected.period !== layer.period && !selected.alignmentRule) findings.push(layerFinding('composer.time.rule_required', index, layer, `declare how ${layer.period} aligns to scene period ${selected.period}`));
  }
  if (!resolved.length) findings.push(finding('composer.layers.required', '$.layers', 'Choose at least one layer'));
  const geographies = new Set(resolved.map(({layer}) => layer.geographyRef));
  if (geographies.size > 1 && !draft.crosswalkRef) {
    findings.push(finding('composer.geography.crosswalk_required', '$.layers', 'Layers use different geographies; choose a reviewed crosswalk or remove the incompatible layer'));
  }
  for (const key of ['definitions', 'caveats', 'discussionPrompts', 'presentationStops']) {
    if (!Array.isArray(draft[key]) || draft[key].length === 0) findings.push(finding(`composer.${key}.required`, `$.${key}`, `Add at least one ${key.replace(/([A-Z])/gu, ' $1').toLowerCase()} entry`));
  }
  for (const [index, claim] of (draft.claims ?? []).entries()) {
    if (!claim.text || !Array.isArray(claim.sources) || claim.sources.length === 0 || claim.sources.some(({url}) => !url)) {
      findings.push(finding('composer.claim.source_required', `$.claims[${index}]`, 'Each interpretive claim needs its own source link, separate from dataset attribution'));
    }
  }
  const stopOrders = (draft.presentationStops ?? []).map(({order}) => order);
  if (new Set(stopOrders).size !== stopOrders.length || stopOrders.some((order) => !Number.isInteger(order) || order < 1)) {
    findings.push(finding('composer.stops.order_invalid', '$.presentationStops', 'Use unique positive whole-number presentation stop orders'));
  }
  return findings;
}

export function saveSceneRevision(draft, catalogue, options = {}) {
  const findings = validateSceneDraft(draft, catalogue);
  if (findings.some(({severity}) => severity === 'error')) return {status: 'refused', findings};
  const content = deepClone({
    sceneId: draft.sceneId,
    title: draft.title,
    summary: draft.summary,
    projection: draft.projection,
    crosswalkRef: draft.crosswalkRef ?? null,
    layers: draft.layers,
    definitions: draft.definitions,
    caveats: draft.caveats,
    discussionPrompts: draft.discussionPrompts,
    presentationStops: [...draft.presentationStops].sort((a, b) => a.order - b.order),
    claims: draft.claims ?? [],
  });
  const revisionId = `scene-revision:${contentIdentity(content).slice(7)}`;
  return {
    status: 'accepted',
    findings: [],
    revision: {
      revisionId,
      predecessorRevisionId: options.predecessorRevisionId ?? null,
      createdAt: options.createdAt ?? '2026-09-02T00:00:00.000Z',
      content,
    },
  };
}

export function createShareLink(revision, baseUrl = 'https://maps.example.test/scene') {
  const url = new URL(baseUrl);
  url.searchParams.set('sceneRevision', revision.revisionId);
  return url.toString();
}

export function resolveShareLink(link, revisions) {
  const revisionId = new URL(link).searchParams.get('sceneRevision');
  const revision = revisions.find((candidate) => candidate.revisionId === revisionId);
  return revision ? {status: 'accepted', revision: deepClone(revision)} : {
    status: 'refused',
    findings: [finding('composer.share.revision_missing', '$.sceneRevision', `Shared scene revision ${revisionId ?? '(absent)'} is unavailable`) ],
  };
}

export function compareUpgrade(revision, catalogue) {
  const latestBySeries = new Map();
  for (const layer of catalogue) {
    const current = latestBySeries.get(layer.seriesId);
    if (!current || layer.releaseOrder > current.releaseOrder) latestBySeries.set(layer.seriesId, layer);
  }
  const changes = [];
  const layers = revision.content.layers.map((selected) => {
    const current = catalogue.find(({id, revision: candidate}) => id === selected.layerId && candidate === selected.datasetRevision);
    const latest = current ? latestBySeries.get(current.seriesId) : null;
    if (!current || !latest || latest.revision === current.revision) return selected;
    for (const [field, from, to] of [
      ['dataset', current.revision, latest.revision],
      ['geography', current.geographyRef, latest.geographyRef],
      ['transformation', current.transformationRef ?? null, latest.transformationRef ?? null],
    ]) if (from !== to) changes.push({layerId: selected.layerId, field, from, to});
    return {...selected, datasetRevision: latest.revision, period: latest.period};
  });
  const draft = {...deepClone(revision.content), layers};
  const findings = validateSceneDraft(draft, catalogue);
  return {status: findings.some(({severity}) => severity === 'error') ? 'refused' : 'available', changes, findings, draft};
}

export function acceptUpgrade(revision, catalogue, options = {}) {
  const comparison = compareUpgrade(revision, catalogue);
  if (comparison.status === 'refused') return comparison;
  const saved = saveSceneRevision(comparison.draft, catalogue, {
    predecessorRevisionId: revision.revisionId,
    createdAt: options.createdAt,
  });
  return {...saved, changes: comparison.changes};
}

export function preparePortableBundle(revision, catalogue, assets) {
  const selectedRevisions = new Set(revision.content.layers.map(({datasetRevision}) => datasetRevision));
  const selected = catalogue.filter(({revision: candidate}) => selectedRevisions.has(candidate));
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const bundledAssets = [];
  const references = [];
  for (const layer of selected) {
    const asset = assetById.get(layer.assetId);
    if (!asset) continue;
    if (layer.rights.status === 'redistributable') {
      const bytes = Buffer.from(asset.bytes, 'base64');
      bundledAssets.push({id: asset.id, mediaType: asset.mediaType, size: bytes.byteLength, hash: sha256(bytes), bytes: asset.bytes});
    } else {
      references.push({id: asset.id, url: asset.url, limitation: layer.rights.limitation, expiresAt: layer.rights.expiresAt ?? null});
    }
  }
  const logical = {format: 'educational-global-maps/portable-scene/v1', rootSceneRevision: revision.revisionId, scene: revision, bundledAssets, references};
  return {
    bundleId: `portable:${contentIdentity(logical).slice(7, 39)}`,
    ...logical,
    restoredBytes: bundledAssets.reduce((total, asset) => total + asset.size, 0),
    catalogueArtifactsLoaded: selected.length,
  };
}

export function restorePortableBundle(bundle, options = {}) {
  const findings = [];
  for (const [index, asset] of bundle.bundledAssets.entries()) {
    const bytes = Buffer.from(asset.bytes, 'base64');
    if (bytes.byteLength !== asset.size || sha256(bytes) !== asset.hash) findings.push(finding('composer.bundle.asset_mismatch', `$.bundledAssets[${index}]`, `${asset.id} failed its size or checksum check`));
  }
  const memoryBudgetBytes = options.memoryBudgetBytes ?? 8 * 1024 * 1024;
  if (bundle.restoredBytes > memoryBudgetBytes) findings.push(finding('composer.bundle.memory_limit', '$.restoredBytes', `Bundle needs ${bundle.restoredBytes} bytes; reduce assets below ${memoryBudgetBytes}`));
  return findings.length ? {status: 'refused', findings} : {status: 'accepted', scene: deepClone(bundle.scene), references: deepClone(bundle.references), restoredBytes: bundle.restoredBytes};
}

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function renderOfflineDocument(bundle) {
  const scene = bundle.scene.content;
  const embedded = bundle.bundledAssets.map((asset) => `<li>${htmlEscape(asset.id)} · ${asset.size} bytes · verified</li>`).join('');
  const references = bundle.references.map((reference) => `<li>${htmlEscape(reference.id)} — ${htmlEscape(reference.limitation)}${reference.expiresAt ? `; expires ${htmlEscape(reference.expiresAt)}` : ''}</li>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${htmlEscape(scene.title)}</title><style>body{font:16px system-ui;max-width:52rem;margin:auto;padding:2rem;color:#17233c}section{border:1px solid #ccd5e5;border-radius:1rem;padding:1rem;margin:1rem 0}</style><h1>${htmlEscape(scene.title)}</h1><p>${htmlEscape(scene.summary)}</p><p><strong>Pinned scene:</strong> ${htmlEscape(bundle.rootSceneRevision)}</p><section><h2>Bundled permitted assets</h2><ul>${embedded}</ul></section><section><h2>References not bundled</h2><ul>${references || '<li>None</li>'}</ul></section><script type="application/json" id="scene">${JSON.stringify(scene).replaceAll('<', '\\u003c')}</script></html>`;
}
