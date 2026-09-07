export const REGION_LABELS = Object.freeze({ head: 'Head and neck', shoulders: 'Shoulders and arms', spine: 'Spine and ribs', hips: 'Pelvis and hips', legs: 'Legs and feet', whole: 'Whole body' });
export const normalizeSearch = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’–-]/g, ' ');

export function filterMovements(entries, { tradition = 'all', region = 'all', query = '' } = {}) {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => (tradition === 'all' || entry.tradition === tradition)
    && (region === 'all' || entry.regions.includes(region))
    && terms.every(term => normalizeSearch([entry.label, entry.tradition, TRADITION_LABELS[entry.tradition], entry.group, entry.position, ...entry.aliases, ...entry.regions.map(id => REGION_LABELS[id])].join(' ')).includes(term)));
}

export const oppositeSide = value => value.replace(/-(left|right)$/, (_, side) => side === 'left' ? '-right' : '-left');
const mirrorWords = value => value.replace(/\b(left|right)\b/gi, word => {
  const opposite = word.toLowerCase() === 'left' ? 'right' : 'left';
  return word[0] === word[0].toUpperCase() ? opposite[0].toUpperCase() + opposite.slice(1) : opposite;
});

// Reflect rotations as R' = S R S for S = diag(-1, 1, 1). With the
// rig's Euler order this preserves X rotation and reverses Y and Z.
export function variantClip(clip, { smaller = false, mirrored = false } = {}) {
  if (!smaller && !mirrored) return clip;
  const base = clip.frames[0];
  const frames = clip.frames.map(frame => {
    const result = { ...frame };
    for (const field of ['rotations_deg', 'translations_mm']) {
      const nodes = new Set([...Object.keys(base[field] || {}), ...Object.keys(frame[field] || {})]);
      result[field] = Object.fromEntries([...nodes].map(node => {
        const start = base[field]?.[node] || [0, 0, 0];
        const end = frame[field]?.[node] || [0, 0, 0];
        const values = end.map((value, axis) => smaller ? start[axis] + (value - start[axis]) * .5 : value);
        if (mirrored) values.forEach((value, axis) => { values[axis] = value * (field === 'translations_mm' ? axis === 0 ? -1 : 1 : axis === 0 ? 1 : -1); });
        return [mirrored ? oppositeSide(node) : node, values];
      }));
    }
    return result;
  });
  return { ...clip, frames };
}

export function variantRecord(record, { mirrored = false } = {}) {
  if (!mirrored) return record;
  return { ...record, phases: record.phases.map(phase => ({ ...phase,
    joint_actions: phase.joint_actions.map(action => ({ joint: oppositeSide(action.joint), action: mirrorWords(action.action) })),
    muscles: phase.muscles.map(muscle => ({ ...muscle, id: oppositeSide(muscle.id) }))
  })) };
}
import { TRADITION_LABELS } from './collection.mjs';
