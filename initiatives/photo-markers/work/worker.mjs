import { parse as parseFont } from './assets/opentype.mjs';
import { withExif } from './exif-writer.mjs';
let route, font, py, encode;
const resources = () => performance.getEntriesByType('resource').map(x => ({ name: new URL(x.name).pathname, encoded: x.encodedBodySize, decoded: x.decodedBodySize, transfer: x.transferSize }));
async function initialize(candidate) {
  route = candidate;
  const bytes = await (await fetch('./assets/NotoSans-Bold.ttf')).arrayBuffer();
  font = parseFont(bytes);
  if (route === 'A') {
    const { loadPyodide } = await import('./assets/pyodide/pyodide.mjs');
    py = await loadPyodide({ indexURL: new URL('./assets/pyodide/', import.meta.url).href });
    await py.loadPackage('pillow');
    py.FS.writeFile('/font.ttf', new Uint8Array(bytes));
    await py.runPythonAsync(await (await fetch('./render.py')).text());
  } else {
    const face = new FontFace('MarkerNoto', bytes);
    await face.load(); self.fonts.add(face);
    const codec = await import('./assets/jpeg/encode.js');
    await codec.init();
    // init() stores a Promise; force actual instantiation before marking ready.
    await codec.default({ data: new Uint8ClampedArray([0, 0, 0, 255]), width: 1, height: 1 }, { quality: 95 });
    encode = codec.default;
  }
  return { resources: resources(), pillow: py ? py.runPython('PIL.__version__') : null };
}
function validate(s) {
  if (!Number.isInteger(s.size) || s.size < 256 || s.size > 4096) throw new Error('Size outside comparison bounds');
  if (!['donut', 'star', 'solid'].includes(s.shape)) throw new Error('Unknown shape');
  if (/[\r\n]/.test(s.title)) throw new Error('Title must be one line');
  for (const character of s.title) if (!font.charToGlyphIndex(character)) throw new Error(`Missing font glyph: ${character}`);
}
async function render(s) {
  validate(s);
  if (route === 'A') {
    py.globals.set('settings_json', JSON.stringify(s));
    const proxy = py.runPython('render(settings_json)');
    try { return new Uint8Array(proxy.toJs()); } finally { proxy.destroy(); }
  }
  const side = s.size, canvas = new OffscreenCanvas(side, side), ctx = canvas.getContext('2d');
  ctx.fillStyle = s.background; ctx.fillRect(0, 0, side, side);
  if (s.shape === 'donut') {
    ctx.fillStyle = s.shapeColor; ctx.beginPath(); ctx.arc(side/2, side/2, side/2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = s.center; ctx.beginPath(); ctx.arc(side/2, side/2, side*.39, 0, Math.PI*2); ctx.fill();
  } else if (s.shape === 'star') {
    ctx.fillStyle = s.shapeColor; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = side/2*(i%2 ? .45 : 1), a = -Math.PI/2+i*Math.PI/5;
      const x = side/2+r*Math.cos(a), y = side/2+r*Math.sin(a);
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }
  if (s.title) {
    const [bw, bh] = { donut: [.6084, .3042], star: [.6, .25], solid: [.78, .30] }[s.shape];
    let box, stroke, size, low = 4, high = side, chosen;
    while (low <= high) {
      size = Math.floor((low+high)/2);
      ctx.font = `${size}px MarkerNoto`; box = ctx.measureText(s.title); stroke = Math.max(1, Math.floor(size*.045));
      if (box.actualBoundingBoxLeft+box.actualBoundingBoxRight+stroke*2 <= side*bw && box.actualBoundingBoxAscent+box.actualBoundingBoxDescent+stroke*2 <= side*bh) { chosen = { size, box, stroke }; low = size+1; }
      else high = size-1;
    }
    if (!chosen) throw new Error('Title cannot fit');
    ({ size, box, stroke } = chosen);
    ctx.font = `${size}px MarkerNoto`;
    const x = (side-box.actualBoundingBoxLeft-box.actualBoundingBoxRight)/2+box.actualBoundingBoxLeft;
    const y = (side-box.actualBoundingBoxAscent-box.actualBoundingBoxDescent)/2+box.actualBoundingBoxAscent;
    ctx.lineWidth = stroke*2; ctx.strokeStyle = s.outline; ctx.fillStyle = s.text;
    ctx.strokeText(s.title, x, y); ctx.fillText(s.title, x, y);
  }
  const pixels = ctx.getImageData(0, 0, side, side);
  const encoded = new Uint8Array(await encode(pixels, { quality: 95, progressive: false, baseline: true, auto_subsample: false, chroma_subsample: 1 }));
  canvas.width = canvas.height = 1;
  return withExif(encoded, s);
}
self.onmessage = async ({ data }) => {
  try {
    const result = data.type === 'init' ? await initialize(data.route) : data.type === 'hang' ? await new Promise(() => {}) : await render(data.settings);
    if (result instanceof Uint8Array) self.postMessage({ id: data.id, bytes: result, resources: resources() }, [result.buffer]);
    else self.postMessage({ id: data.id, result });
  } catch (error) { self.postMessage({ id: data.id, error: `${error.message || error}\n${error.stack || ''}` }); }
};
