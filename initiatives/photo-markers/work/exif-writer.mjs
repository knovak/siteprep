// Narrow TIFF writer for the frozen comparison fixtures; exifr is the reader.
// Only inserts into a new JPEG from our encoder (which has no EXIF APP1).
export function withExif(jpeg, s) {
  if (jpeg[0] !== 255 || jpeg[1] !== 216) throw new Error('Encoder did not return JPEG');
  const strings = [[305, 'Photo markers comparison'], [306, s.local]];
  const exif = [[36867, s.local], [36868, s.local], [36880, s.offset], [36881, s.offset], [36882, s.offset]];
  const ifd0Size = 2 + 3 * 12 + 4;
  const exifOffset = 8 + ifd0Size;
  let cursor = exifOffset + 2 + exif.length * 12 + 4;
  const values = [...strings, ...exif].map(([tag, text]) => ({ tag, value: new TextEncoder().encode(text + '\0') }));
  const tiff = new Uint8Array(cursor + values.reduce((n, x) => n + x.value.length, 0));
  const view = new DataView(tiff.buffer);
  const u16 = (p, n) => view.setUint16(p, n, true);
  const u32 = (p, n) => view.setUint32(p, n, true);
  tiff.set([73, 73, 42, 0]); u32(4, 8);
  function entry(p, x) { u16(p, x.tag); u16(p + 2, 2); u32(p + 4, x.value.length); u32(p + 8, cursor); tiff.set(x.value, cursor); cursor += x.value.length; }
  u16(8, 3);
  values.slice(0, 2).forEach((x, i) => entry(10 + i * 12, x));
  u16(34, 34665); u16(36, 4); u32(38, 1); u32(42, exifOffset);
  u16(exifOffset, exif.length);
  values.slice(2).forEach((x, i) => entry(exifOffset + 2 + i * 12, x));
  const segment = new Uint8Array(10 + tiff.length);
  segment.set([255, 225, (tiff.length + 8) >> 8, (tiff.length + 8) & 255, 69, 120, 105, 102, 0, 0]);
  segment.set(tiff, 10);
  const result = new Uint8Array(jpeg.length + segment.length);
  result.set(jpeg.subarray(0, 2)); result.set(segment, 2); result.set(jpeg.subarray(2), 2 + segment.length);
  return result;
}
