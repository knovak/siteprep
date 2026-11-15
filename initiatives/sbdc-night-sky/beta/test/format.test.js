import { test } from "node:test";
import assert from "node:assert/strict";
import * as F from "../src/format.js";

test("clock text carries the hour when the minutes round up to 60", () => {
  assert.equal(F.formatClock(19 + 59.6 / 60), "20:00");   // was "19:00"
  assert.equal(F.formatClock(23 + 59.7 / 60), "00:00");
  assert.equal(F.formatClock(19.5), "19:30");
  assert.equal(F.formatClock(0), "00:00");
  assert.equal(F.formatClock(-0.5), "23:30");
  assert.equal(F.formatClock(24 + 4 + 40 / 60), "04:40");
});

test("clock differences wrap at midnight", () => {
  assert.equal(F.formatClockDelta(0.5, 23.5), 1);
  assert.equal(F.formatClockDelta(23.5, 0.5), -1);
  assert.equal(F.formatClockDelta(6, 18), 12);
});

test("a time is described from the nearer of sunset and sunrise", () => {
  // 37 N on Sep 22: sunset near 18:00, sunrise near 06:00
  assert.deepEqual(F.formatTwilightOffset(19 + 22 / 60, 18, 6), { ref: "sunset", minutes: 82 });
  assert.deepEqual(F.formatTwilightOffset(4 + 40 / 60, 18, 6), { ref: "sunrise", minutes: -80 });
  assert.deepEqual(F.formatTwilightOffset(18, 18, 6), { ref: "sunset", minutes: 0 });
  assert.deepEqual(F.formatTwilightOffset(0.5, 23.75, 0.25), { ref: "sunrise", minutes: 15 });
  // a day with a sunset and no sunrise still has a reference
  assert.deepEqual(F.formatTwilightOffset(20, 19, null), { ref: "sunset", minutes: 60 });
  assert.equal(F.formatTwilightOffset(20, null, null), null);
});

test("the Satellites slider reaches the round totals", () => {
  const values = [];
  for (let pos = 0; pos <= 100; pos++) values.push(F.formatSatelliteCount(pos));
  assert.equal(values[0], 10000);
  assert.equal(values[100], 1000000);
  assert.equal(values[74], 300000, "the default position is still 300,000");
  for (const round of [100000, 200000, 250000, 300000, 400000, 500000, 1000000]) {
    assert.ok(values.includes(round), `${round} can be chosen`);
  }
  assert.ok(!values.includes(501000), "501,000 was the nearest position to 500,000");
  // the lowest positions share a total because totals are whole thousands
  for (let pos = 1; pos <= 100; pos++) {
    assert.ok(values[pos] >= values[pos - 1], `position ${pos} is not below position ${pos - 1}`);
  }
  for (let pos = 20; pos <= 100; pos++) {
    assert.ok(values[pos] > values[pos - 1], `position ${pos} is above position ${pos - 1}`);
  }
});

test("a shell list is summarised in one line", () => {
  assert.equal(F.formatShellSummary([{ altKm: 550, share: 0.5 }, { altKm: 1200, share: 0.5 }]),
    "550 km 50% · 1200 km 50%");
  const many = [];
  for (let i = 0; i < 54; i++) many.push({ altKm: 565 + i * (437 / 53), share: 1 / 54 });
  assert.equal(F.formatShellSummary(many), "54 shells · 565–1,002 km");
});

test("a ratio is a multiple above 1 and one part in so many below it", () => {
  assert.equal(F.formatRatio(23.4), "23×");
  assert.equal(F.formatRatio(2.44), "2.4×");
  assert.equal(F.formatRatio(1), "1.0×");
  assert.equal(F.formatRatio(0.5), "1/2.0");
  assert.equal(F.formatRatio(0.0461), "1/22");
  assert.equal(F.formatRatio(0.00077), "1/1,299");
  assert.equal(F.formatRatio(1234.5), "1,235×");
  // just under 1 is still "about the same", written as a multiple
  assert.equal(F.formatRatio(0.97), "1.0×");
  assert.equal(F.formatRatio(0), "0");
  assert.equal(F.formatRatio(NaN), "0");
});
