import { captureRun, resolveSettings, freeze } from "./settings.mjs";
import { ExportError } from "./errors.mjs";
export { captureRun, resolveSettings, ExportError };
export class ExportPipeline {
  constructor({
    onProgress = () => {},
    timeout = 30000,
    workerFactory = (url) => new Worker(url, { type: "module" }),
    assetBase = new URL("./", import.meta.url),
  } = {}) {
    this.owner = crypto.randomUUID();
    this.onProgress = onProgress;
    this.timeout = timeout;
    this.workerFactory = workerFactory;
    this.assetBase = assetBase;
    this.epoch = 0;
    this.sequence = 0;
    this.pending = new Map();
    this.fonts = new Map();
    this.tail = Promise.resolve();
    this.worker = null;
    this.assets = null;
    this.readyPromise = null;
    this.closed = false;
  }
  async prepareAssets() {
    if (this.assets) return this.assets;
    const get = async (file) => {
      const r = await fetch(new URL(file, this.assetBase));
      if (!r.ok) throw new ExportError("initialization", `Missing local runtime asset: ${file}`);
      return r.arrayBuffer();
    };
    try {
      const [source, wasm, font] = await Promise.all([
        get("worker.js"),
        get("mozjpeg_enc.wasm"),
        get("NotoSans-Bold.ttf"),
      ]);
      if (this.closed) throw new ExportError("worker", "This export pipeline is closed.");
      // WebKit's simulated offline state blocks Blob workers. A module data
      // URL keeps the already-fetched, bundled source usable after termination.
      const workerUrl =
        "data:text/javascript;charset=utf-8," +
        encodeURIComponent(new TextDecoder().decode(source));
      this.assets = { workerUrl, wasm, font };
      return this.assets;
    } catch (e) {
      if (e instanceof ExportError) throw e;
      throw new ExportError(
        "initialization",
        "Could not load the local export assets. Retry when they are available.",
      );
    }
  }
  send(payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence,
        epoch = this.epoch;
      const timer = setTimeout(() => {
        this.cancel("The export worker timed out. Retry the frozen job.", "worker");
      }, this.timeout);
      this.pending.set(id, {
        resolve: (x) => {
          clearTimeout(timer);
          resolve(x);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      try {
        this.worker.postMessage({ ...payload, id, epoch });
      } catch (e) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(new ExportError("worker", e.message));
      }
    });
  }
  async ready() {
    if (this.closed) throw new ExportError("worker", "This export pipeline is closed.");
    if (this.readyPromise) return this.readyPromise;
    const epoch = this.epoch;
    const promise = (async () => {
      const a = await this.prepareAssets();
      if (epoch !== this.epoch) throw new ExportError("cancelled", "Preparation cancelled.");
      try {
        this.worker = this.workerFactory(a.workerUrl);
      } catch (e) {
        throw new ExportError("initialization", e.message);
      }
      this.worker.onmessage = ({ data }) => {
        if (data.epoch !== this.epoch) return;
        if (data.type === "progress") {
          try {
            this.onProgress({
              stage: data.stage,
              request: data.id,
              runId: data.runId,
              rowId: data.rowId,
            });
          } catch {}
          return;
        }
        const p = this.pending.get(data.id);
        if (!p) return;
        this.pending.delete(data.id);
        if (data.type === "error")
          p.reject(new ExportError(data.error.stage, data.error.message, data.error.details));
        else p.resolve(data.result);
      };
      this.worker.onerror = (e) => {
        if (epoch === this.epoch)
          this.cancel(e.message || "The export worker stopped. Retry the frozen job.", "worker");
      };
      return this.send({
        kind: "init",
        wasm: a.wasm,
        font: a.font,
        extraFonts: [...this.fonts].map(([key, f]) => ({ key, bytes: f.bytes })),
      });
    })();
    this.readyPromise = promise;
    try {
      return await promise;
    } catch (e) {
      if (epoch === this.epoch) {
        this.worker?.terminate();
        this.worker = null;
        this.readyPromise = null;
      }
      throw e;
    }
  }
  createRun(inputs, options = {}) {
    if (!Array.isArray(inputs) || !inputs.length)
      throw new ExportError("validation", "Supply at least one marker.");
    const captured = captureRun(options),
      runId = crypto.randomUUID();
    return freeze({
      id: runId,
      captured,
      jobs: inputs.map((input, index) => ({
        owner: this.owner,
        id: String(index + 1).padStart(4, "0"),
        runId,
        settings: resolveSettings(input, captured),
      })),
    });
  }
  enqueue(operation) {
    const epoch = this.epoch;
    const task = this.tail.then(() => {
      if (epoch !== this.epoch)
        throw new ExportError(
          "cancelled",
          "Queued job cancelled; its frozen settings are retained.",
        );
      return operation();
    });
    this.tail = task.catch(() => {});
    return task;
  }
  loadFont(key, bytes) {
    if (key === "noto-bold" || this.fonts.has(key))
      return Promise.reject(new ExportError("font", "Use a new session-local font key."));
    const copy = bytes instanceof ArrayBuffer ? bytes.slice(0) : null;
    return this.enqueue(async () => {
      if (this.fonts.has(key)) throw new ExportError("font", "Use a new session-local font key.");
      await this.ready();
      const result = await this.send({ kind: "font", key, bytes: copy });
      this.fonts.set(key, { bytes: copy, ...result });
      return result;
    });
  }
  preview(settings) {
    const snapshot = structuredClone(settings);
    return this.enqueue(async () => {
      await this.ready();
      return this.send({ kind: "preview", settings: snapshot });
    });
  }
  export(job, { signal } = {}) {
    if (job?.owner !== this.owner)
      return Promise.reject(
        new ExportError("validation", "This frozen job belongs to another pipeline session."),
      );
    const snapshot = freeze(structuredClone(job));
    return this.enqueue(async () => {
      if (signal?.aborted) throw new ExportError("cancelled", "Export cancelled.");
      const abort = () => this.cancel();
      signal?.addEventListener("abort", abort, { once: true });
      try {
        await this.ready();
        const result = await this.send({
          kind: "export",
          runId: snapshot.runId,
          rowId: snapshot.id,
          settings: snapshot.settings,
        });
        return Object.freeze({ ...result, id: snapshot.id, runId: snapshot.runId, verified: true });
      } finally {
        signal?.removeEventListener("abort", abort);
      }
    });
  }
  cancel(message = "Export cancelled. Retry uses the same frozen settings.", stage = "cancelled") {
    this.epoch++;
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
    for (const p of this.pending.values()) p.reject(new ExportError(stage, message));
    this.pending.clear();
  }
  close() {
    this.closed = true;
    this.cancel("Pipeline closed.", "worker");
    this.assets = null;
    this.fonts.clear();
  }
}
