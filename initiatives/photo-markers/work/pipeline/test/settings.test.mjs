import test from "node:test";
import assert from "node:assert/strict";
import { captureRun, resolveSettings, validateSnapshot, normalizeStyle } from "../settings.mjs";
const fixed = "2026-10-20T14:05:06Z";
export const timeCases = [
  ["now", { timezone: "Australia/Brisbane" }, "2026:10:21 00:05:06", "+10:00", fixed],
  [
    "midnight",
    { date: "2026-10-21", timezone: "Australia/Brisbane" },
    "2026:10:21 00:00:00",
    "+10:00",
    "2026-10-20T14:00:00Z",
  ],
  [
    "seconds",
    { date: "2026-10-21", time: "12:34:56", timezone: "UTC" },
    "2026:10:21 12:34:56",
    "+00:00",
    "2026-10-21T12:34:56Z",
  ],
  [
    "minutes",
    { date: "2026-10-21", time: "12:34", timezone: "UTC" },
    "2026:10:21 12:34:00",
    "+00:00",
    "2026-10-21T12:34:00Z",
  ],
  [
    "half",
    { date: "2026-10-21", timezone: "Asia/Kolkata" },
    "2026:10:21 00:00:00",
    "+05:30",
    "2026-10-20T18:30:00Z",
  ],
  [
    "quarter",
    { date: "2026-10-21", timezone: "Asia/Kathmandu" },
    "2026:10:21 00:00:00",
    "+05:45",
    "2026-10-20T18:15:00Z",
  ],
  [
    "earlier",
    { date: "2026-11-01", time: "01:30", timezone: "America/Los_Angeles", occurrence: "earlier" },
    "2026:11:01 01:30:00",
    "-07:00",
    "2026-11-01T08:30:00Z",
  ],
  [
    "later",
    { date: "2026-11-01", time: "01:30", timezone: "America/Los_Angeles", occurrence: "later" },
    "2026:11:01 01:30:00",
    "-08:00",
    "2026-11-01T09:30:00Z",
  ],
  [
    "leap",
    { date: "2000-02-29", timezone: "UTC" },
    "2000:02:29 00:00:00",
    "+00:00",
    "2000-02-29T00:00:00Z",
  ],
  [
    "lower",
    { date: "1900-01-01", timezone: "UTC" },
    "1900:01:01 00:00:00",
    "+00:00",
    "1900-01-01T00:00:00Z",
  ],
  [
    "upper",
    { date: "2099-12-31", time: "23:59:59", timezone: "UTC" },
    "2099:12:31 23:59:59",
    "+00:00",
    "2099-12-31T23:59:59Z",
  ],
];
const run = captureRun({ now: fixed, timezone: "Pacific/Auckland" });
for (const [id, input, local, offset, instant] of timeCases)
  test("exact timestamp: " + id, () => {
    const s = resolveSettings(input, run);
    assert.equal(s.timestamp.local, local);
    assert.equal(s.timestamp.offset, offset);
    assert.equal(s.timestamp.instant, instant);
    assert.deepEqual(validateSnapshot(s), s);
  });
for (const input of [
  { date: "1900-02-29" },
  { date: "2026-02-30" },
  { date: "1899-12-31" },
  { date: "2100-01-01" },
  { time: "12:00" },
  { date: "2026-01-01", time: "24:00" },
  { date: "2026-01-01", time: "23:59:60" },
  { date: "2026-01-01", time: "1:30" },
  { timezone: "+10:00" },
  { timezone: "Unknown/Nowhere" },
  { date: "2026-03-08", time: "02:30", timezone: "America/Los_Angeles" },
  { date: "2011-12-30", timezone: "Pacific/Apia" },
  { date: "1900-01-01", timezone: "Europe/Paris" },
])
  test("reject invalid or unrepresentable time " + JSON.stringify(input), () =>
    assert.throws(
      () => resolveSettings(input, run),
      (e) => e.stage === "validation",
    ),
  );
test("ambiguous wall time exposes two explicit choices", () =>
  assert.throws(
    () =>
      resolveSettings({ date: "2026-11-01", time: "01:30", timezone: "America/Los_Angeles" }, run),
    (e) =>
      e.details.choices[0].instant === "2026-11-01T08:30:00Z" &&
      e.details.choices[1].instant === "2026-11-01T09:30:00Z",
  ));
test("timezone detection failure is a visible frozen UTC fallback", () => {
  const r = captureRun({
    now: fixed,
    detectZone: () => {
      throw Error("unavailable");
    },
  });
  assert.equal(r.timezone, "UTC");
  assert.equal(r.fallback, true);
  assert.ok(Object.isFrozen(r));
});
test("now is captured once, truncated to seconds, and new runs can change it", () => {
  const r = captureRun({ now: "2026-10-20T23:59:59.999Z", timezone: "UTC" });
  assert.equal(resolveSettings({}, r).timestamp.instant, "2026-10-20T23:59:59Z");
  assert.equal(resolveSettings({}, r).timestamp.instant, resolveSettings({}, r).timestamp.instant);
  assert.notEqual(
    resolveSettings({}, captureRun({ now: "2026-10-21T00:00:00Z", timezone: "UTC" })).timestamp
      .instant,
    resolveSettings({}, r).timestamp.instant,
  );
});
test("unused occurrence does not change an unambiguous instant", () =>
  assert.equal(
    resolveSettings({ date: "2026-10-21", timezone: "UTC", occurrence: "later" }, run).timestamp
      .occurrence,
    "",
  ));
for (const input of [
  { size: 255 },
  { size: 4097 },
  { size: NaN },
  { size: 2000.5 },
  { size: "2000.5" },
  { outline_width: -1 },
  { outline_width: 65 },
  { outline_width: 1.5 },
  { title: "two\nlines" },
  { title: 4 },
  { shape: "circle" },
  { font: "https://example.com/font.ttf" },
  { center_color: "transparent", shape: "solid" },
  { background_color: "#ffff" },
  { extra: true },
])
  test("reject invalid settings " + JSON.stringify(input), () =>
    assert.throws(
      () => normalizeStyle(input),
      (e) => e.stage === "validation",
    ),
  );
test("legacy colors and hidden design values survive normalization", () => {
  const a = normalizeStyle({
    shape: "solid",
    center_color: "light green",
    shape_color: "pink",
    background_color: "#abc",
    outline_width: 0,
  });
  assert.equal(a.center_color, "#b6d7a8");
  assert.equal(a.shape_color, "#f4a6c1");
  assert.equal(a.background_color, "#aabbcc");
  assert.equal(a.outline_width, 0);
  assert.equal(normalizeStyle({ ...a, shape: "donut" }).center_color, a.center_color);
});
test("frozen timestamp tampering is refused", () => {
  const s = structuredClone(resolveSettings({ timezone: "UTC" }, run));
  s.timestamp.offset = "+10:00";
  assert.throws(() => validateSnapshot(s), /Frozen timestamp/);
});
