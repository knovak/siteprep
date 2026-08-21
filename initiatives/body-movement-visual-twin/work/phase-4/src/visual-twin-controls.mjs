export const REFERENCE_STATURE_CM = 170;

export const DEFAULT_VISUAL_PROFILE = Object.freeze({
  statureCm: REFERENCE_STATURE_CM,
  build: 0,
  torsoToLimb: 0,
  presentation: 'neutral'
});

export const PRESENTATIONS = Object.freeze({
  neutral: Object.freeze({ label: 'Neutral study', surfaceColor: '#b7d8cc', finish: 'even' }),
  soft: Object.freeze({ label: 'Soft outline', surfaceColor: '#a9d6e5', finish: 'soft' }),
  angular: Object.freeze({ label: 'Angular outline', surfaceColor: '#dfb2f4', finish: 'angular' })
});

function boundedNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

export function normalizeVisualProfile(value = {}) {
  const presentation = Object.hasOwn(PRESENTATIONS, value.presentation)
    ? value.presentation
    : DEFAULT_VISUAL_PROFILE.presentation;
  return Object.freeze({
    statureCm: boundedNumber(value.statureCm, 145, 200, DEFAULT_VISUAL_PROFILE.statureCm),
    build: boundedNumber(value.build, -1, 1, DEFAULT_VISUAL_PROFILE.build),
    torsoToLimb: boundedNumber(value.torsoToLimb, -1, 1, DEFAULT_VISUAL_PROFILE.torsoToLimb),
    presentation
  });
}

export function statureScale(profile) {
  return normalizeVisualProfile(profile).statureCm / REFERENCE_STATURE_CM;
}

function scalePoint(point, factor) {
  return point.map((value) => value * factor);
}

export function scaleReferenceRig(rig, profile) {
  const factor = statureScale(profile);
  return {
    ...rig,
    reference_stature_mm: rig.reference_stature_mm * factor,
    registration_tolerance_mm: rig.registration_tolerance_mm * factor,
    nodes: rig.nodes.map((node) => ({
      ...node,
      translation_mm: scalePoint(node.translation_mm, factor)
    })),
    layers: {
      ...rig.layers,
      surface: rig.layers.surface.map((shell) => ({
        ...shell,
        radius_mm: shell.radius_mm * factor
      }))
    }
  };
}

export function scaleMuscleData(muscles, profile) {
  const factor = statureScale(profile);
  return {
    ...muscles,
    attachments: muscles.attachments.map((attachment) => ({
      ...attachment,
      bone_landmark_local_mm: scalePoint(attachment.bone_landmark_local_mm, factor),
      geometry_landmark_local_mm: scalePoint(attachment.geometry_landmark_local_mm, factor)
    }))
  };
}

export function surfaceAppearance(profile) {
  const normalized = normalizeVisualProfile(profile);
  const presentation = PRESENTATIONS[normalized.presentation];
  return Object.freeze({
    color: presentation.surfaceColor,
    radiusFactor: 1 + normalized.build * 0.18,
    torsoFactor: 1 + normalized.torsoToLimb * 0.08,
    limbFactor: 1 - normalized.torsoToLimb * 0.1,
    finish: presentation.finish
  });
}

export function personalizeSurfacePoint(point, nodeId, profile) {
  const appearance = surfaceAppearance(profile);
  const next = [...point];
  if (/spine|neck|clavicle/.test(nodeId)) {
    const waist = 700 * statureScale(profile);
    next[1] = waist + (next[1] - waist) * appearance.torsoFactor;
  }
  if (/scapula|humerus/.test(nodeId)) next[0] *= appearance.limbFactor;
  return next;
}

export function describeProfileChange(previous, next) {
  const before = normalizeVisualProfile(previous);
  const after = normalizeVisualProfile(next);
  const changed = [];
  if (before.statureCm !== after.statureCm) changed.push('overall visible stature and the fitted reference scale');
  if (before.build !== after.build) changed.push('surface outline width');
  if (before.torsoToLimb !== after.torsoToLimb) changed.push('visible torso-to-limb proportion');
  if (before.presentation !== after.presentation) changed.push('surface presentation only');
  const visible = changed.length ? changed.join(', ') : 'no visible dimensions';
  return `${visible} changed. Internal anatomy remains fitted reference geometry; the controls do not infer mobility, muscle behaviour, force, or biomechanics.`;
}
