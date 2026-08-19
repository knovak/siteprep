function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('Image bytes must be an ArrayBuffer or Uint8Array');
}

export async function sha256Hex(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : bytesOf(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function extensionFor(contentType) {
  return ({
    'image/avif': 'avif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  })[contentType] ?? 'bin';
}

export class R2CaptureImages {
  constructor(bucket) {
    if (!bucket?.put || !bucket?.get) throw new TypeError('An R2 bucket binding is required');
    this.bucket = bucket;
  }

  async putDerivative({urlKey, bytes, contentType, width, height, imageHash}) {
    const body = bytesOf(bytes);
    const urlHash = await sha256Hex(urlKey);
    const key = `captures/${urlHash.slice(0, 2)}/${urlHash}/${imageHash}.${extensionFor(contentType)}`;
    await this.bucket.put(key, body, {
      httpMetadata: {contentType},
      customMetadata: {
        urlKey,
        imageHash,
        width: String(width),
        height: String(height),
        derivative: 'true',
      },
    });
    return key;
  }

  async get(imageRef) {
    return this.bucket.get(imageRef);
  }
}

export class MemoryCaptureImages {
  objects = new Map();

  async putDerivative({urlKey, bytes, contentType, width, height, imageHash}) {
    const body = bytesOf(bytes).slice();
    const key = `memory/${await sha256Hex(urlKey)}/${imageHash}.${extensionFor(contentType)}`;
    this.objects.set(key, {body, contentType, width, height, imageHash, urlKey, derivative: true});
    return key;
  }

  async get(imageRef) {
    const stored = this.objects.get(imageRef);
    if (!stored) return null;
    return {
      body: stored.body.slice(),
      httpMetadata: {contentType: stored.contentType},
      customMetadata: {
        width: String(stored.width),
        height: String(stored.height),
        imageHash: stored.imageHash,
        derivative: 'true',
      },
    };
  }
}
