export const LAYER_STATES = [
  'Surface',
  'Surface + skeleton',
  'Superficial muscles',
  'Deep muscles',
  'Skeleton'
];

export function createViewerState() {
  return {
    camera: { yaw: 0, pitch: 0, zoom: 1 },
    time: 0,
    playing: false,
    layer: 0,
    pinned: 'none',
    isolatedJoint: 'none',
    cautionsAccepted: false,
    musclesLoaded: false
  };
}

function updated(state, change) {
  return { ...state, ...change, camera: change.camera ? { ...change.camera } : state.camera };
}

export function setLayer(state, layer) {
  if (!Number.isInteger(layer) || layer < 0 || layer >= LAYER_STATES.length) throw new RangeError('Layer must be 0–4');
  return updated(state, { layer });
}

export function setPinned(state, pinned) {
  if (!['none', 'surface', 'muscles', 'skeleton'].includes(pinned)) throw new RangeError(`Unknown pinned layer: ${pinned}`);
  return updated(state, { pinned });
}

export function setIsolatedJoint(state, isolatedJoint) {
  return updated(state, { isolatedJoint: isolatedJoint || 'none' });
}

export function setTime(state, time) {
  if (!Number.isFinite(time)) throw new TypeError('Animation time must be finite');
  return updated(state, { time: Math.max(0, Math.min(1, time)) });
}

export function orbit(state, yawDelta, pitchDelta) {
  return updated(state, {
    camera: {
      ...state.camera,
      yaw: state.camera.yaw + yawDelta,
      pitch: Math.max(-1.1, Math.min(1.1, state.camera.pitch + pitchDelta))
    }
  });
}

export function zoom(state, factor) {
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Zoom factor must be positive');
  return updated(state, { camera: { ...state.camera, zoom: Math.max(0.55, Math.min(2.4, state.camera.zoom * factor)) } });
}

export function cameraPreset(state, preset) {
  const angles = {
    front: { yaw: 0, pitch: 0 },
    side: { yaw: Math.PI / 2, pitch: 0 },
    back: { yaw: Math.PI, pitch: 0 }
  }[preset];
  if (!angles) throw new RangeError(`Unknown camera preset: ${preset}`);
  return updated(state, { camera: { ...state.camera, ...angles } });
}

export function anatomyIsVisible(state) {
  return state.layer > 0 || state.pinned === 'muscles' || state.pinned === 'skeleton';
}

export function musclesAreRequested(state) {
  return state.layer === 2 || state.layer === 3 || state.pinned === 'muscles';
}
