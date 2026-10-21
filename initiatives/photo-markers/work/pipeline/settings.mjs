import { Temporal } from "@js-temporal/polyfill";
import { ExportError } from "./errors.mjs";
const fail = (message, details) => {
  throw new ExportError("validation", message, details);
};
export const friendlyColors = Object.freeze({
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  orange: "#ffa500",
  purple: "#800080",
  grey: "#808080",
  gray: "#808080",
  pink: "#f4a6c1",
  "light green": "#b6d7a8",
  lightgreen: "#b6d7a8",
  "light blue": "#a8c8e8",
  lightblue: "#a8c8e8",
  "light grey": "#d9d9d9",
  "light gray": "#d9d9d9",
  lightgrey: "#d9d9d9",
  lightgray: "#d9d9d9",
  "light orange": "#f9c98a",
  lightorange: "#f9c98a",
  "light purple": "#d6b8e8",
  lightpurple: "#d6b8e8",
  "light pink": "#f4c2d7",
  "light yellow": "#f5eca3",
  peach: "#f9cba3",
  lavender: "#d3b8e8",
  cream: "#f5f0d9",
  mint: "#b8e8d0",
  butter: "#f5e7a3",
});
export const defaults = Object.freeze({
  title: "",
  shape: "donut",
  size: 2000,
  font: "noto-bold",
  outline_width: "auto",
  background_color: "#000000",
  shape_color: "#ff0000",
  center_color: "#b6d7a8",
  text_color: "#000000",
  outline_color: "#ffffff",
});
const allowed = new Set([...Object.keys(defaults), "date", "time", "timezone", "occurrence"]);
export function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function blank(v) {
  return v === undefined || v === null || (typeof v === "string" && !v.trim());
}
function text(v, label) {
  if (typeof v !== "string") fail(`${label} must be text.`);
  return v.trim();
}
function integer(v, min, max, label) {
  if (typeof v !== "number" && !(typeof v === "string" && /^\d+$/.test(v)))
    fail(`${label} must be an integer from ${min} to ${max}.`);
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    fail(`${label} must be an integer from ${min} to ${max}.`);
  return n;
}
export function color(value, label) {
  let c = text(value, label).toLowerCase();
  if (Object.hasOwn(friendlyColors, c)) return friendlyColors[c];
  if (/^#[0-9a-f]{3}$/.test(c)) c = "#" + [...c.slice(1)].map((x) => x + x).join("");
  if (!/^#[0-9a-f]{6}$/.test(c)) fail(`${label} needs opaque RGB hex or a supported color name.`);
  return c;
}
export function normalizeStyle(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail("Settings must be an object.");
  for (const key of Object.keys(input)) if (!allowed.has(key)) fail(`Unknown setting: ${key}`);
  const s = { ...defaults };
  for (const key of Object.keys(defaults))
    if (!blank(input[key]) || key === "title") {
      if (input[key] !== undefined && input[key] !== null) s[key] = input[key];
    }
  if (typeof s.title !== "string" || /[\u0000-\u001f\u007f-\u009f]/.test(s.title))
    fail("Title must be one line of printable text.");
  if (!["donut", "star", "solid"].includes(s.shape)) fail("Choose donut, star or solid.");
  s.size = integer(s.size, 256, 4096, "Size");
  s.outline_width =
    s.outline_width === "auto" ? "auto" : integer(s.outline_width, 0, 64, "Outline width");
  if (typeof s.font !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(s.font))
    fail("Choose a bundled font or a session-local font key.");
  for (const key of [
    "background_color",
    "shape_color",
    "center_color",
    "text_color",
    "outline_color",
  ])
    s[key] = color(s[key], key);
  return s;
}
function zone(value) {
  if (typeof value !== "string" || !value || value.length > 100 || /^[+-]/.test(value))
    fail("Choose an IANA timezone or UTC.");
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(value);
  } catch {
    fail("Choose a valid IANA timezone or UTC.");
  }
  return value;
}
function instant(value) {
  try {
    const t =
      typeof value === "number"
        ? Temporal.Instant.fromEpochMilliseconds(value)
        : Temporal.Instant.from(value);
    return t.round({ smallestUnit: "second", roundingMode: "floor" });
  } catch {
    fail("The captured current instant is invalid.");
  }
}
export function captureRun({
  now = Date.now(),
  timezone,
  detectZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
} = {}) {
  let fallback = false;
  if (!timezone) {
    try {
      timezone = zone(detectZone());
    } catch {
      timezone = "UTC";
      fallback = true;
    }
  }
  return freeze({
    now: instant(now).toString({ smallestUnit: "second" }),
    timezone: zone(timezone),
    fallback,
  });
}
function resolved(z, source, occurrence = "") {
  if (z.year < 1900 || z.year > 2099) fail("Supported years are 1900–2099.");
  if (!/^[+-]\d{2}:\d{2}$/.test(z.offset))
    fail(
      "This historical timezone offset includes seconds and cannot be written exactly as EXIF HH:MM. Choose another date or timezone.",
    );
  const pad = (x) => String(x).padStart(2, "0");
  return {
    local: `${z.year}:${pad(z.month)}:${pad(z.day)} ${pad(z.hour)}:${pad(z.minute)}:${pad(z.second)}`,
    offset: z.offset,
    instant: z.toInstant().toString({ smallestUnit: "second" }),
    timezone: z.timeZoneId,
    occurrence,
    source,
  };
}
export function resolveTime(input, run) {
  const tz = zone(blank(input.timezone) ? run.timezone : text(input.timezone, "Timezone"));
  const date = blank(input.date) ? "" : text(input.date, "Date"),
    time = blank(input.time) ? "" : text(input.time, "Time");
  const occurrence = blank(input.occurrence) ? "" : text(input.occurrence, "Occurrence");
  if (!["", "earlier", "later"].includes(occurrence)) fail("Occurrence must be earlier or later.");
  if (!date) {
    if (time) fail("Enter a date or clear the time to request now.");
    return resolved(instant(run.now).toZonedDateTimeISO(tz), "now");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("Enter date as YYYY-MM-DD.");
  const year = Number(date.slice(0, 4));
  if (year < 1900 || year > 2099) fail("Supported years are 1900–2099.");
  const wallTime = time || "00:00:00";
  if (
    !/^\d{2}:\d{2}(:\d{2})?$/.test(wallTime) ||
    Number(wallTime.slice(0, 2)) > 23 ||
    Number(wallTime.slice(3, 5)) > 59 ||
    Number(wallTime.slice(6) || 0) > 59
  )
    fail("Enter a real 24-hour time as HH:MM or HH:MM:SS.");
  let plain, earlier, later;
  try {
    plain = Temporal.PlainDateTime.from(date + "T" + wallTime, { overflow: "reject" });
    earlier = plain.toZonedDateTime(tz, { disambiguation: "earlier" });
    later = plain.toZonedDateTime(tz, { disambiguation: "later" });
  } catch {
    fail("Enter a real calendar date and time.");
  }
  if (!earlier.toPlainDateTime().equals(plain) || !later.toPlainDateTime().equals(plain))
    fail("This local time does not exist in that timezone. Choose another time.");
  const ambiguous = earlier.epochNanoseconds !== later.epochNanoseconds;
  if (ambiguous && !occurrence)
    fail("This local time repeats. Choose Earlier or Later.", {
      choices: [resolved(earlier, "explicit", "earlier"), resolved(later, "explicit", "later")],
    });
  return resolved(
    occurrence === "later" ? later : earlier,
    "explicit",
    ambiguous ? occurrence : "",
  );
}
export function resolveSettings(input, run = captureRun()) {
  const style = normalizeStyle(input);
  const t = resolveTime(input, run);
  return freeze({ ...style, timestamp: t, capturedNow: run.now, timezoneFallback: run.fallback });
}
export function validateSnapshot(s) {
  if (!s || !s.timestamp) fail("Missing frozen export settings.");
  const input = Object.fromEntries(Object.keys(defaults).map((k) => [k, s[k]]));
  const style = normalizeStyle(input),
    t = s.timestamp;
  if (
    !["now", "explicit"].includes(t.source) ||
    typeof t.local !== "string" ||
    !/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(t.local)
  )
    fail("Invalid frozen timestamp.");
  const timeInput =
    t.source === "now"
      ? { timezone: t.timezone }
      : {
          date: t.local.slice(0, 10).replaceAll(":", "-"),
          time: t.local.slice(11),
          timezone: t.timezone,
          occurrence: t.occurrence,
        };
  const actual = resolveTime(timeInput, { now: s.capturedNow, timezone: t.timezone });
  for (const key of ["local", "offset", "instant", "timezone", "occurrence", "source"])
    if (actual[key] !== t[key])
      fail("Frozen timestamp no longer matches its date, timezone and occurrence.");
  return freeze({
    ...style,
    timestamp: actual,
    capturedNow: s.capturedNow,
    timezoneFallback: !!s.timezoneFallback,
  });
}
