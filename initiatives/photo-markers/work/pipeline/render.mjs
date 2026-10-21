import { parse } from "opentype.js";
import { ExportError } from "./errors.mjs";
const fonts = new Map();
export async function registerFont(key, bytes) {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(key) || fonts.has(key))
    throw new ExportError("font", "Use a new session-local font key.");
  if (
    !(bytes instanceof ArrayBuffer) ||
    bytes.byteLength < 12 ||
    bytes.byteLength > 16 * 1024 * 1024
  )
    throw new ExportError("font", "Font must be a TTF/OTF file no larger than 16 MiB.");
  const signature = new DataView(bytes).getUint32(0);
  if (signature !== 0x00010000 && signature !== 0x4f54544f)
    throw new ExportError("font", "Choose a supported TTF or OTF font.");
  try {
    const parsed = parse(bytes),
      family = "Marker_" + key;
    const face = new FontFace(family, bytes);
    await face.load();
    self.fonts.add(face);
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const record = { parsed, family, face, name: parsed.names.fullName?.en || key, sha256: hash };
    fonts.set(key, record);
    return { key, name: record.name, sha256: hash };
  } catch (error) {
    throw new ExportError("font", "Font could not be parsed and loaded: " + error.message);
  }
}
export function rasterize(s) {
  const font = fonts.get(s.font);
  if (!font) throw new ExportError("font", "Load the selected local font before generating.");
  for (const character of s.title)
    if (!font.parsed.charToGlyphIndex(character))
      throw new ExportError("font", `The selected font has no glyph for ${character}.`);
  const side = s.size,
    canvas = new OffscreenCanvas(side, side),
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ExportError("drawing", "This browser cannot create the image surface.");
  try {
    ctx.fillStyle = s.background_color;
    ctx.fillRect(0, 0, side, side);
    const geometry = {
      shape: s.shape,
      center: [side / 2, side / 2],
      outerRadius: side / 2,
      innerRadius: s.shape === "donut" ? side * 0.39 : null,
    };
    if (s.shape === "donut") {
      ctx.fillStyle = s.shape_color;
      ctx.beginPath();
      ctx.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.center_color;
      ctx.beginPath();
      ctx.arc(side / 2, side / 2, side * 0.39, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.shape === "star") {
      ctx.fillStyle = s.shape_color;
      ctx.beginPath();
      geometry.vertices = [];
      for (let i = 0; i < 10; i++) {
        const r = (side / 2) * (i % 2 ? 0.45 : 1),
          angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = side / 2 + r * Math.cos(angle),
          y = side / 2 + r * Math.sin(angle);
        geometry.vertices.push([x, y]);
        if (!i) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    let layout = null;
    if (s.title) {
      const [bw, bh] = { donut: [0.6084, 0.3042], star: [0.6, 0.25], solid: [0.78, 0.3] }[s.shape];
      const measure = (size) => {
        ctx.font = `${size}px "${font.family}"`;
        const m = ctx.measureText(s.title),
          stroke =
            s.outline_width === "auto" ? Math.max(1, Math.floor(size * 0.045)) : s.outline_width;
        return {
          size,
          m,
          stroke,
          width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight + 2 * stroke,
          height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + 2 * stroke,
        };
      };
      let low = 4,
        high = side,
        best;
      while (low <= high) {
        const candidate = measure(Math.floor((low + high) / 2));
        if (candidate.width <= side * bw && candidate.height <= side * bh) {
          best = candidate;
          low = candidate.size + 1;
        } else high = candidate.size - 1;
      }
      if (!best)
        throw new ExportError(
          "drawing",
          "Title and outline cannot fit at the minimum font size. Shorten the title or reduce the outline.",
        );
      const { size, m, stroke } = best,
        x =
          (side - m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2 + m.actualBoundingBoxLeft,
        y =
          (side - m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 +
          m.actualBoundingBoxAscent;
      ctx.font = `${size}px "${font.family}"`;
      ctx.lineWidth = stroke * 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = s.outline_color;
      ctx.fillStyle = s.text_color;
      if (stroke) ctx.strokeText(s.title, x, y);
      ctx.fillText(s.title, x, y);
      layout = {
        fontSize: size,
        outline: stroke,
        box: [side * bw, side * bh],
        bounds: [
          x - m.actualBoundingBoxLeft - stroke,
          y - m.actualBoundingBoxAscent - stroke,
          x + m.actualBoundingBoxRight + stroke,
          y + m.actualBoundingBoxDescent + stroke,
        ],
      };
    }
    return {
      image: ctx.getImageData(0, 0, side, side),
      geometry,
      layout,
      font: { key: s.font, name: font.name, sha256: font.sha256 },
    };
  } finally {
    canvas.width = canvas.height = 1;
  }
}
