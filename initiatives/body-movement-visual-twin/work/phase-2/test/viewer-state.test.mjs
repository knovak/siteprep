import assert from 'node:assert/strict';
import test from 'node:test';
import {
  anatomyIsVisible,
  cameraPreset,
  createViewerState,
  musclesAreRequested,
  orbit,
  setIsolatedJoint,
  setLayer,
  setPinned,
  setTime,
  zoom
} from '../src/viewer-state.mjs';

test('layer, pin, and isolation changes preserve pose, camera, and time', () => {
  const original = setTime(zoom(orbit(createViewerState(), .7, -.2), 1.3), .46);
  const layered = setLayer(original, 3);
  const pinned = setPinned(layered, 'surface');
  const isolated = setIsolatedJoint(pinned, 'scapula-left');

  assert.equal(isolated.time, original.time);
  assert.deepEqual(isolated.camera, original.camera);
  assert.equal(isolated.layer, 3);
  assert.equal(isolated.pinned, 'surface');
  assert.equal(isolated.isolatedJoint, 'scapula-left');
});

test('muscles are requested only for muscle layers or a pinned muscle layer', () => {
  assert.equal(musclesAreRequested(createViewerState()), false);
  assert.equal(musclesAreRequested(setLayer(createViewerState(), 2)), true);
  assert.equal(musclesAreRequested(setLayer(createViewerState(), 3)), true);
  assert.equal(musclesAreRequested(setLayer(createViewerState(), 4)), true);
  assert.equal(musclesAreRequested(setPinned(createViewerState(), 'muscles')), true);
  assert.equal(musclesAreRequested(setLayer(createViewerState(), 5)), false);
});

test('the fitted-reference warning follows anatomy visibility', () => {
  assert.equal(anatomyIsVisible(createViewerState()), false);
  assert.equal(anatomyIsVisible(setLayer(createViewerState(), 1)), true);
  assert.equal(anatomyIsVisible(setPinned(createViewerState(), 'skeleton')), true);
});

test('camera and timeline inputs are bounded', () => {
  const state = setTime(zoom(orbit(createViewerState(), 2, 30), 20), 9);
  assert.equal(state.time, 1);
  assert.equal(state.camera.pitch, 1.1);
  assert.equal(state.camera.zoom, 2.4);
  assert.equal(cameraPreset(state, 'side').camera.yaw, Math.PI / 2);
  assert.throws(() => setLayer(state, 6), RangeError);
});
