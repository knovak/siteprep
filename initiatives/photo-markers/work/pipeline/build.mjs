import { build } from "esbuild";
import { mkdir, copyFile, cp, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
process.chdir(import.meta.dirname);
const hash = (b) => createHash("sha256").update(b).digest("hex");
await mkdir("dist/notices", { recursive: true });
await build({
  entryPoints: { client: "client.mjs", worker: "worker.mjs", probe: "test/probe.mjs", editor: "editor.mjs" },
  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  legalComments: "eof",
});
await copyFile("node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm", "dist/mozjpeg_enc.wasm");
for (const file of ["index.html", "editor.css"]) await copyFile(file, "dist/" + file);
const commit = "ffebf8c1ee449e544955a7e813c54f9b73848eac";
for (const [name, source, expected] of [
  [
    "NotoSans-Bold.ttf",
    "hinted/ttf/NotoSans/NotoSans-Bold.ttf",
    "c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a",
  ],
  [
    "notices/Noto-LICENSE",
    "LICENSE",
    "0dab92d0544f7b233403f14b84a663bdbfa746982eda629e7f4f9ffe1b036feb",
  ],
]) {
  let bytes;
  try {
    bytes = await readFile("dist/" + name);
    if (hash(bytes) !== expected) throw Error();
  } catch {
    const response = await fetch(
      `https://raw.githubusercontent.com/notofonts/noto-fonts/${commit}/${source}`,
    );
    if (!response.ok) throw Error("Font asset unavailable");
    bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== expected) throw Error("Font hash mismatch");
    await writeFile("dist/" + name, bytes);
  }
}
for (const name of [
  "@js-temporal/polyfill",
  "@jsquash/jpeg",
  "exifr",
  "jpeg-js",
  "opentype.js",
  "jsbi",
]) {
  const dest = "dist/notices/" + name.replaceAll("/", "-");
  await mkdir(dest, { recursive: true });
  for (const file of await readdir("node_modules/" + name))
    if (/^(license|copying|notice)/i.test(file))
      await copyFile("node_modules/" + name + "/" + file, dest + "/" + file);
}
for (const file of await readdir("node_modules/@jsquash/jpeg/codec"))
  if (/^(license|copying|notice|readme)/i.test(file))
    await copyFile("node_modules/@jsquash/jpeg/codec/" + file, "dist/notices/" + file);
await writeFile(
  "dist/test.html",
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>Export pipeline test runner</title><body><p>Internal pipeline test runner.</p><script type="module" src="./probe.js"></script></body></html>',
);
const files = {};
for (const file of [
  "client.js",
  "worker.js",
  "probe.js",
  "editor.js",
  "index.html",
  "editor.css",
  "mozjpeg_enc.wasm",
  "NotoSans-Bold.ttf",
]) {
  const b = await readFile("dist/" + file);
  files[file] = { bytes: b.length, sha256: hash(b) };
}
await writeFile(
  "build-inputs.json",
  JSON.stringify(
    { fontCommit: commit, lockSha256: hash(await readFile("package-lock.json")), files },
    null,
    2,
  ) + "\n",
);
console.log("Built standalone single-codec pipeline with local assets and notices.");
