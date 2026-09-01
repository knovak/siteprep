import {readFile, writeFile} from 'node:fs/promises';
import {strFromU8, strToU8, unzipSync, zipSync} from 'fflate';
import {canonicalJson, contentIdentity, deepClone, parseJsonStrict, sha256} from './canonical.mjs';
import {BUNDLE_LIMITS} from './limits.mjs';
import {assertNoErrors, finding, SceneCoreError} from './findings.mjs';
import {trustedInventory, validateInventory} from './validate.mjs';

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const MANIFEST_FIELDS = new Set(['format', 'bundleId', 'createdAt', 'rootScene', 'objects', 'assets']);
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function findEocd(buffer) {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD) return offset;
  }
  return -1;
}

function inspectPath(name, seen, limits, findings, path) {
  const normalized = name.normalize('NFC');
  const parts = normalized.split('/');
  if (
    !normalized || normalized.startsWith('/') || /^[A-Za-z]:/u.test(normalized) ||
    normalized.includes('\\') || normalized.includes('\0') ||
    parts.some((part) => part === '.' || part === '..' || RESERVED.test(part)) ||
    parts.length > limits.maxPathDepth
  ) findings.push(finding('bundle.path.unsafe', path, `Unsafe archive path ${name}`));
  const collision = normalized.toLocaleLowerCase('en-US');
  if (seen.has(collision)) findings.push(finding('bundle.path.collision', path, `Archive path collides after normalization: ${name}`));
  seen.add(collision);
  return normalized;
}

export function inspectZip(bytes, limits = BUNDLE_LIMITS) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const findings = [];
  if (buffer.byteLength > limits.maxPackageBytes) {
    return {entries: [], findings: [finding('bundle.package.limit', '$', 'Archive exceeds package byte limit')]};
  }
  const eocd = findEocd(buffer);
  if (eocd < 0) return {entries: [], findings: [finding('bundle.directory.missing', '$', 'ZIP central directory is missing')]};
  const count = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (count > limits.maxEntries) findings.push(finding('bundle.entries.limit', '$', `Archive entry count ${count} exceeds ${limits.maxEntries}`));
  if (centralOffset + centralSize > eocd) return {entries: [], findings: [finding('bundle.directory.invalid', '$', 'ZIP central directory is out of bounds')]};
  const entries = [];
  const seen = new Set();
  let expanded = 0;
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    const path = `$.entries[${index}]`;
    if (offset + 46 > eocd || buffer.readUInt32LE(offset) !== CENTRAL) {
      findings.push(finding('bundle.directory.invalid', path, 'Invalid central-directory entry'));
      break;
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > eocd) { findings.push(finding('bundle.directory.invalid', path, 'ZIP metadata is out of bounds')); break; }
    const name = inspectPath(buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'), seen, limits, findings, `${path}.name`);
    const fileType = (externalAttributes >>> 16) & 0o170000;
    if (fileType && fileType !== 0o100000 && fileType !== 0o040000) findings.push(finding('bundle.entry.special', path, `Links and special files are not accepted: ${name}`));
    if (![0, 8].includes(method)) findings.push(finding('bundle.method.unsupported', path, `Compression method ${method} is unsupported`));
    if (size > limits.maxEntryBytes) findings.push(finding('bundle.entry.limit', path, `${name} exceeds per-entry byte limit`));
    if (size / Math.max(1, compressedSize) > limits.maxCompressionRatio) findings.push(finding('bundle.ratio.limit', path, `${name} exceeds compression-ratio limit`));
    expanded += size;
    entries.push({name, size, compressedSize, method});
    offset = next;
  }
  if (expanded > limits.maxExpandedBytes) findings.push(finding('bundle.expanded.limit', '$', 'Archive exceeds expanded-byte limit'));
  return {entries, findings};
}

export function createManifest(fixture, createdAt = '2026-09-01T00:00:00.000Z') {
  const inventory = trustedInventory(fixture);
  assertNoErrors(validateInventory(inventory));
  const assets = inventory.assets.map((asset) => {
    const metadata = {...asset, bundled: asset.redistributable !== false};
    delete metadata.bytes;
    return metadata;
  });
  const logical = {
    format: 'educational-global-maps/bundle/v1',
    createdAt,
    rootScene: fixture.rootScene,
    objects: inventory.objects,
    assets,
  };
  return {bundleId: `bundle:${contentIdentity(logical).slice(7, 39)}`, ...logical};
}

export function validateManifest(manifest) {
  const findings = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return [finding('manifest.type', '$', 'Manifest must be an object')];
  for (const key of MANIFEST_FIELDS) if (!(key in manifest)) findings.push(finding('manifest.field.required', `$.${key}`, `Required manifest field ${key} is absent`));
  for (const key of Object.keys(manifest)) if (!MANIFEST_FIELDS.has(key)) findings.push(finding('manifest.field.unknown', `$.${key}`, `Unknown manifest field ${key}`));
  if (manifest.format !== 'educational-global-maps/bundle/v1') findings.push(finding('manifest.version.unsupported', '$.format', `Unsupported manifest format ${manifest.format}`));
  if (!TIMESTAMP.test(manifest.createdAt ?? '')) findings.push(finding('time.timestamp.noncanonical', '$.createdAt', 'Manifest timestamp must use UTC millisecond precision'));
  if (!(manifest.objects ?? []).some(({id}) => id === manifest.rootScene)) findings.push(finding('manifest.scene.missing', '$.rootScene', 'Root scene is absent from object inventory'));
  const logical = deepClone(manifest);
  delete logical.bundleId;
  const expected = `bundle:${contentIdentity(logical).slice(7, 39)}`;
  if (manifest.bundleId !== expected) findings.push(finding('manifest.identity.mismatch', '$.bundleId', 'Bundle id does not match canonical manifest content'));
  return findings;
}

export async function writeBundle(path, fixture, options = {}) {
  const manifest = createManifest(fixture, options.createdAt);
  assertNoErrors(validateManifest(manifest));
  const files = {'manifest.json': strToU8(canonicalJson(manifest))};
  for (const asset of fixture.assets) {
    if (asset.redistributable === false) continue;
    files[asset.path] = Buffer.from(asset.bytes, 'base64');
  }
  await writeFile(path, zipSync(files, {level: 0}));
  return manifest;
}

export async function readBundle(path, limits = BUNDLE_LIMITS) {
  const bytes = await readFile(path);
  const inspected = inspectZip(bytes, limits);
  assertNoErrors(inspected.findings, 'Unsafe scene bundle');
  const files = unzipSync(bytes);
  if (!files['manifest.json']) throw new SceneCoreError([finding('manifest.missing', '$', 'manifest.json is required')]);
  if (files['manifest.json'].byteLength > limits.maxManifestBytes) throw new SceneCoreError([finding('manifest.limit', '$', 'Manifest exceeds byte limit')]);
  let manifest;
  try {
    manifest = parseJsonStrict(strFromU8(files['manifest.json']));
  } catch (error) {
    throw new SceneCoreError([finding(error.code ?? 'manifest.json.invalid', error.path ?? '$', error.message)]);
  }
  assertNoErrors(validateManifest(manifest));
  const assets = manifest.assets.map((metadata) => {
    const asset = {...metadata};
    delete asset.bundled;
    if (metadata.redistributable !== false) {
      const assetBytes = files[metadata.path];
      if (!assetBytes || assetBytes.byteLength !== metadata.size || sha256(assetBytes) !== metadata.hash) {
        throw new SceneCoreError([finding('asset.checksum.mismatch', `$.assets.${metadata.id}`, `Bundled asset ${metadata.id} is absent or does not match its checksum`)]);
      }
      asset.bytes = Buffer.from(assetBytes).toString('base64');
    }
    return asset;
  });
  const inventory = trustedInventory({objects: manifest.objects, assets});
  assertNoErrors(validateInventory(inventory));
  return {manifest, inventory, findings: inspected.findings};
}
