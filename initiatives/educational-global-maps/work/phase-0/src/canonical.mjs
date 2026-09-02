import {createHash} from 'node:crypto';

export class CanonicalError extends Error {
  constructor(code, message, path = '$') {
    super(message);
    this.name = 'CanonicalError';
    this.code = code;
    this.path = path;
  }
}

function normalize(value, path, seen) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.normalize('NFC');
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalError('canonical.number.non_finite', `${path} must be finite`, path);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new CanonicalError('canonical.cycle', `${path} contains a cycle`, path);
    seen.add(value);
    const result = value.map((item, index) => normalize(item, `${path}[${index}]`, seen));
    seen.delete(value);
    return result;
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) throw new CanonicalError('canonical.cycle', `${path} contains a cycle`, path);
    seen.add(value);
    const normalizedKeys = new Map();
    for (const rawKey of Object.keys(value)) {
      const key = rawKey.normalize('NFC');
      if (normalizedKeys.has(key)) {
        throw new CanonicalError(
          'canonical.key.normalization_collision',
          `${path} contains keys that collide after NFC normalization`,
          path,
        );
      }
      normalizedKeys.set(key, rawKey);
    }
    const result = {};
    for (const key of [...normalizedKeys.keys()].sort()) {
      const item = value[normalizedKeys.get(key)];
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint') {
        throw new CanonicalError('canonical.value.unsupported', `${path}.${key} is not portable JSON`, `${path}.${key}`);
      }
      result[key] = normalize(item, `${path}.${key}`, seen);
    }
    seen.delete(value);
    return result;
  }
  throw new CanonicalError('canonical.value.unsupported', `${path} is not portable JSON`, path);
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value, '$', new Set()));
}

export function deepClone(value) {
  return JSON.parse(canonicalJson(value));
}

export function sha256(bytes) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function contentIdentity(value) {
  return sha256(Buffer.from(canonicalJson(value), 'utf8'));
}

function strictScan(source) {
  let offset = 0;
  const whitespace = /\s/u;
  const skipWhitespace = () => {
    while (whitespace.test(source[offset] ?? '')) offset += 1;
  };
  const parseString = (path) => {
    if (source[offset] !== '"') throw new CanonicalError('json.syntax', `Expected string at ${path}`, path);
    const start = offset;
    offset += 1;
    let escaped = false;
    while (offset < source.length) {
      const character = source[offset];
      offset += 1;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') {
        try {
          return JSON.parse(source.slice(start, offset));
        } catch {
          throw new CanonicalError('json.syntax', `Invalid string at ${path}`, path);
        }
      }
    }
    throw new CanonicalError('json.syntax', `Unterminated string at ${path}`, path);
  };
  const parseValue = (path) => {
    skipWhitespace();
    const character = source[offset];
    if (character === '{') {
      offset += 1;
      skipWhitespace();
      const rawKeys = new Set();
      const normalizedKeys = new Set();
      if (source[offset] === '}') { offset += 1; return; }
      while (offset < source.length) {
        skipWhitespace();
        const key = parseString(path);
        if (rawKeys.has(key)) throw new CanonicalError('json.duplicate_key', `Duplicate key ${key}`, `${path}.${key}`);
        rawKeys.add(key);
        const normalized = key.normalize('NFC');
        if (normalizedKeys.has(normalized)) {
          throw new CanonicalError(
            'json.key.normalization_collision',
            `Keys collide after NFC normalization at ${path}`,
            path,
          );
        }
        normalizedKeys.add(normalized);
        skipWhitespace();
        if (source[offset] !== ':') throw new CanonicalError('json.syntax', `Expected : after ${key}`, `${path}.${key}`);
        offset += 1;
        parseValue(`${path}.${key}`);
        skipWhitespace();
        if (source[offset] === '}') { offset += 1; return; }
        if (source[offset] !== ',') throw new CanonicalError('json.syntax', `Expected , or } at ${path}`, path);
        offset += 1;
      }
      throw new CanonicalError('json.syntax', `Unterminated object at ${path}`, path);
    }
    if (character === '[') {
      offset += 1;
      skipWhitespace();
      if (source[offset] === ']') { offset += 1; return; }
      let index = 0;
      while (offset < source.length) {
        parseValue(`${path}[${index}]`);
        index += 1;
        skipWhitespace();
        if (source[offset] === ']') { offset += 1; return; }
        if (source[offset] !== ',') throw new CanonicalError('json.syntax', `Expected , or ] at ${path}`, path);
        offset += 1;
      }
      throw new CanonicalError('json.syntax', `Unterminated array at ${path}`, path);
    }
    if (character === '"') { parseString(path); return; }
    const primitive = source.slice(offset).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u)?.[0];
    if (!primitive) throw new CanonicalError('json.syntax', `Invalid value at ${path}`, path);
    if (/^-|^\d/u.test(primitive) && (/^-0(?:\D|$)/u.test(primitive) || /[eE]/u.test(primitive))) {
      throw new CanonicalError('json.number.ambiguous', `Ambiguous number spelling ${primitive}`, path);
    }
    offset += primitive.length;
  };
  parseValue('$');
  skipWhitespace();
  if (offset !== source.length) throw new CanonicalError('json.syntax', 'Unexpected trailing data', '$');
}

export function parseJsonStrict(text) {
  const source = String(text);
  strictScan(source);
  return JSON.parse(source);
}
