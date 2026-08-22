export const TRADITION_LABELS = Object.freeze({
  feldenkrais: 'Feldenkrais',
  yoga: 'Yoga',
  alexander: 'Alexander Technique'
});

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function joined(values) {
  return values.map(text).filter(Boolean).join(' ');
}

export function instructionSections(record) {
  const instruction = record?.instruction;
  if (!instruction || typeof instruction !== 'object') return [];

  if (record.tradition === 'feldenkrais') {
    return [
      { label: 'Exploration', body: text(instruction.exploration) },
      { label: 'Timed attention', body: joined((instruction.attention ?? []).map((entry) => entry.cue)) },
      { label: 'Optional smaller range', body: text(instruction.range?.smaller_reference) },
      { label: 'Rest pause', body: joined((instruction.rest_pauses ?? []).map((entry) => entry.note)) }
    ].filter((section) => section.body);
  }

  if (record.tradition === 'yoga') {
    return [
      { label: 'Posture', body: text(instruction.posture) },
      { label: 'Entry and exit', body: joined((instruction.transitions ?? []).map((entry) => `${entry.direction}: ${entry.cue}`)) },
      { label: 'Modifications', body: joined((instruction.modifications ?? []).map((entry) => entry.note)) },
      { label: 'Props', body: joined(instruction.props ?? []) }
    ].filter((section) => section.body);
  }

  if (record.tradition === 'alexander') {
    return [
      { label: 'Everyday activity', body: text(instruction.activity) },
      { label: 'Directions', body: joined((instruction.directions ?? []).map((entry) => entry.cue)) },
      { label: 'Inhibition', body: text(instruction.inhibition) },
      { label: 'Hands-on guidance boundary', body: text(instruction.manual_guidance_boundary) }
    ].filter((section) => section.body);
  }

  return [];
}

export function movementCompleteness(record) {
  const missing = [];
  if (instructionSections(record).length < 3) missing.push('tradition-specific instruction');
  if (!Array.isArray(record?.safety?.cautions) || record.safety.cautions.length === 0) missing.push('explicit cautions');
  if (!Array.isArray(record?.source?.claim_sources) || record.source.claim_sources.length === 0) missing.push('named claim sources');
  if (!text(record?.source?.rights_basis)) missing.push('provisional rights basis');
  if (!text(record?.source?.review?.status)) missing.push('review status');
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing) });
}

export function phaseCue(record, phaseId) {
  const instruction = record?.instruction ?? {};
  if (record?.tradition === 'feldenkrais') {
    return instruction.attention?.find((entry) => entry.phase === phaseId)?.cue || instruction.exploration || '';
  }
  if (record?.tradition === 'yoga') {
    return instruction.transitions?.find((entry) => entry.phase === phaseId)?.cue || instruction.posture || '';
  }
  if (record?.tradition === 'alexander') {
    return instruction.directions?.find((entry) => entry.phase === phaseId)?.cue || instruction.inhibition || instruction.activity || '';
  }
  return '';
}

function anatomicalName(value) {
  return text(value).replace(/-(left|right)$/, ' ($1)').replaceAll('-', ' ');
}

export function anatomySummary(record, phaseId) {
  const phase = record?.phases?.find((entry) => entry.id === phaseId);
  if (!phase) return '';
  const joints = (phase.joint_actions ?? []).map((entry) => `${anatomicalName(entry.joint)}: ${entry.action}`);
  const muscles = (phase.muscles ?? []).map((entry) => `${anatomicalName(entry.id)} ${entry.behaviour}`);
  return [...joints, muscles.length ? `Muscle paths: ${muscles.join(', ')}` : ''].filter(Boolean).join(' · ');
}
