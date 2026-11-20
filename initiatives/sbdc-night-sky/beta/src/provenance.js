export function settingsReference(text) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function embedSettings(png, yaml) {
  const encoded = new TextEncoder().encode("SBDC settings\0\0\0\0\0" + yaml);
  const chunk = new Uint8Array(encoded.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, encoded.length);
  chunk.set([105, 84, 88, 116], 4);
  chunk.set(encoded, 8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  view.setUint32(chunk.length - 4, ~crc >>> 0);
  return new Blob([png.slice(0, -12), chunk, png.slice(-12)], { type: "image/png" });
}
