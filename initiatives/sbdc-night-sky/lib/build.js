// Build: inline CSS, data, catalog, and JS (model -> render -> ui, one
// module scope) into dist/sbdc-sky-simulator.html. Asserts: size budget,
// no external network references, data block present.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

/** Strip ES module syntax so files share one <script type=module> scope:
 *  remove import lines, drop `export ` keywords. */
function inlineModule(src, exportsAs) {
  let out = src
    .replace(/^import .*$/gm, "")
    .replace(/^export default /gm, "")
    .replace(/^export /gm, "");
  if (exportsAs) {
    // collect top-level declared names to expose on a namespace object
    const names = [...src.matchAll(/^export (?:function|const|class|let) ([A-Za-z0-9_]+)/gm)]
      .map((m) => m[1]);
    out += `\nconst ${exportsAs} = { ${names.join(", ")} };\n`;
  }
  return out;
}

const html = read("src/index.html");
const css = read("src/app.css");
const data = JSON.stringify(JSON.parse(read("data/sbdc-data.json")));
const catalog = JSON.stringify(JSON.parse(read("data/bsc-reduced.json")));
const js =
  "// ==== model.js (tested core) ====\n" + inlineModule(read("src/model.js"), "MODEL") +
  "\n// ==== render.js ====\n" + inlineModule(read("src/render.js"), "RENDER") +
  "\n// ==== ui.js ====\n" + inlineModule(read("src/ui.js"), null);

const out = html
  .replace("/*INJECT:CSS*/", () => css)
  .replace("/*INJECT:DATA*/", () => data)
  .replace("/*INJECT:CATALOG*/", () => catalog)
  .replace("/*INJECT:JS*/", () => js);

// ---- assertions ----
const bytes = Buffer.byteLength(out, "utf8");
if (bytes > 600_000) throw new Error(`size budget exceeded: ${bytes} bytes`);
const external = out.match(/https?:\/\/[^"'\s)]+/g) || [];
// allow only inert mentions inside comments/data sources (no fetch/src/href)
const active = out.match(/(?:src|href)=["']https?:|fetch\(["']https?:/g);
if (active) throw new Error("external network reference found: " + active.join(", "));
if (!out.includes('id="sbdc-data"')) throw new Error("data block missing");
if (out.includes("/*INJECT:")) throw new Error("un-replaced injection marker");

mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/sbdc-sky-simulator.html", import.meta.url), out);
console.log(`built dist/sbdc-sky-simulator.html — ${(bytes / 1024).toFixed(0)} KB, ` +
  `${external.length} inert URL mentions (sources), 0 active network refs`);
