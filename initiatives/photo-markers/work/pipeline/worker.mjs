import encode, { init } from "@jsquash/jpeg/encode.js";
import { registerFont, rasterize } from "./render.mjs";
import { validateSnapshot } from "./settings.mjs";
import { writeMetadata } from "./metadata.mjs";
import { verifyFinal } from "./verify.mjs";
import { ExportError, atStage } from "./errors.mjs";
let initialized = false,
  tail = Promise.resolve();
async function handle(m) {
  const progress = (stage) =>
    self.postMessage({
      id: m.id,
      epoch: m.epoch,
      runId: m.runId,
      rowId: m.rowId,
      type: "progress",
      stage,
    });
  try {
    if (m.kind === "init") {
      progress("initialization");
      await atStage("initialization", async () => {
        await init(undefined, { wasmBinary: new Uint8Array(m.wasm), locateFile: (file) => file });
        await encode(
          { data: new Uint8ClampedArray([0, 0, 0, 255]), width: 1, height: 1 },
          { quality: 95 },
        );
      });
      const font = await atStage("font", () => registerFont("noto-bold", m.font));
      for (const f of m.extraFonts || []) await atStage("font", () => registerFont(f.key, f.bytes));
      initialized = true;
      self.postMessage({ id: m.id, epoch: m.epoch, type: "result", result: { font } });
      return;
    }
    if (!initialized) throw new ExportError("initialization", "Prepare the export worker first.");
    if (m.kind === "font") {
      const result = await atStage("font", () => registerFont(m.key, m.bytes));
      self.postMessage({ id: m.id, epoch: m.epoch, type: "result", result });
      return;
    }
    if (m.kind === "preview") {
      const full = validateSnapshot(m.settings);
      const draft = { ...full, size: 320,
        outline_width: full.outline_width === "auto" ? "auto" : full.outline_width * 320 / full.size };
      const { image } = rasterize(draft);
      self.postMessage({ id: m.id, epoch: m.epoch, type: "result", result: { image } }, [image.data.buffer]);
      return;
    }
    if (m.kind !== "export") throw new ExportError("worker", "Unknown worker operation.");
    progress("validation");
    const s = await atStage("validation", () => validateSnapshot(m.settings));
    progress("drawing");
    const raster = await atStage("drawing", () => rasterize(s));
    progress("encoding");
    const jpeg = await atStage(
      "encoding",
      async () =>
        new Uint8Array(
          await encode(raster.image, {
            quality: 95,
            baseline: true,
            progressive: false,
            auto_subsample: false,
            chroma_subsample: 1,
          }),
        ),
    );
    // Release the source raster before independent decoding allocates its pixels.
    raster.image = null;
    progress("metadata");
    const bytes = await atStage("metadata", () => writeMetadata(jpeg, s.timestamp));
    progress("verification");
    const { preview, ...verification } = await verifyFinal(bytes, s, { preview: true });
    const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    self.postMessage(
      {
        id: m.id,
        epoch: m.epoch,
        type: "result",
        result: {
          bytes,
          sha256,
          settings: s,
          verification,
          preview,
          geometry: raster.geometry,
          layout: raster.layout,
          font: raster.font,
        },
      },
      [bytes.buffer, preview.data.buffer],
    );
  } catch (error) {
    self.postMessage({
      id: m.id,
      epoch: m.epoch,
      type: "error",
      error: {
        stage: error.stage || "worker",
        message: error.message || String(error),
        details: error.details,
      },
    });
  }
}
self.onmessage = ({ data }) => {
  tail = tail.then(() => handle(data)).catch(() => {});
};
