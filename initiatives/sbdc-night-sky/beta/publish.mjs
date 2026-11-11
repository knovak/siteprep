#!/usr/bin/env node
// The step the site build runs to publish the beta simulator.
//
//   node publish.mjs <output-directory>
//
// Runs this folder's test suites, then builds the single-file page into
// <output-directory>/index.html. A failing test or a failing build exits
// non-zero, which fails the site build - so a beta that does not pass its own
// tests is never published. Nothing is written into this folder.
//
// initiative.json names this file as the deployment's `beta.build`; see
// README.md here and "Beta" in INITIATIVES_TECHDOC.md.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node publish.mjs <output-directory>");
  process.exit(2);
}

const suites = readdirSync(join(here, "test"))
  .filter((name) => name.endsWith(".test.js"))
  .sort()
  .map((name) => join("test", name));

const tests = spawnSync(process.execPath, ["--test", ...suites], { cwd: here, encoding: "utf8" });
if (tests.status !== 0) {
  process.stderr.write(`${tests.stdout || ""}${tests.stderr || ""}`);
  console.error("SBDC beta: tests failed - the beta was not published");
  process.exit(1);
}

const build = spawnSync(process.execPath, ["build.js", resolve(outDir)], { cwd: here, stdio: "inherit" });
process.exit(build.status === null ? 1 : build.status);
