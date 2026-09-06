import { globalMatrices, transformPoint } from '../../phase-0/scripts/rig-math.mjs';

export function interpolateMovementPose(rig, clip, time) {
  const frames = clip.frames;
  let before = frames[0];
  let after = frames.at(-1);
  for (let index = 1; index < frames.length; index += 1) {
    if (time <= frames[index].t) {
      before = frames[index - 1];
      after = frames[index];
      break;
    }
  }
  const amount = Math.max(0, Math.min(1, (time - before.t) / Math.max(after.t - before.t, Number.EPSILON)));
  const frame = { id: `${before.id}-${after.id}`, rotations_deg: {}, translations_mm: {} };
  for (const node of rig.nodes) {
    for (const field of ['rotations_deg', 'translations_mm']) {
      const a = before[field]?.[node.id] || [0, 0, 0];
      const b = after[field]?.[node.id] || [0, 0, 0];
      frame[field][node.id] = a.map((value, index) => value + (b[index] - value) * amount);
    }
  }
  if (clip.planted_sagittal_feet) {
    // Rotation at tibia is the ankle pivot. Cancel the inherited leg pitch so
    // the forefoot points anteriorly at every time, including between keyframes.
    for (const side of ['left', 'right']) {
      const pitch = ['root', 'pelvis', `hip-${side}`, `femur-${side}`]
        .reduce((sum, node) => sum + frame.rotations_deg[node][0], 0);
      frame.rotations_deg[`tibia-${side}`] = [-pitch, 0, 0];
    }
    const posed = globalMatrices(rig, frame);
    const reference = globalMatrices(rig, { rotations_deg: {} });
    const ankle = transformPoint(posed.get('tibia-left'), [0, 0, 0]);
    const anchor = transformPoint(reference.get('tibia-left'), [0, 0, 0]);
    frame.translations_mm.root = frame.translations_mm.root.map((value, axis) => value + anchor[axis] - ankle[axis]);
  }
  return frame;
}
