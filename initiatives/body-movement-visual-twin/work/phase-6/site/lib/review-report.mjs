export const REVIEW_KINDS = Object.freeze(['anatomy', 'movement', 'attribution', 'safety']);
export const REVIEW_SEVERITIES = Object.freeze(['question', 'important', 'blocking']);

function descriptor(path, kind, label) {
  return Object.freeze({ path, kind, label });
}

export function claimDescriptors(movement, { phaseId = null } = {}) {
  if (!movement?.id || !Array.isArray(movement.phases)) throw new TypeError('Claim descriptors require a movement record');
  const claims = [];
  movement.phases.forEach((phase, phaseIndex) => {
    if (phaseId && phase.id !== phaseId) return;
    phase.joint_actions.forEach((claim, claimIndex) => claims.push(descriptor(
      `phases.${phaseIndex}.joint_actions.${claimIndex}`,
      'movement',
      `${claim.joint}: ${claim.action}`
    )));
    phase.muscles.forEach((claim, claimIndex) => claims.push(descriptor(
      `phases.${phaseIndex}.muscles.${claimIndex}`,
      'anatomy',
      `${claim.id}: ${claim.behaviour}`
    )));
  });
  movement.source.claim_sources.forEach((source, index) => claims.push(descriptor(
    `source.claim_sources.${index}`,
    'attribution',
    source.title
  )));
  movement.safety.cautions.forEach((caution, index) => claims.push(descriptor(
    `safety.cautions.${index}`,
    'safety',
    caution
  )));
  claims.push(descriptor('safety.notes', 'safety', movement.safety.notes));
  return Object.freeze(claims);
}

export function valueAtClaimPath(record, path) {
  return path.split('.').reduce((value, segment) => {
    if (value === null || value === undefined || !Object.hasOwn(value, segment)) throw new RangeError(`Unknown claim path: ${path}`);
    return value[segment];
  }, record);
}

function nonEmpty(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

export function createReviewReport({ movement, claimPath, reviewer = '', date = new Date(), kind, severity, note }) {
  if (!movement?.id) throw new TypeError('A movement record is required');
  const known = claimDescriptors(movement).find((claim) => claim.path === claimPath);
  if (!known) throw new RangeError(`Unknown claim path: ${claimPath}`);
  if (!REVIEW_KINDS.includes(kind) || kind !== known.kind) throw new RangeError(`Claim ${claimPath} requires kind ${known.kind}`);
  if (!REVIEW_SEVERITIES.includes(severity)) throw new RangeError(`Unknown severity: ${severity}`);
  const created = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(created.getTime())) throw new RangeError('Report date is invalid');
  return Object.freeze({
    schema_version: 1,
    movement_id: movement.id,
    claim_path: claimPath,
    reviewer: String(reviewer ?? '').trim(),
    date: created.toISOString(),
    kind,
    severity,
    note: nonEmpty(note, 'Report note'),
    record_changed: false
  });
}

export function serializeReviewReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function reviewEmailUrl(report, recipient = '') {
  const subject = `Movement review: ${report.movement_id} · ${report.claim_path}`;
  const body = serializeReviewReport(report);
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
