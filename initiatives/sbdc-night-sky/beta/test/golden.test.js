import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as M from "../src/model.js";

const data = JSON.parse(readFileSync(new URL("../data/sbdc-data.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("../data/bsc-reduced.json", import.meta.url)));
const golden = JSON.parse(readFileSync(new URL("./golden/golden.json", import.meta.url)));

for (const g of golden) {
  test(`golden: ${g.name}`, () => {
    const cfg = M.defaultConfig(data, g.cfg);
    const cons = M.generateConstellation(cfg, data);
    const s = M.summarize(cons, g.state, data, catalog);
    assert.deepEqual(s, g.expect,
      "Model output drifted from frozen fixture. If the change is " +
      "intentional, regenerate with tools/make-golden.mjs and record why.");
  });
}
