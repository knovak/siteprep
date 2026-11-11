// Build: inline CSS, data, catalog, and JS (model -> render -> ui, one
// module scope) into dist/sbdc-sky-simulator.html. Asserts: size budget,
// no external network references, data block present.
//
// Beta line: `node build.js <directory>` writes the same page to
// <directory>/index.html instead, which is how publish.mjs hands the beta to
// the site build. See README.md in this folder.
//
// Beta line: every presets/*.yaml file is embedded as a preset, in file-name
// order. A preset that does not read cleanly fails the build.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { settingsFromYaml } from "./src/settings.js";

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

// ---- presets: one YAML settings file each, carried as text ----
const presetFiles = readdirSync(new URL("presets/", import.meta.url))
  .filter((name) => /\.ya?ml$/.test(name))
  .sort();
const presetNames = new Set();
const presetList = presetFiles.map((file) => {
  const text = read(`presets/${file}`);
  const got = settingsFromYaml(text);
  const problems = [...got.errors, ...got.notes];
  if (!got.name) problems.push("it needs a name: line, which is its title in the Preset list");
  else if (presetNames.has(got.name)) problems.push(`another preset is already named "${got.name}"`);
  if (problems.length) throw new Error(`presets/${file}: ${problems.join("; ")}`);
  presetNames.add(got.name);
  return { file, text };
});
// "<" is escaped so no preset text can end the script block it sits in
const presets = JSON.stringify(presetList).replace(/</g, "\\u003c");

const sources = [
  ["model.js (tested core)", "src/model.js", "MODEL"],
  ["render.js", "src/render.js", "RENDER"],
  ["settings.js", "src/settings.js", "SETTINGS"],
  ["ui.js", "src/ui.js", null],
];
// The files share one scope in the page, so a name declared at the top level
// of two of them would stop the whole script from loading.
const declared = new Map();
for (const [, path] of sources) {
  for (const m of read(path).matchAll(/^(?:export )?(?:async )?(?:function\*?|const|let|class) ([A-Za-z0-9_$]+)/gm)) {
    if (declared.has(m[1])) throw new Error(`"${m[1]}" is declared in both ${declared.get(m[1])} and ${path}`);
    declared.set(m[1], path);
  }
}
const js = sources
  .map(([title, path, exportsAs]) => `// ==== ${title} ====\n` + inlineModule(read(path), exportsAs))
  .join("\n");

const out = html
  .replace("/*INJECT:CSS*/", () => css)
  .replace("/*INJECT:DATA*/", () => data)
  .replace("/*INJECT:CATALOG*/", () => catalog)
  .replace("/*INJECT:PRESETS*/", () => presets)
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

let target = "dist/sbdc-sky-simulator.html";
if (process.argv[2]) {
  const outDir = resolve(process.argv[2]);
  mkdirSync(outDir, { recursive: true });
  target = join(outDir, "index.html");
  writeFileSync(target, out);
} else {
  mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
  writeFileSync(new URL(target, import.meta.url), out);
}
console.log(`built ${target} — ${(bytes / 1024).toFixed(0)} KB, ${presetList.length} presets, ` +
  `${external.length} inert URL mentions (sources), 0 active network refs`);
