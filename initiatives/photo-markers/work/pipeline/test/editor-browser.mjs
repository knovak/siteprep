import { chromium, webkit } from "../../../../../node_modules/playwright/index.mjs";
import AxeBuilder from "../../../../../node_modules/@axe-core/playwright/dist/index.mjs";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(import.meta.dirname, "..");
const evidence = resolve(root, "evidence/editor"); await mkdir(evidence, { recursive: true });
const types = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".wasm": "application/wasm" };
const server = createServer(async (req, res) => {
  try {
    const prefix = "/nested/markers/", path = new URL(req.url, "http://localhost").pathname;
    if (!path.startsWith(prefix)) throw Error();
    const file = resolve(root, "dist", path.slice(prefix.length) || "index.html");
    if (!file.startsWith(root + "/dist/")) throw Error();
    const bytes = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/nested/markers/`;
const receipt = { at: new Date().toISOString(), engines: [], files: [], limitations: "Playwright desktop engines; physical iOS, branded Safari/Chrome, real screen reader and full zoom matrix remain unrun." };
const sha = (b) => createHash("sha256").update(b).digest("hex");
try {
  for (const [engine, launcher] of [["chromium", chromium], ["webkit", webkit]]) {
    const browser = await launcher.launch(), context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/New_York", acceptDownloads: true });
    const page = await context.newPage(); const row = { engine, version: browser.version(), cases: [], pageErrors: [] }; receipt.engines.push(row);
    page.on("pageerror", (e) => row.pageErrors.push(e.message));
    let downloads = 0; page.on("download", () => downloads++);
    const waitDraft = () => page.waitForFunction(() => !document.getElementById("draft").hidden && document.getElementById("draft-status").textContent.includes("current design"));
    const generate = async () => { await page.locator("#generate").click(); await page.waitForFunction(() => !document.getElementById("generate").disabled && !document.getElementById("result").hidden); assert.equal(await page.locator("#error").isVisible(), false); };
    const download = async (name, local, offset, size = 2000) => {
      const event = page.waitForEvent("download"); await page.locator("#download").click(); const d = await event;
      const file = `${engine}-${name}.jpg`; await d.saveAs(resolve(evidence, file));
      const bytes = await readFile(resolve(evidence, file));
      const preview = await page.locator("#result-image").evaluate((canvas) => {
        const ctx = canvas.getContext("2d"); const points = [[0,0],[210,20],[210,210]];
        return points.map(([x,y])=>({point:[x,y],pixel:[...ctx.getImageData(x,y,1,1).data]}));
      });
      assert.match(await page.locator("#result-details").textContent(), new RegExp(sha(bytes))); assert.equal(await page.locator("#result-name").textContent(), d.suggestedFilename());
      receipt.files.push({ file, sha256: sha(bytes), filename: d.suggestedFilename(), local, offset, size, preview }); return sha(bytes);
    };
    try {
      await page.clock.setFixedTime(new Date("2026-10-21T13:59:59Z"));
      await page.goto(url); await waitDraft();
      assert.match(await page.locator("#timezone").inputValue(), /New_York/);
      // Keyboard focus/type/Generate; native select values use the semantic API.
      await page.locator("#title").focus(); await page.keyboard.type("A new chapter"); await page.keyboard.press("Tab");
      assert.equal(await page.locator(":focus").getAttribute("id"), "shape");
      await page.locator("#shape").selectOption("star");
      assert.equal(await page.locator("#shape").inputValue(), "star");
      await page.locator("#shape_color").fill("light blue");
      await page.locator("#date").fill("2026-10-22"); await page.locator("#timezone").fill("Australia/Brisbane"); await waitDraft();
      await page.locator("#generate").focus(); await page.keyboard.press("Enter");
      await page.locator("#download").waitFor(); assert.equal(downloads, 0);
      const initial = await download("date", "2026:10:22 00:00:00", "+10:00");
      assert.match(receipt.files.at(-1).filename, /^a-new-chapter-20261022-000000-0001.jpg$/);
      row.cases.push("Keyboard controls and deliberate verified download; decoded preview samples retained for native comparison");
      await page.locator("#title").fill("Changed"); await waitDraft();
      assert.match(await page.locator("#result-state").textContent(), /Previous settings/);
      assert.equal(await download("previous", "2026:10:22 00:00:00", "+10:00"), initial);
      await page.locator("#shape").selectOption("solid"); assert.equal(await page.locator("#shape_color").isVisible(), false);
      await page.locator("#shape").selectOption("star"); assert.equal(await page.locator("#shape_color").inputValue(), "light blue");
      await page.locator("#date").fill(""); await page.locator("#time").fill("12:00"); await page.locator("#generate").click();
      assert.match(await page.locator("#error").textContent(), /Enter a date/); assert.equal(await page.locator(":focus").getAttribute("id"), "error-action");
      await page.locator("#error-action").click(); assert.equal(await page.locator(":focus").getAttribute("id"), "time");
      assert.equal(await page.locator("#result").isVisible(), true);
      row.cases.push("Edits retain labeled old bytes; hidden colors survive shape switch; errors focus and preserve result");
      await page.locator("#date").fill("2026-11-01"); await page.locator("#time").fill("01:30"); await page.locator("#timezone").fill("America/Los_Angeles");
      await page.locator("#occurrence").waitFor(); assert.match(await page.locator("#occurrence").textContent(), /-07:00.*08:30:00Z.*-08:00.*09:30:00Z/s);
      await page.locator("#generate").click(); assert.match(await page.locator("#error").textContent(), /repeats/);
      await page.locator("#occurrence").selectOption("later"); await generate(); await download("later", "2026:11:01 01:30:00", "-08:00");
      await page.locator("#time").fill("01:31"); assert.equal(await page.locator("#occurrence").inputValue(), "");
      await page.locator("#date").fill("2026-03-08"); await page.locator("#time").fill("02:30"); await page.locator("#generate").click(); assert.match(await page.locator("#error").textContent(), /does not exist/);
      row.cases.push("Repeated-hour offsets and instants; choice invalidation; nonexistent time rejected");
      await page.locator("#date").fill(""); await page.locator("#time").fill(""); await page.locator("#timezone").fill("Australia/Brisbane"); await waitDraft();
      assert.match(await page.locator("#effective").textContent(), /23:59:59/);
      await page.clock.setFixedTime(new Date("2026-10-21T14:00:01Z")); await generate();
      const now = await download("now", "2026:10:22 00:00:01", "+10:00");
      await page.clock.setFixedTime(new Date("2026-10-22T14:00:01Z"));
      assert.equal(await download("repeat-download", "2026:10:22 00:00:01", "+10:00"), now);
      row.cases.push("Now freezes at Generate across midnight; repeated download preserves bytes and filename");
      // Delay actual export replies so UI edits, cancellation and retry race deterministically.
      await page.evaluate(() => {
        const Original = window.Worker;
        window.Worker = class extends Original {
          set onmessage(handler) { super.onmessage = event => {
            if (event.data.result?.verification) setTimeout(() => handler(event), 400);
            else handler(event);
          }; }
        };
      });
      // Cancellation terminates the current worker; the retry creates the instrumented worker.
      await page.locator("#generate").click(); await page.locator("#cancel").click();
      const frozen = await page.locator("#frozen").textContent();
      await page.clock.setFixedTime(new Date("2026-10-23T14:00:01Z"));
      await page.locator("#retry").click(); await page.locator("#title").fill("Edits while rendering");
      await page.waitForFunction(() => !document.getElementById("generate").disabled);
      assert.equal(await page.locator("#frozen").textContent(), frozen); assert.match(await page.locator("#result-state").textContent(), /Previous settings/);
      await download("retry", "2026:10:23 00:00:01", "+10:00");
      row.cases.push("Cancellation/retry retains frozen timestamp; changed controls cannot relabel a late result");
      await page.locator("#advanced").evaluate(e => e.open = true);
      await page.locator("#local-font").setInputFiles({ name: "broken.ttf", mimeType: "font/ttf", buffer: Buffer.from("not a font") });
      await page.waitForFunction(() => !document.getElementById("generate").disabled); assert.match(await page.locator("#error").textContent(), /TTF\/OTF|TTF or OTF/);
      await page.locator("#local-font").setInputFiles(resolve(root, "dist/NotoSans-Bold.ttf"));
      await page.waitForFunction(() => document.getElementById("font").value.startsWith("local-")); await waitDraft();
      await page.locator("#title").fill("Local font"); await page.locator("#date").fill("2026-10-22"); await generate(); await download("local-font", "2026:10:22 00:00:00", "+10:00");
      row.cases.push("Invalid font preserves prior font/result; real local font loads and exports");
      let attempts = 0; await context.route(/^https?:\/\//, route => { attempts++; return route.abort(); }); await context.setOffline(true);
      await page.locator("#shape").selectOption("solid"); await page.locator("#title").fill(""); await waitDraft(); await generate(); await download("offline", "2026:10:22 00:00:00", "+10:00");
      assert.equal(attempts, 0); row.cases.push("Offline editing, local-font rendering, verification and retrieved JPEG with no HTTP attempts");
      for (const width of [1280, 430, 320]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const audit = await new AxeBuilder({ page }).analyze(); assert.deepEqual(audit.violations.map(v => ({ id:v.id, nodes:v.nodes.map(n=>n.target) })), []);
        row.cases.push(`No horizontal overflow or detected axe violation at ${width}px`);
      }
      await page.locator("#discard").click(); assert.equal(await page.locator("#result").isVisible(), false); assert.equal(await page.locator("#download").getAttribute("href"), null);
      row.cases.push("Explicit discard removes the result and download URL");
      assert.deepEqual(row.pageErrors, []);
      await context.close();
      const recovery = await browser.newContext(); const rp = await recovery.newPage();
      await recovery.route("**/mozjpeg_enc.wasm", route => route.fulfill({ status:404, body:"missing" }));
      await rp.goto(url); await rp.locator("#prepare").waitFor(); assert.equal(await rp.locator("#generate").isDisabled(), true);
      await recovery.unroute("**/mozjpeg_enc.wasm"); await rp.locator("#prepare").click(); await rp.waitForFunction(() => !document.getElementById("generate").disabled);
      row.cases.push("Missing startup asset disables Generate; explicit Retry recovers"); await recovery.close();
      row.pass = true;
    } catch (e) { row.pass = false; row.error = e.stack; await page.screenshot({ path:resolve(evidence, `${engine}-failure.png`), fullPage:true }).catch(()=>{}); }
    finally { await browser.close(); }
  }
} finally { server.close(); await writeFile(resolve(evidence,"browser.json"), JSON.stringify(receipt,null,2)+"\n"); }
console.log(JSON.stringify(receipt.engines.map(({engine,pass,cases,error})=>({engine,pass,cases,error})),null,2));
if (receipt.engines.some(row => !row.pass)) process.exitCode=1;
