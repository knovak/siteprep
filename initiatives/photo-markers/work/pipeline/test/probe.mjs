import { ExportPipeline, captureRun, resolveSettings } from "../client.mjs";
import { verifyFinal } from "../verify.mjs";
import { writeMetadata } from "../metadata.mjs";
function check(value, message) {
  if (!value) throw new Error(message);
}
async function rejects(operation, stage) {
  let error;
  try {
    await operation();
  } catch (e) {
    error = e;
  }
  check(
    error && (!stage || error.stage === stage),
    "Expected failure at " + stage + ", got " + error?.message,
  );
  return error.message;
}
const output = {};
window.pipelineProbe = {
  async run() {
    const p = new ExportPipeline();
    await p.ready();
    window.activePipeline = p;
    const fixed = { now: "2026-10-20T14:05:06Z", timezone: "Australia/Brisbane" },
      records = [],
      failures = [];
    async function save(input, id) {
      const run = p.createRun([input], fixed),
        progress = [];
      p.onProgress = (e) => progress.push(e);
      const start = performance.now(),
        result = await p.export(run.jobs[0]),
        ms = performance.now() - start;
      check(
        progress.every((e) => e.runId === run.id && e.rowId === "0001"),
        "Progress identifies the frozen run and row",
      );
      records.push({
        id,
        ms,
        settings: result.settings,
        sha256: result.sha256,
        font: result.font,
        geometry: result.geometry,
        layout: result.layout,
      });
      output[id] = result.bytes;
      return result;
    }
    for (const shape of ["donut", "star", "solid"])
      for (const size of [256, 2000, 4096]) {
        const r = await save({ shape, size }, `${shape}-${size}`);
        check(r.verification.width === size, "Decoded dimensions");
        if (shape === "donut") check(r.geometry.innerRadius === size * 0.39, "Donut radius");
        if (shape === "star") {
          check(r.geometry.vertices.length === 10, "Star points");
          check(
            Math.abs(r.geometry.vertices[0][0] - size / 2) < 0.001 &&
              Math.abs(r.geometry.vertices[0][1]) < 0.001,
            "Star top vertex",
          );
        }
      }
    for (const [id, title, outline_width] of [
      ["title", "Photo markers", "auto"],
      ["descenders", "gyp", "auto"],
      ["glyphs", "Café Å Ω", "auto"],
      ["outline-zero", "A", 0],
      ["outline-64", "A", 64],
    ]) {
      const r = await save({ title, outline_width }, id);
      const b = r.layout.bounds;
      check(
        Math.abs((b[0] + b[2]) / 2 - 1000) < 0.01 && Math.abs((b[1] + b[3]) / 2 - 1000) < 0.01,
        "Centered glyph bounds",
      );
      check(
        b[2] - b[0] <= r.layout.box[0] + 0.01 && b[3] - b[1] <= r.layout.box[1] + 0.01,
        "Outline fits",
      );
    }
    const times = [
      ["date", { date: "2026-10-21" }, "2026-10-20T14:00:00Z", "+10:00"],
      ["now", {}, "2026-10-20T14:05:06Z", "+10:00"],
      [
        "seconds",
        { date: "2026-10-21", time: "12:34:56", timezone: "UTC" },
        "2026-10-21T12:34:56Z",
        "+00:00",
      ],
      ["half", { date: "2026-10-21", timezone: "Asia/Kolkata" }, "2026-10-20T18:30:00Z", "+05:30"],
      [
        "quarter",
        { date: "2026-10-21", timezone: "Asia/Kathmandu" },
        "2026-10-20T18:15:00Z",
        "+05:45",
      ],
      [
        "earlier",
        {
          date: "2026-11-01",
          time: "01:30",
          timezone: "America/Los_Angeles",
          occurrence: "earlier",
        },
        "2026-11-01T08:30:00Z",
        "-07:00",
      ],
      [
        "later",
        { date: "2026-11-01", time: "01:30", timezone: "America/Los_Angeles", occurrence: "later" },
        "2026-11-01T09:30:00Z",
        "-08:00",
      ],
      ["lower", { date: "1900-01-01", timezone: "UTC" }, "1900-01-01T00:00:00Z", "+00:00"],
      ["upper", { date: "2099-12-31", timezone: "UTC" }, "2099-12-31T00:00:00Z", "+00:00"],
    ];
    for (const [id, input, instant, offset] of times) {
      const r = await save({ ...input, size: 256 }, id);
      check(
        r.settings.timestamp.instant === instant && r.settings.timestamp.offset === offset,
        "Exact time " + id,
      );
    }
    for (const input of [
      { title: "🦄" },
      { title: "W".repeat(10000), size: 256 },
      { title: "A", size: 256, outline_width: 64 },
      { font: "not-loaded" },
    ]) {
      const job = p.createRun([input], fixed).jobs[0];
      failures.push(await rejects(() => p.export(job)));
    }
    failures.push(await rejects(() => p.loadFont("bad-font", new ArrayBuffer(32)), "font"));
    const ttf = await (await fetch("./NotoSans-Bold.ttf")).arrayBuffer();
    await p.loadFont("local-ttf", ttf);
    await save({ font: "local-ttf", title: "Local TTF", size: 256 }, "local-ttf");
    const otf = await (await fetch("./fixture.otf")).arrayBuffer();
    await p.loadFont("local-otf", otf);
    await save({ font: "local-otf", title: "A", size: 256 }, "local-otf");
    failures.push(await rejects(() => p.loadFont("local-ttf", ttf), "font"));
    const competing = await Promise.allSettled([
      p.loadFont("race-font", ttf),
      p.loadFont("race-font", otf),
    ]);
    check(competing[0].status === "fulfilled", "First queued font registered");
    check(
      competing[1].status === "rejected" && competing[1].reason.stage === "font",
      "Concurrent duplicate font cannot replace the original",
    );
    failures.push(competing[1].reason.message);
    const raceJob = p.createRun([{ font: "race-font", title: "Local TTF", size: 256 }], fixed);
    const raceResult = await p.export(raceJob.jobs[0]);
    check(raceResult.font.sha256 === competing[0].value.sha256, "Original font retained");
    const valid = await save({ title: "Metadata", size: 256 }, "metadata");
    const bytes = valid.bytes,
      marker = Array.from(bytes).findIndex(
        (_, i) =>
          bytes[i] === 69 &&
          bytes[i + 1] === 120 &&
          bytes[i + 2] === 105 &&
          bytes[i + 3] === 102 &&
          bytes[i + 4] === 0 &&
          bytes[i + 5] === 0,
      ),
      start = marker + 6;
    const view = new DataView(bytes.buffer, bytes.byteOffset),
      little = view.getUint16(start) === 0x4949,
      u16 = (i) => view.getUint16(start + i, little),
      u32 = (i) => view.getUint32(start + i, little),
      entries = new Map();
    function readIfd(offset) {
      for (let i = 0, n = u16(offset); i < n; i++) {
        const at = offset + 2 + i * 12,
          tag = u16(at);
        entries.set(tag, { at: start + at, value: start + u32(at + 8) });
        if (tag === 34665) readIfd(u32(at + 8));
      }
    }
    readIfd(u32(4));
    for (const tag of [305, 306, 36867, 36868, 36880, 36881, 36882]) {
      const entry = entries.get(tag),
        omit = bytes.slice();
      new DataView(omit.buffer).setUint16(entry.at, 65000, little);
      failures.push(await rejects(() => verifyFinal(omit, valid.settings), "verification"));
      const mismatch = bytes.slice();
      mismatch[entry.value] = mismatch[entry.value] === 57 ? 56 : 57;
      failures.push(await rejects(() => verifyFinal(mismatch, valid.settings), "verification"));
    }
    failures.push(
      await rejects(() => verifyFinal(bytes.slice(0, -2), valid.settings), "verification"),
    );
    const broken = bytes.slice();
    broken[start] = 0;
    failures.push(await rejects(() => verifyFinal(broken, valid.settings), "verification"));
    const appStart = marker - 4,
      length = bytes[appStart + 2] * 256 + bytes[appStart + 3] + 2,
      duplicate = new Uint8Array(bytes.length + length);
    duplicate.set(bytes.subarray(0, 2));
    duplicate.set(bytes.subarray(appStart, appStart + length), 2);
    duplicate.set(bytes.subarray(2), 2 + length);
    failures.push(await rejects(() => verifyFinal(duplicate, valid.settings), "verification"));
    failures.push(await rejects(() => writeMetadata(bytes, valid.settings.timestamp), "metadata"));
    failures.push(
      await rejects(() => writeMetadata(new Uint8Array(12), valid.settings.timestamp), "metadata"),
    );
    const snapshot = structuredClone(p.createRun([{}], fixed).jobs[0]);
    snapshot.settings.timestamp.offset = "+00:00";
    failures.push(await rejects(() => p.export(snapshot), "validation"));
    const frozen = p.createRun([{ title: "Frozen retry", size: 2000 }], fixed),
      before = await p.export(frozen.jobs[0]);
    let once = true;
    p.onProgress = ({ stage }) => {
      if (once && stage === "encoding") {
        once = false;
        p.cancel();
      }
    };
    const cancelled = await Promise.allSettled([
      p.export(frozen.jobs[0]),
      p.export(frozen.jobs[0]),
    ]);
    check(
      cancelled.every((x) => x.status === "rejected" && x.reason.stage === "cancelled"),
      "Cancel active and queued jobs",
    );
    p.onProgress = () => {};
    const after = await p.export(frozen.jobs[0]);
    check(
      after.sha256 === before.sha256 && after.settings.timestamp.instant === fixed.now,
      "Frozen retry and existing result preservation",
    );
    // Delayed messages from a terminated worker cannot become a new result.
    const old = p.worker,
      epoch = p.epoch;
    p.cancel();
    old.onmessage({
      data: {
        epoch,
        type: "result",
        id: p.sequence + 1,
        result: { verified: true, bytes: new Uint8Array([1]) },
      },
    });
    await p.ready();
    const freshEpoch = p.epoch;
    old.onerror({ message: "Late error from a terminated worker" });
    check(p.epoch === freshEpoch && p.worker, "Stale worker error ignored");
    const recovered = await p.export(frozen.jobs[0]);
    check(recovered.sha256 === before.sha256, "Stale worker result rejected");
    window.frozenJob = frozen.jobs[0];
    window.frozenHash = before.sha256;
    return { records, failures, cancelled: cancelled.length, frozenHash: before.sha256 };
  },
  async offline() {
    const p = window.activePipeline;
    const first = await p.export(window.frozenJob);
    check(first.sha256 === window.frozenHash, "Offline bytes match");
    p.cancel();
    const retry = await p.export(window.frozenJob);
    check(retry.sha256 === window.frozenHash, "Offline worker restart matches");
    await p.loadFont("offline-local", await window.offlineFontPromise);
    const local = p.createRun([{ font: "offline-local", title: "Offline font", size: 256 }], {
      now: "2026-10-20T14:05:06Z",
      timezone: "UTC",
    });
    await p.export(local.jobs[0]);
    return { single: true, restart: true, localFont: true };
  },
  files() {
    return Object.entries(output).map(([id, b]) => {
      let value = "";
      for (let i = 0; i < b.length; i += 32768)
        value += String.fromCharCode(...b.subarray(i, i + 32768));
      return { id, base64: btoa(value) };
    });
  },
  async missingAsset() {
    const p = new ExportPipeline();
    try {
      return await rejects(() => p.ready(), "initialization");
    } finally {
      p.close();
    }
  },
  async workerFailure() {
    const p = new ExportPipeline({
      timeout: 50,
      workerFactory: () => ({ postMessage() {}, terminate() {} }),
    });
    try {
      return await rejects(() => p.ready(), "worker");
    } finally {
      p.close();
    }
  },
  async prepareOfflineFont() {
    window.offlineFontPromise = (await fetch("./NotoSans-Bold.ttf")).arrayBuffer();
    await window.offlineFontPromise;
  },
  close() {
    window.activePipeline?.close();
  },
};
