import {readFile, writeFile} from 'node:fs/promises';
import {strFromU8, strToU8, unzipSync, zipSync} from 'fflate';
import {finding, CustodyError} from './findings.mjs';
import {PACKAGE_LIMITS} from './limits.mjs';

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const RESERVED_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

function locateEocd(bytes) {
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) === EOCD) return offset;
  }
  return -1;
}

function safePath(name, seen, limits, findings, path) {
  const normalized = name.normalize('NFC');
  const parts = normalized.split('/');
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.includes('\\') ||
    normalized.includes('\0') ||
    parts.some((part) => part === '..' || part === '.') ||
    parts.length > limits.maxPathDepth ||
    parts.some((part) => RESERVED_WINDOWS.test(part))
  ) {
    findings.push(finding('zip.path.unsafe', path, `Unsafe archive path ${name}`));
  }
  const collisionKey = normalized.toLocaleLowerCase('en-US');
  if (seen.has(collisionKey)) {
    findings.push(finding('zip.path.collision', path, `Archive path collides after normalization: ${name}`));
  }
  seen.add(collisionKey);
  return normalized;
}

export function inspectZip(bytes, limits = PACKAGE_LIMITS) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const findings = [];
  if (buffer.length > limits.maxPackageBytes) {
    findings.push(finding('zip.package.limit', '$', 'Archive exceeds the configured package byte limit'));
    return {entries: [], findings};
  }
  const eocd = locateEocd(buffer);
  if (eocd < 0) {
    return {entries: [], findings: [finding('zip.directory.missing', '$', 'ZIP central directory is missing')]};
  }
  const count = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (count > limits.maxEntries) {
    findings.push(finding('zip.entries.limit', '$', `Archive has ${count} entries; limit is ${limits.maxEntries}`));
  }
  if (centralOffset + centralSize > eocd) {
    findings.push(finding('zip.directory.invalid', '$', 'ZIP central directory is out of bounds'));
    return {entries: [], findings};
  }

  const entries = [];
  const seen = new Set();
  let offset = centralOffset;
  let expanded = 0;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > eocd || buffer.readUInt32LE(offset) !== CENTRAL) {
      findings.push(finding('zip.directory.invalid', `$[${index}]`, 'Invalid ZIP central-directory entry'));
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
    if (next > eocd) {
      findings.push(finding('zip.directory.invalid', `$[${index}]`, 'ZIP entry metadata is out of bounds'));
      break;
    }
    const originalName = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    const name = safePath(originalName, seen, limits, findings, `$[${index}].name`);
    const unixMode = externalAttributes >>> 16;
    const fileType = unixMode & 0o170000;
    if (fileType && fileType !== 0o100000 && fileType !== 0o040000) {
      findings.push(finding('zip.entry.link', `$[${index}]`, `Links and special files are not accepted: ${name}`));
    }
    if (![0, 8].includes(method)) {
      findings.push(finding('zip.method.unsupported', `$[${index}]`, `Compression method ${method} is unsupported`));
    }
    if (size > limits.maxEntryBytes) {
      findings.push(finding('zip.entry.limit', `$[${index}]`, `${name} exceeds the per-entry byte limit`));
    }
    const ratio = size / Math.max(1, compressedSize);
    if (ratio > limits.maxCompressionRatio) {
      findings.push(finding('zip.ratio.limit', `$[${index}]`, `${name} exceeds the compression-ratio limit`));
    }
    expanded += size;
    entries.push({name, size, compressedSize, method});
    offset = next;
  }
  if (expanded > limits.maxExpandedBytes) {
    findings.push(finding('zip.expanded.limit', '$', 'Archive exceeds the total expanded-byte limit'));
  }
  return {entries, findings};
}

export async function writeZip(path, files) {
  const encoded = {};
  for (const [name, value] of Object.entries(files)) {
    encoded[name] = typeof value === 'string' ? strToU8(value) : value;
  }
  await writeFile(path, zipSync(encoded, {level: 0}));
}

export async function readZip(path, limits = PACKAGE_LIMITS) {
  const bytes = await readFile(path);
  const inspected = inspectZip(bytes, limits);
  if (inspected.findings.some(({severity}) => severity === 'error')) {
    throw new CustodyError(inspected.findings, 'Unsafe package archive');
  }
  const raw = unzipSync(bytes);
  const files = {};
  for (const entry of inspected.entries) {
    files[entry.name] = raw[entry.name];
  }
  return files;
}

export function utf8(bytes) {
  return strFromU8(bytes);
}
