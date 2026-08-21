import {
  globalMatrices,
  muscleWorldPaths,
  registrationSamples,
  transformPoint
} from './scripts/rig-math.mjs';

const rig = await fetch('./assets/original/reference-rig.json').then((response) => response.json());
const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const frameSlider = document.querySelector('#frame');
const frameName = document.querySelector('#frame-name');
const status = document.querySelector('#status');
const playButton = document.querySelector('#play');
const layerInputs = [...document.querySelectorAll('[data-layer]')];

let frameIndex = 0;
let playing = false;
let timer = null;

const muscleColors = [
  '#e45756', '#f58518', '#eeca3b', '#72b7b2', '#54a24b',
  '#b279a2', '#ff9da6', '#9d755d', '#7b6fd0', '#4c78a8'
];

function pointToCanvas([x, y]) {
  return [canvas.width / 2 + x * 0.62, canvas.height - 70 - (y - 620) * 0.62];
}

function line(a, b, color, width, alpha = 1) {
  const [ax, ay] = pointToCanvas(a);
  const [bx, by] = pointToCanvas(b);
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(ax, ay);
  context.lineTo(bx, by);
  context.stroke();
  context.restore();
}

function enabled(layer) {
  return layerInputs.find((input) => input.dataset.layer === layer)?.checked;
}

function render() {
  const frame = rig.clip.frames[frameIndex];
  const matrices = globalMatrices(rig, frame);
  context.clearRect(0, 0, canvas.width, canvas.height);

  const world = (nodeId, local = [0, 0, 0]) => transformPoint(matrices.get(nodeId), local);

  if (enabled('surface')) {
    for (const primitive of rig.layers.surface) {
      line(world(primitive.from), world(primitive.to), '#8bc5bc', primitive.radius_mm * 0.38, 0.28);
    }
  }

  if (enabled('skeleton')) {
    for (const node of rig.nodes) {
      if (!node.parent) continue;
      line(world(node.parent), world(node.id), '#ecf4f2', 7, 0.92);
    }
  }

  if (enabled('muscles')) {
    let index = 0;
    for (const [, endpoints] of muscleWorldPaths(rig, frame)) {
      if (endpoints.length === 2) {
        line(endpoints[0].point, endpoints[1].point, muscleColors[index % muscleColors.length], 10, 0.92);
      }
      index += 1;
    }
  }

  for (const node of rig.nodes) {
    if (node.id === 'root') continue;
    const [x, y] = pointToCanvas(world(node.id));
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(x, y, 3.5, 0, Math.PI * 2);
    context.fill();
  }

  frameName.textContent = `${frame.id} · t=${frame.t.toFixed(2)}`;
  const frameSamples = registrationSamples(rig).filter((sample) => sample.frame === frame.id);
  const maximum = Math.max(...frameSamples.map((sample) => sample.distance_mm));
  status.textContent = `Max attachment distance ${maximum.toFixed(2)} mm / ${rig.registration_tolerance_mm} mm`;
  status.dataset.pass = String(maximum <= rig.registration_tolerance_mm);
}

function stop() {
  playing = false;
  playButton.textContent = 'Play slow loop';
  clearInterval(timer);
}

frameSlider.max = String(rig.clip.frames.length - 1);
frameSlider.addEventListener('input', () => {
  stop();
  frameIndex = Number(frameSlider.value);
  render();
});

for (const input of layerInputs) input.addEventListener('change', render);

playButton.addEventListener('click', () => {
  if (playing) {
    stop();
    return;
  }
  playing = true;
  playButton.textContent = 'Pause';
  timer = setInterval(() => {
    frameIndex = (frameIndex + 1) % rig.clip.frames.length;
    frameSlider.value = String(frameIndex);
    render();
  }, 900);
});

document.querySelector('#muscle-count').textContent = String(rig.layers.muscles.length);
document.querySelector('#sample-count').textContent = String(registrationSamples(rig).length);
render();
