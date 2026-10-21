import * as exifr from "exifr";
import decode from "jpeg-js/lib/decoder.js";
import { ExportError, atStage } from "./errors.mjs";
// This module deliberately does not import any writer or serializer code.
function inspect(bytes) {
  const fail = (m) => {
    throw new ExportError("verification", m);
  };
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length < 10 ||
    bytes.length > 50 * 1024 * 1024 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216
  )
    fail("Invalid or oversized JPEG.");
  let p = 2,
    exif = 0,
    frame,
    scan = false,
    end = false;
  while (p < bytes.length) {
    if (bytes[p++] !== 255) fail("Invalid JPEG marker.");
    while (bytes[p] === 255) p++;
    const m = bytes[p++];
    if (m === 217) {
      end = true;
      break;
    }
    if (scan) {
      if (m === 0 || (m >= 208 && m <= 215)) {
        while (p < bytes.length && bytes[p] !== 255) p++;
        continue;
      }
      fail("Unexpected marker in baseline JPEG scan.");
    }
    if (p + 2 > bytes.length) fail("Truncated JPEG.");
    const n = bytes[p] * 256 + bytes[p + 1];
    if (n < 2 || p + n > bytes.length) fail("Truncated JPEG segment.");
    if (m === 225 && String.fromCharCode(...bytes.subarray(p + 2, p + 8)) === "Exif\0\0") exif++;
    if (m === 192) {
      if (frame || n < 17) fail("Invalid JPEG frame.");
      frame = {
        height: bytes[p + 3] * 256 + bytes[p + 4],
        width: bytes[p + 5] * 256 + bytes[p + 6],
      };
    }
    if (m === 218) {
      scan = true;
      p += n;
      while (p < bytes.length && bytes[p] !== 255) p++;
      continue;
    }
    p += n;
  }
  if (!end || p !== bytes.length || !scan || !frame || exif !== 1)
    fail("JPEG needs a complete image and exactly one EXIF block.");
  if (frame.width < 256 || frame.width > 4096 || frame.width !== frame.height)
    fail("JPEG dimensions are outside supported bounds.");
  return frame;
}
export async function verifyFinal(bytes, settings) {
  return atStage("verification", async () => {
    const dimensions = inspect(bytes);
    if (dimensions.width !== settings.size)
      throw new Error("JPEG dimensions do not match the frozen settings.");
    const tags = await exifr.parse(bytes, {
      translateValues: false,
      reviveValues: false,
      sanitize: false,
      mergeOutput: true,
    });
    for (const tag of ["ModifyDate", "DateTimeOriginal", "CreateDate"])
      if (tags?.[tag] !== settings.timestamp.local)
        throw new Error(`Missing or mismatched ${tag}.`);
    for (const tag of ["OffsetTime", "OffsetTimeOriginal", "OffsetTimeDigitized"])
      if (tags?.[tag] !== settings.timestamp.offset)
        throw new Error(`Missing or mismatched ${tag}.`);
    if (tags.Software !== "Photo markers") throw new Error("Missing or mismatched Software.");
    // Pure byte decoding avoids WebKit's context-offline Blob URL failure.
    const image = decode(bytes, {
      useTArray: true,
      formatAsRGBA: true,
      tolerantDecoding: false,
      maxResolutionInMP: 17,
      maxMemoryUsageInMB: 512,
    });
    if (
      image.width !== settings.size ||
      image.height !== settings.size ||
      image.data.length !== settings.size * settings.size * 4
    )
      throw new Error("JPEG did not decode to the expected pixels.");
    return { width: image.width, height: image.height, tags };
  });
}
