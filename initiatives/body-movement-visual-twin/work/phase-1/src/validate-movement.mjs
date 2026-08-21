import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PHASE_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const movementSchema = JSON.parse(readFileSync(resolve(PHASE_DIRECTORY, 'movement.schema.json'), 'utf8'));

function typeMatches(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

function resolveReference(rootSchema, reference) {
  if (!reference.startsWith('#/')) throw new Error(`Only local schema references are supported: ${reference}`);
  return reference.slice(2).split('/').reduce((value, part) => value?.[part.replaceAll('~1', '/').replaceAll('~0', '~')], rootSchema);
}

function schemaErrors(value, schema, path, rootSchema) {
  if (schema.$ref) return schemaErrors(value, resolveReference(rootSchema, schema.$ref), path, rootSchema);
  const errors = [];

  if (schema.allOf) {
    for (const part of schema.allOf) errors.push(...schemaErrors(value, part, path, rootSchema));
  }
  if (schema.if) {
    const conditionMatches = schemaErrors(value, schema.if, path, rootSchema).length === 0;
    if (conditionMatches && schema.then) errors.push(...schemaErrors(value, schema.then, path, rootSchema));
    if (!conditionMatches && schema.else) errors.push(...schemaErrors(value, schema.else, path, rootSchema));
  }

  if (schema.type && !typeMatches(value, schema.type)) {
    errors.push(`${path} must be ${schema.type}`);
    return errors;
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} must be one of ${schema.enum.join(', ')}`);

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} must not be empty`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path} does not match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be at most ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} must contain at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} must contain at most ${schema.maxItems} item(s)`);
    if (schema.items) value.forEach((item, index) => errors.push(...schemaErrors(item, schema.items, `${path}[${index}]`, rootSchema)));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...schemaErrors(child, schema.properties[key], `${path}.${key}`, rootSchema));
      else if (schema.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
    }
  }
  return errors;
}

const FORBIDDEN_CLAIM_KEYS = new Set([
  'force', 'forces', 'load', 'loads', 'activation', 'activationpercent',
  'activationpercentage', 'grade', 'grading', 'score'
]);
const FORBIDDEN_GEOMETRY_KEYS = new Set(['geometry', 'geometrypath', 'mesh', 'meshpath']);

function normalizedKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function inspectKeys(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectKeys(item, `${path}[${index}]`, errors));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (FORBIDDEN_CLAIM_KEYS.has(normalized)) errors.push(`${path}.${key} is forbidden: movement records do not grade force, load, activation, or performance`);
    if (FORBIDDEN_GEOMETRY_KEYS.has(normalized)) errors.push(`${path}.${key} is forbidden: geometry paths belong in the asset manifest`);
    inspectKeys(child, `${path}.${key}`, errors);
  }
}

function duplicateErrors(values, label, path) {
  const seen = new Set();
  const errors = [];
  for (const value of values) {
    if (seen.has(value)) errors.push(`${path} repeats ${label} ${JSON.stringify(value)}`);
    seen.add(value);
  }
  return errors;
}

function crossReferenceErrors(record, manifest) {
  const errors = [];
  const phases = Array.isArray(record.phases) ? record.phases : [];
  const phaseIds = phases.map((phase) => phase?.id).filter((id) => typeof id === 'string');
  errors.push(...duplicateErrors(phaseIds, 'phase id', '$.phases'));
  const phaseSet = new Set(phaseIds);

  phases.forEach((phase, index) => {
    if (Array.isArray(phase?.t) && phase.t.length === 2 && phase.t.every(Number.isFinite) && phase.t[0] >= phase.t[1]) {
      errors.push(`$.phases[${index}].t must start before it ends`);
    }
  });

  const anchors = [];
  if (record.tradition === 'feldenkrais') {
    for (const cue of record.instruction?.attention ?? []) anchors.push(['attention', cue?.phase]);
    for (const pause of record.instruction?.rest_pauses ?? []) anchors.push(['rest pause', pause?.after_phase]);
  } else if (record.tradition === 'yoga') {
    for (const transition of record.instruction?.transitions ?? []) anchors.push(['transition', transition?.phase]);
    const directions = new Set((record.instruction?.transitions ?? []).map((transition) => transition?.direction));
    if (!directions.has('entry') || !directions.has('exit')) errors.push('$.instruction.transitions must include both entry and exit');
  } else if (record.tradition === 'alexander') {
    for (const direction of record.instruction?.directions ?? []) anchors.push(['direction', direction?.phase]);
  }
  for (const [label, phase] of anchors) {
    if (typeof phase === 'string' && !phaseSet.has(phase)) errors.push(`$.instruction ${label} references unknown phase ${JSON.stringify(phase)}`);
  }

  const joints = new Set([
    ...(manifest?.layers?.skeleton ?? []),
    ...(manifest?.nodes ?? []).map((node) => node?.id)
  ]);
  const muscles = new Set((manifest?.layers?.muscles ?? []).map((muscle) => muscle?.id));
  phases.forEach((phase, phaseIndex) => {
    (phase?.joint_actions ?? []).forEach((action, actionIndex) => {
      if (typeof action?.joint === 'string' && !joints.has(action.joint)) {
        errors.push(`$.phases[${phaseIndex}].joint_actions[${actionIndex}].joint references unknown anatomy ${JSON.stringify(action.joint)}`);
      }
    });
    (phase?.muscles ?? []).forEach((muscle, muscleIndex) => {
      if (typeof muscle?.id === 'string' && !muscles.has(muscle.id)) {
        errors.push(`$.phases[${phaseIndex}].muscles[${muscleIndex}].id references unknown anatomy ${JSON.stringify(muscle.id)}`);
      }
    });
  });
  return errors;
}

export function validateMovement(record, manifest) {
  const errors = schemaErrors(record, movementSchema, '$', movementSchema);
  inspectKeys(record, '$', errors);
  errors.push(...crossReferenceErrors(record, manifest));
  return { ok: errors.length === 0, errors };
}

export function validateMovementSet(records, manifest) {
  const errors = [];
  if (!Array.isArray(records)) return { ok: false, errors: ['$ must be an array of movement records'] };
  records.forEach((record, index) => {
    for (const error of validateMovement(record, manifest).errors) errors.push(`[${index}] ${error}`);
  });
  errors.push(...duplicateErrors(records.map((record) => record?.id).filter(Boolean), 'movement id', '$'));
  return { ok: errors.length === 0, errors };
}

export function assertValidMovement(record, manifest) {
  const result = validateMovement(record, manifest);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return record;
}
