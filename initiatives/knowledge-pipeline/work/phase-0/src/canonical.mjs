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
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalError('canonical.non_finite', `${path} must be finite`, path);
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new CanonicalError('canonical.cycle', `${path} contains a cycle`, path);
    }
    seen.add(value);
    const result = value.map((item, index) => normalize(item, `${path}[${index}]`, seen));
    seen.delete(value);
    return result;
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      throw new CanonicalError('canonical.cycle', `${path} contains a cycle`, path);
    }
    seen.add(value);
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
        throw new CanonicalError(
          'canonical.unsupported_value',
          `${path}.${key} has no portable JSON representation`,
          `${path}.${key}`,
        );
      }
      result[key] = normalize(item, `${path}.${key}`, seen);
    }
    seen.delete(value);
    return result;
  }

  throw new CanonicalError(
    'canonical.unsupported_value',
    `${path} has no portable JSON representation`,
    path,
  );
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value, '$', new Set()));
}

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function contentIdentity(value) {
  return sha256(canonicalJson(value));
}

export function deepClone(value) {
  return JSON.parse(canonicalJson(value));
}

export function parseJsonStrict(text) {
  let offset = 0;
  const source = String(text);
  const whitespace = /\s/;

  const skipWhitespace = () => {
    while (whitespace.test(source[offset] ?? '')) offset += 1;
  };

  const parseStringToken = (path) => {
    if (source[offset] !== '"') {
      throw new CanonicalError('json.syntax', `Expected a string at ${path}`, path);
    }
    const start = offset;
    offset += 1;
    let escaped = false;
    while (offset < source.length) {
      const character = source[offset];
      offset += 1;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
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
      const keys = new Set();
      if (source[offset] === '}') {
        offset += 1;
        return;
      }
      while (offset < source.length) {
        skipWhitespace();
        const key = parseStringToken(path);
        if (keys.has(key)) {
          throw new CanonicalError('json.duplicate_key', `Duplicate key ${key} at ${path}`, `${path}.${key}`);
        }
        keys.add(key);
        skipWhitespace();
        if (source[offset] !== ':') {
          throw new CanonicalError('json.syntax', `Expected : after ${path}.${key}`, `${path}.${key}`);
        }
        offset += 1;
        parseValue(`${path}.${key}`);
        skipWhitespace();
        if (source[offset] === '}') {
          offset += 1;
          return;
        }
        if (source[offset] !== ',') {
          throw new CanonicalError('json.syntax', `Expected , or } at ${path}`, path);
        }
        offset += 1;
      }
      throw new CanonicalError('json.syntax', `Unterminated object at ${path}`, path);
    }
    if (character === '[') {
      offset += 1;
      skipWhitespace();
      if (source[offset] === ']') {
        offset += 1;
        return;
      }
      let index = 0;
      while (offset < source.length) {
        parseValue(`${path}[${index}]`);
        index += 1;
        skipWhitespace();
        if (source[offset] === ']') {
          offset += 1;
          return;
        }
        if (source[offset] !== ',') {
          throw new CanonicalError('json.syntax', `Expected , or ] at ${path}`, path);
        }
        offset += 1;
      }
      throw new CanonicalError('json.syntax', `Unterminated array at ${path}`, path);
    }
    if (character === '"') {
      parseStringToken(path);
      return;
    }
    const primitive = source.slice(offset).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[0];
    if (!primitive) {
      throw new CanonicalError('json.syntax', `Invalid value at ${path}`, path);
    }
    offset += primitive.length;
  };

  parseValue('$');
  skipWhitespace();
  if (offset !== source.length) {
    throw new CanonicalError('json.syntax', 'Unexpected data after JSON value', '$');
  }
  return JSON.parse(source);
}
