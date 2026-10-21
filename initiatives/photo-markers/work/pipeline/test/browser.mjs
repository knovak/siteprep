import { chromium, webkit } from "../../../../../node_modules/playwright/index.mjs";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";
import opentype from "opentype.js";
const root = resolve(import.meta.dirname, "..");
const path = new opentype.Path();
path.moveTo(0, 0);
path.lineTo(300, 700);
path.lineTo(600, 0);
path.close();
const font = new opentype.Font({
  familyName: "Pipeline Fixture",
  styleName: "Regular",
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  glyphs: [
    new opentype.Glyph({ name: ".notdef", advanceWidth: 600, path: new opentype.Path() }),
    new opentype.Glyph({
      name: "space",
      unicode: 32,
      advanceWidth: 200,
      path: new opentype.Path(),
    }),
    new opentype.Glyph({ name: "A", unicode: 65, advanceWidth: 600, path }),
  ],
});
await writeFile(resolve(root, "dist/fixture.otf"), new Uint8Array(font.toArrayBuffer()));
const types = { ".js": "text/javascript", ".html": "text/html", ".wasm": "application/wasm" };
const server = createServer(async (req, res) => {
  try {
    const name = new URL(req.url, "http://localhost").pathname;
    if (!name.startsWith("/nested/export/")) throw Error();
    const file = resolve(root, "dist", name.slice("/nested/export/".length) || "test.html");
    if (!file.startsWith(root + "/dist/")) throw Error();
    const bytes = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Content-Length": bytes.length,
      "Cache-Control": "no-store",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/nested/export/test.html`;
await mkdir(resolve(root, "evidence"), { recursive: true });
const receipt = {
  at: new Date().toISOString(),
  base: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  engines: [],
  limits: "Desktop Playwright engines; branded Safari/Chrome and physical iOS are unrun.",
};
try {
  for (const [engine, launcher] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await launcher.launch(),
      context = await browser.newContext({ timezoneId: "America/New_York" }),
      page = await context.newPage();
    const result = { engine, version: browser.version(), requests: [], errors: [] };
    context.on("request", (req) =>
      result.requests.push({ method: req.method(), path: new URL(req.url()).pathname }),
    );
    page.on("pageerror", (e) => result.errors.push(e.message));
    try {
      await page.goto(url);
      await page.waitForFunction(() => window.pipelineProbe);
      result.suite = await page.evaluate(() => window.pipelineProbe.run());
      for (const f of await page.evaluate(() => window.pipelineProbe.files()))
        await writeFile(
          resolve(root, `evidence/${engine}-${f.id}.jpg`),
          Buffer.from(f.base64, "base64"),
        );
      await page.evaluate(() => window.pipelineProbe.prepareOfflineFont());
      await context.setOffline(true);
      let requests = 0;
      await context.route(/^https?:\/\//, (r) => {
        requests++;
        return r.abort();
      });
      result.offline = await page.evaluate(() => window.pipelineProbe.offline());
      result.offlineHttpAttempts = requests;
      if (requests) throw Error("Offline workflow attempted HTTP");
      const blocked = await browser.newContext(),
        missing = await blocked.newPage();
      await blocked.route("**/mozjpeg_enc.wasm", (r) =>
        r.fulfill({ status: 404, body: "missing" }),
      );
      await missing.goto(url);
      await missing.waitForFunction(() => window.pipelineProbe);
      result.missingWasm = await missing.evaluate(() => window.pipelineProbe.missingAsset());
      await blocked.close();
      // A deliberately nonresponsive worker exercises timeout/error cleanup.
      await context.setOffline(false);
      await context.unroute(/^https?:\/\//);
      result.workerTimeout = await page.evaluate(() => window.pipelineProbe.workerFailure());
      await page.evaluate(() => window.pipelineProbe.close());
      result.pass = true;
    } catch (error) {
      result.pass = false;
      result.error = String(error.stack || error);
    } finally {
      await context.close();
      await browser.close();
    }
    receipt.engines.push(result);
    await writeFile(
      resolve(root, "evidence/browser.json"),
      JSON.stringify(receipt, null, 2) + "\n",
    );
    console.log(engine, result.pass ? "PASS" : result.error);
  }
} finally {
  server.close();
}
if (receipt.engines.some((x) => !x.pass)) process.exitCode = 1;
