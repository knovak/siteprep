import {deflateSync} from 'node:zlib';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {canonicalJson, sha256} from './canonical.mjs';
import {legendEntry} from './renderer.mjs';
import {buildTemporalFrame} from './temporal.mjs';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SOS_GUIDELINES =
  'https://sos.noaa.gov/support/sos/manuals/content-creation-guidelines/all/';
const SOS_PLAYLIST_REFERENCE =
  'https://sos.noaa.gov/support/sos/manuals/playlist-format/';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const target = y * (width * 4 + 1);
    scanlines[target] = 0;
    rgba.copy(scanlines, target + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, {level: 9})),
    pngChunk('IEND'),
  ]);
}

function parseColor(value) {
  const match = /^#([0-9a-f]{6})$/iu.exec(value ?? '');
  if (!match) throw new TypeError(`Unsupported color ${value}`);
  const number = Number.parseInt(match[1], 16);
  return [(number >>> 16) & 255, (number >>> 8) & 255, number & 255, 255];
}

function setPixel(rgba, width, height, x, y, color) {
  const column = ((Math.round(x) % width) + width) % width;
  const row = Math.round(y);
  if (row < 0 || row >= height) return;
  rgba.set(color, (row * width + column) * 4);
}

function fill(rgba, color) {
  for (let offset = 0; offset < rgba.length; offset += 4)
    rgba.set(color, offset);
}

function project([longitude, latitude], width, height) {
  return [((longitude + 180) / 360) * width, ((90 - latitude) / 180) * height];
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const [xi, yi] = polygon[current];
    const [xj, yj] = polygon[previous];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function drawPolygon(rgba, width, height, coordinates, color) {
  const polygon = coordinates.map((point) => project(point, width, height));
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const left = Math.max(0, Math.floor(Math.min(...xs)));
  const right = Math.min(width - 1, Math.ceil(Math.max(...xs)));
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const bottom = Math.min(height - 1, Math.ceil(Math.max(...ys)));
  for (let y = top; y <= bottom; y += 1)
    for (let x = left; x <= right; x += 1)
      if (pointInPolygon(x + 0.5, y + 0.5, polygon)) setPixel(rgba, width, height, x, y, color);
}

function drawCircle(rgba, width, height, coordinates, radius, color) {
  const [centerX, centerY] = project(coordinates, width, height);
  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1)
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1)
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2)
        setPixel(rgba, width, height, x, y, color);
}

function drawLine(rgba, width, height, start, end, color) {
  let [x0, y0] = project(start, width, height).map(Math.round);
  const [x1, y1] = project(end, width, height).map(Math.round);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    setPixel(rgba, width, height, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x0 += sx;
    }
    if (twice <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function renderFrame({rendererFixture, temporalFrame, width, height}) {
  const rgba = Buffer.alloc(width * height * 4);
  fill(rgba, parseColor('#0b2740'));
  const population = temporalFrame.layers.find(({id}) => id === 'layer:population-through-time');
  const populationDataset = rendererFixture.datasets.find(({id}) => id === 'dataset:population');
  const records = new Map((population?.records ?? []).map((record) => [record.id, record]));
  for (const feature of rendererFixture.geography.features) {
    const record = records.get(feature.id) ?? feature.properties;
    const entry = legendEntry(populationDataset, record.value, record.status);
    drawPolygon(rgba, width, height, feature.geometry.coordinates[0], parseColor(entry.color));
  }
  for (const layer of temporalFrame.layers) {
    if (layer.kind === 'flow') {
      for (const record of layer.records)
        if (!['missing', 'unavailable', 'outside-range'].includes(record.status))
          drawLine(rgba, width, height, record.fromCoordinates, record.toCoordinates, parseColor(layer.color));
    } else if (layer.kind === 'points') {
      for (const record of layer.records)
        if (record.status !== 'outside-range')
          drawCircle(rgba, width, height, record.coordinates, Math.max(2, width / 512), parseColor(layer.color));
    } else if (layer.kind === 'scalar' && layer.overlay) {
      for (const record of layer.records) {
        const feature = rendererFixture.geography.features.find(({id}) => id === record.id);
        if (!feature) continue;
        const ring = feature.geometry.coordinates[0];
        const longitude = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
        const latitude = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
        drawCircle(rgba, width, height, [longitude, latitude], Math.max(2, width / 410), parseColor(layer.color));
      }
    }
  }
  return encodePng(width, height, rgba);
}

function activeCatalogue(scene, catalogue) {
  return scene.layers.map((layer) =>
    catalogue.find((candidate) => candidate.id === layer.layerId && candidate.revision === layer.datasetRevision),
  );
}

export function createSphereConversionReport({scene, catalogue, temporalFixture}) {
  const losses = [];
  if (!['equal-earth', 'airocean'].includes(scene.projection))
    losses.push({kind: 'projection', id: scene.projection, disposition: 'unsupported; no frame package emitted'});
  losses.push({kind: 'interaction', id: 'camera-selection-and-inspection', disposition: 'replaced by complete 180W–180E, 90N–90S frames and external context files'});
  losses.push({kind: 'typography', id: 'browser-interface-copy', disposition: 'kept outside the texture in legend.svg, attribution.txt, and index.html'});
  for (const layer of temporalFixture.layers.filter(({id}) => scene.app?.layerIds?.includes(id))) {
    if (layer.kind === 'raster')
      losses.push({kind: 'layer', id: layer.id, disposition: 'unsupported until a prepared equidistant cylindrical raster exists'});
  }
  for (const item of activeCatalogue(scene, catalogue)) {
    if (!item) {
      losses.push({kind: 'layer', id: 'unknown catalogue revision', disposition: 'unsupported; catalogue revision is missing'});
    } else if (item.rights.status !== 'redistributable') {
      losses.push({kind: 'live-asset', id: item.assetId, disposition: `omitted; ${item.rights.limitation}`});
    }
  }
  return {
    schema: 'educational-global-maps/sphere-conversion-report/v1',
    sourceScene: scene.sceneId,
    sourceProjection: scene.projection,
    targetProjection: 'equatorial-cylindrical-equidistant',
    compatible: !losses.some(({disposition}) => disposition.startsWith('unsupported;')),
    preserved: ['pinned dataset revisions', 'scene periods', 'missing-data encodings', 'legend', 'attribution', 'citations', 'ordered timing'],
    losses,
    unproved: ['physical sphere seam and orientation', 'projector legibility', 'installation operator workflow'],
  };
}

function legendSvg(rendererFixture) {
  const entries = rendererFixture.datasets.find(({id}) => id === 'dataset:population').legend;
  const rows = entries.map((entry, index) =>
    `<rect x="16" y="${16 + index * 34}" width="22" height="22" fill="${entry.color}"/><text x="50" y="${32 + index * 34}" fill="#eaf6ff" font-family="system-ui,sans-serif" font-size="18">${entry.label}</text>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${32 + entries.length * 34}" viewBox="0 0 720 ${32 + entries.length * 34}" role="img" aria-label="Population legend"><rect width="100%" height="100%" fill="#0b2740"/>${rows}</svg>\n`;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function viewerHtml({scene, frames, report}) {
  const options = frames.map(({label}, index) => `<option value="${index}">${escapeHtml(label)}</option>`).join('');
  const losses = report.losses.map(({kind, id, disposition}) => `<li><strong>${escapeHtml(kind)} — ${escapeHtml(id)}:</strong> ${escapeHtml(disposition)}</li>`).join('');
  const citations = scene.claims.flatMap(({sources}) => sources).map(({title, url}) => `<li><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></li>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(scene.title)} sphere export</title><style>body{margin:0;background:#071827;color:#eaf6ff;font:16px system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px}img{display:block;width:100%;aspect-ratio:2/1;object-fit:contain;background:#0b2740;border:1px solid #476b88}label,select{font:inherit}a{color:#7fe2ff}.context{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media(max-width:700px){.context{grid-template-columns:1fr}}</style><main><h1>${escapeHtml(scene.title)}</h1><p>Flat equatorial cylindrical equidistant preview. Direct sphere hardware behavior is unproved.</p><label>Frame <select id="frame">${options}</select></label><img id="preview" src="${frames[0].path}" alt="Equirectangular map frame"><div class="context"><section><h2>Conversion report</h2><ul>${losses}</ul></section><section><h2>Citations</h2><ul>${citations}</ul><p><a href="manifest.json">Manifest</a> · <a href="playlist.sos">SOS playlist</a> · <a href="attribution.txt">Attribution</a></p></section></div></main><script>const frames=${JSON.stringify(frames.map(({path}) => path))};document.querySelector('#frame').addEventListener('change',event=>{document.querySelector('#preview').src=frames[Number(event.target.value)]});</script></html>`;
}

async function fileRecord(directory, path, mediaType) {
  const bytes = await readFile(join(directory, path));
  return {path, mediaType, bytes: bytes.length, checksum: sha256(bytes)};
}

export async function writeSpherePackage({directory, scene, catalogue, rendererFixture, temporalFixture, width = 2048, height = 1024, fps = 1, createdAt = '2026-09-03T00:00:00.000Z'}) {
  if (width !== height * 2 || !Number.isInteger(width) || !Number.isInteger(height))
    throw new TypeError('Sphere frames must use an integer 2:1 extent');
  if (!(fps >= 0.1 && fps <= 100000)) throw new TypeError('SOS frame rate is out of range');
  const report = createSphereConversionReport({scene, catalogue, temporalFixture});
  if (!report.compatible) return {status: 'refused', report};
  const activeLayerIds = scene.app?.layerIds ?? [];
  await mkdir(join(directory, 'frames'), {recursive: true});
  const frames = [];
  for (const [index, time] of temporalFixture.timeline.entries()) {
    const temporalFrame = buildTemporalFrame(temporalFixture, {time, projection: 'equal-earth', activeLayerIds});
    if (temporalFrame.status !== 'accepted')
      throw new Error(`Sphere frame ${time} was refused: ${canonicalJson(temporalFrame.findings)}`);
    const filename = `egm_${width}.${String(index + 1).padStart(4, '0')}.png`;
    const path = `frames/${filename}`;
    await writeFile(join(directory, path), renderFrame({rendererFixture, temporalFrame, width, height}));
    frames.push({path, label: time, actualPeriods: temporalFrame.layers.map(({id, actualPeriod}) => ({layerId: id, actualPeriod}))});
  }
  const citations = [...new Map(scene.claims.flatMap(({sources}) => sources).map((source) => [source.url, source])).values()];
  const attribution = [
    scene.title,
    ...activeCatalogue(scene, catalogue).filter(Boolean).map((item) => `${item.title}: ${item.citation.title} (${item.citation.url}), ${item.citation.rights}, revision ${item.citation.revision}`),
    ...citations.map((source) => `${source.title}: ${source.url}`),
  ].join('\n');
  const playlist = [
    `name = ${scene.title}`,
    'data = frames',
    'creator = Siteprep Educational Global Maps',
    'subcategory = education',
    'keywords = education,maps,population',
    `description = {{ ${scene.summary.replaceAll(/[{}\r\n]/gu, ' ')} }}`,
    `fps = ${fps}`,
    `framewidth = ${width}`,
    'label = labels.txt',
    '',
  ].join('\n');
  await Promise.all([
    writeFile(join(directory, 'labels.txt'), `${frames.map(({label}) => label).join('\n')}\n`),
    writeFile(join(directory, 'playlist.sos'), playlist),
    writeFile(join(directory, 'legend.svg'), legendSvg(rendererFixture)),
    writeFile(join(directory, 'attribution.txt'), `${attribution}\n`),
    writeFile(join(directory, 'conversion-report.json'), `${canonicalJson(report)}\n`),
    writeFile(join(directory, 'index.html'), viewerHtml({scene, frames, report})),
  ]);
  const mediaTypes = new Map([
    ['labels.txt', 'text/plain'], ['playlist.sos', 'text/plain'], ['legend.svg', 'image/svg+xml'],
    ['attribution.txt', 'text/plain'], ['conversion-report.json', 'application/json'], ['index.html', 'text/html'],
  ]);
  const filePaths = [...frames.map(({path}) => path), ...mediaTypes.keys()].sort();
  const files = [];
  for (const path of filePaths)
    files.push(await fileRecord(directory, path, path.endsWith('.png') ? 'image/png' : mediaTypes.get(path)));
  const manifest = {
    schema: 'educational-global-maps/sphere-package/v1',
    createdAt,
    sceneId: scene.sceneId,
    projection: {name: 'equatorial-cylindrical-equidistant', longitudeAtCenter: 0, extent: ['180W', '180E', '90N', '90S']},
    frame: {width, height, ratio: '2:1', fps, count: frames.length},
    frames,
    files,
    profile: {
      target: 'NOAA Science On a Sphere site-custom dataset',
      reviewedAt: '2026-09-03',
      documentation: [SOS_GUIDELINES, SOS_PLAYLIST_REFERENCE],
      validation: 'local manifest, PNG structure, 2:1 extent, labels, and playlist checks; SOS installation unavailable',
    },
  };
  await writeFile(join(directory, 'manifest.json'), `${canonicalJson(manifest)}\n`);
  return {status: 'accepted', manifest, report};
}

export async function verifySpherePackage(directory) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  const findings = [];
  if (manifest.schema !== 'educational-global-maps/sphere-package/v1') findings.push('sphere.manifest.schema');
  if (manifest.frame.width !== manifest.frame.height * 2) findings.push('sphere.frame.ratio');
  for (const file of manifest.files) {
    let bytes;
    try {
      bytes = await readFile(join(directory, file.path));
    } catch {
      findings.push(`sphere.file.missing:${file.path}`);
      continue;
    }
    if (sha256(bytes) !== file.checksum) findings.push(`sphere.file.checksum:${file.path}`);
    if (file.mediaType === 'image/png') {
      if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) findings.push(`sphere.frame.png:${file.path}`);
      if (bytes.length >= 24 && (bytes.readUInt32BE(16) !== manifest.frame.width || bytes.readUInt32BE(20) !== manifest.frame.height))
        findings.push(`sphere.frame.extent:${file.path}`);
    }
  }
  const labels = (await readFile(join(directory, 'labels.txt'), 'utf8')).trimEnd().split('\n');
  if (labels.length !== manifest.frame.count) findings.push('sphere.labels.count');
  const playlist = await readFile(join(directory, 'playlist.sos'), 'utf8');
  for (const required of ['name = ', 'data = frames', `fps = ${manifest.frame.fps}`, `framewidth = ${manifest.frame.width}`])
    if (!playlist.includes(required)) findings.push(`sphere.playlist.required:${required.trim()}`);
  return {status: findings.length ? 'refused' : 'accepted', findings, manifest};
}
