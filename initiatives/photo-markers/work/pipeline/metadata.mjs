// Writer only. The verifier uses exifr and an unrelated JPEG decoder.
import { ExportError } from "./errors.mjs";
export const software = "Photo markers";
export function writeMetadata(jpeg, timestamp) {
  if (!(jpeg instanceof Uint8Array) || jpeg[0] !== 255 || jpeg[1] !== 216)
    throw new ExportError("metadata", "Encoder did not return a JPEG.");
  let p = 2;
  while (p + 4 <= jpeg.length) {
    if (jpeg[p] !== 255) throw new ExportError("metadata", "Malformed encoded JPEG header.");
    const marker = jpeg[p + 1];
    if (marker === 218) break;
    const length = jpeg[p + 2] * 256 + jpeg[p + 3];
    if (length < 2 || p + 2 + length > jpeg.length)
      throw new ExportError("metadata", "Truncated encoded JPEG header.");
    if (marker === 225 && String.fromCharCode(...jpeg.subarray(p + 4, p + 10)) === "Exif\0\0")
      throw new ExportError(
        "metadata",
        "Encoded JPEG already has EXIF; duplicate blocks are forbidden.",
      );
    p += 2 + length;
  }
  const { local, offset } = timestamp;
  if (!/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(local) || !/^[+-]\d{2}:\d{2}$/.test(offset))
    throw new ExportError("metadata", "Invalid timestamp metadata.");
  const root = [
      [305, software],
      [306, local],
    ],
    nested = [
      [36867, local],
      [36868, local],
      [36880, offset],
      [36881, offset],
      [36882, offset],
    ];
  const exifOffset = 50;
  let cursor = exifOffset + 2 + nested.length * 12 + 4;
  const entries = [...root, ...nested].map(([tag, text]) => ({
    tag,
    bytes: new TextEncoder().encode(text + "\0"),
  }));
  const tiff = new Uint8Array(cursor + entries.reduce((n, x) => n + x.bytes.length, 0)),
    view = new DataView(tiff.buffer);
  const u16 = (p, n) => view.setUint16(p, n, true),
    u32 = (p, n) => view.setUint32(p, n, true);
  tiff.set([73, 73, 42, 0]);
  u32(4, 8);
  u16(8, 3);
  function entry(p, x) {
    u16(p, x.tag);
    u16(p + 2, 2);
    u32(p + 4, x.bytes.length);
    u32(p + 8, cursor);
    tiff.set(x.bytes, cursor);
    cursor += x.bytes.length;
  }
  entries.slice(0, 2).forEach((x, i) => entry(10 + i * 12, x));
  u16(34, 34665);
  u16(36, 4);
  u32(38, 1);
  u32(42, exifOffset);
  u16(exifOffset, nested.length);
  entries.slice(2).forEach((x, i) => entry(exifOffset + 2 + i * 12, x));
  const app1 = new Uint8Array(10 + tiff.length),
    length = tiff.length + 8;
  app1.set([255, 225, length >> 8, length & 255, 69, 120, 105, 102, 0, 0]);
  app1.set(tiff, 10);
  const result = new Uint8Array(jpeg.length + app1.length);
  result.set(jpeg.subarray(0, 2));
  result.set(app1, 2);
  result.set(jpeg.subarray(2), 2 + app1.length);
  return result;
}
