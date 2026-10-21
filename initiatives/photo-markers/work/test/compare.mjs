import { chromium, webkit } from '../../../../node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
const root = resolve(import.meta.dirname, '..');
const mime = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.html': 'text/html', '.py': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/nested/photo-markers/')) throw new Error('Wrong base');
    const path = resolve(root, pathname.slice('/nested/photo-markers/'.length) || 'index.html');
    if (!path.startsWith(root+'/')) throw new Error('Outside root');
    const bytes = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' }); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/nested/photo-markers/`;
await mkdir(resolve(root, 'evidence'), { recursive: true });
const report = { generatedAt: new Date().toISOString(), base: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), host: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0].model }, note: 'Playwright engines; branded Safari and physical iOS unrun. HTTP no-store, no compression.', runs: [] };
try {
  for (const [engine, launcher] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await launcher.launch({ headless: true });
    for (const route of ['A', 'B']) {
      const row = { engine, browserVersion: browser.version(), route, cold: [], warm: [], batch: [], requests: [] };
      let context, page;
      try {
        for (let i = 0; i < 3; i++) {
          if (context) await context.close();
          context = await browser.newContext(); page = await context.newPage();
          await page.addInitScript(() => { window.encodeEvidence = bytes => { let text = ''; for (let i=0; i<bytes.length; i+=32768) text += String.fromCharCode(...bytes.subarray(i,i+32768)); return btoa(text); }; });
          page.on('request', req => row.requests.push({ url: new URL(req.url()).pathname, method: req.method() }));
          page.on('console', msg => { if (msg.type() === 'error') console.error(engine, route, msg.text()); });
          await page.goto(url); await page.waitForFunction(() => window.comparison);
          row.cold.push(await page.evaluate(route => window.comparison.start(route), route));
          console.log(engine, route, 'cold', i+1);
        }
        for (let i = 0; i < 5; i++) {
          const result = await page.evaluate(() => window.comparison.single().then(r => ({ ms: r.ms, tags: r.tags, sha256: r.sha256, resources: r.resources, byteLength: r.bytes.length, base64: window.encodeEvidence(r.bytes) })));
          row.warm.push({ ms: result.ms, tags: result.tags, sha256: result.sha256, bytes: result.byteLength, resources: result.resources });
          if (i === 0) await writeFile(resolve(root, `evidence/${engine}-${route}-donut.jpg`), Buffer.from(result.base64, 'base64'));
        }
        for (let i = 0; i < 3; i++) {
          const result = await page.evaluate(() => window.comparison.batch().then(r => ({ ms: r.ms, manifest: r.manifest, byteLength: r.zipped.length, base64: window.encodeEvidence(r.zipped) })));
          row.batch.push({ ms: result.ms, bytes: result.byteLength, manifest: result.manifest });
          if (i === 0) await writeFile(resolve(root, `evidence/${engine}-${route}-batch.zip`), Buffer.from(result.base64, 'base64'));
        }
        row.failures = await page.evaluate(route => window.comparison.failureAndRetry(route), route);
        // Kill the actual WASM request in a clean context: no codec-free fallback.
        const blocked = await browser.newContext(), missing = await blocked.newPage();
        await blocked.route('**/*.wasm', r => r.abort()); await missing.goto(url); await missing.waitForFunction(() => window.comparison);
        row.missingWasmRejected = await missing.evaluate(route => window.comparison.start(route, 10000).then(() => false, () => true), route);
        await blocked.close(); if (!row.missingWasmRejected) throw new Error('Missing WASM did not fail');
        let networkAttempts = 0;
        await context.route(/^https?:\/\//, r => { networkAttempts++; return r.abort(); });
        // Existing worker/runtime stays ready; block every later request.
        // Playwright WebKit's offline emulation also prevents local Blob image
        // decoding. Keep that failed receipt; use HTTP denial for that engine.
        row.offlineMode = engine === 'chromium' ? 'context offline plus HTTP denial' : 'HTTP denial only; WebKit context-offline Blob decode failed separately';
        if (engine === 'chromium') await context.setOffline(true);
        row.offlineSingle = await page.evaluate(() => window.comparison.single().then(r => ({ ms: r.ms, sha256: r.sha256 })));
        row.offlineBatch = await page.evaluate(() => window.comparison.batch().then(r => ({ ms: r.ms, count: r.manifest.length })));
        row.offlineNetworkAttempts = networkAttempts;
        row.jsHeap = await page.evaluate(() => performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize } : null);
        row.pass = true;
      } catch (error) { row.pass = false; row.error = String(error.stack || error); }
      finally { if (context) await context.close(); }
      report.runs.push(row); await writeFile(resolve(root, 'evidence/comparison.json'), JSON.stringify(report, null, 2)+'\n');
      console.log(engine, route, row.pass ? 'PASS' : row.error);
    }
    await browser.close();
  }
} finally { server.close(); }
if (report.runs.some(x => !x.pass)) process.exitCode = 1;
