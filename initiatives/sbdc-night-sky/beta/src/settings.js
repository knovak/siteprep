// SBDC Night-Sky Simulator — settings files (beta). Developed by Ken Novak and David Sandalow, draft for review 2026-07-20
/**
 * sbdc settings — every user setting as one data object, and the text file
 * that carries it. No DOM and no simulation here: this module only describes
 * the settings, writes them as YAML, and reads YAML back.
 *
 *   SETTINGS_FIELDS       the schema: one row per setting
 *   defaultSettings()     the simulator's defaults as a settings object
 *   settingsToYaml(s)     settings object -> commented YAML text
 *   settingsFromYaml(t)   YAML text -> { name, settings, notes, errors }
 *
 * The same format serves an exported file, an imported file, and a preset
 * (presets/*.yaml, embedded by the build). A key left out of a file takes its
 * default, so a preset lists only what it changes.
 *
 * The YAML read here is a small subset, enough for a file a person edits by
 * hand: comments, `key: value` lines, and one level of indented sections.
 *
 * Every top-level name starts with "settings" or "SETTINGS" because the build
 * puts all source files in one scope.
 */
import { parseShellSpec } from "./model.js";

const SETTINGS_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SETTINGS_MONTH_FULL = ["january", "february", "march", "april", "may", "june", "july",
                             "august", "september", "october", "november", "december"];
const SETTINGS_MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/* ------------------------- dates and times ------------------------- */

/** Day of year (1-365, the model's calendar has no Feb 29) -> "Oct 20". */
export function settingsFormatDate(doy) {
  let d = doy;
  for (let i = 0; i < 12; i++) {
    if (d <= SETTINGS_MONTH_LENGTHS[i]) return `${SETTINGS_MONTH_NAMES[i]} ${d}`;
    d -= SETTINGS_MONTH_LENGTHS[i];
  }
  return "Dec 31";
}

/** "Oct 20", "October 20", "20 Oct" or "10-20" -> day of year, or null. */
export function settingsParseDate(text) {
  const s = String(text).trim();
  let month = null, day = null, m;
  // a month is its full name or a short form of it: Oct, Sept, October
  const monthIndex = (word) => SETTINGS_MONTH_FULL.findIndex((n) => n.startsWith(word.toLowerCase()));
  if ((m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})$/))) {
    month = monthIndex(m[1]); day = +m[2];
  } else if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?$/))) {
    month = monthIndex(m[2]); day = +m[1];
  } else if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})$/))) {
    month = +m[1] - 1; day = +m[2];
  }
  if (month == null || month < 0 || month > 11) return null;
  if (day < 1 || day > SETTINGS_MONTH_LENGTHS[month]) return null;
  let doy = day;
  for (let i = 0; i < month; i++) doy += SETTINGS_MONTH_LENGTHS[i];
  return doy;
}

/**
 * A time setting is one of
 *   { clock: minutes }                 local solar time, 0-1439
 *   { ref: "sunset"|"dawn", offsetMin }  minutes after (+) or before (-)
 * "dawn" is the simulator's own name for sunrise; files say "sunrise".
 */
export function settingsFormatTime(t) {
  if (t.ref) {
    const word = t.ref === "dawn" ? "sunrise" : "sunset";
    if (!t.offsetMin) return word;
    return `${word} ${t.offsetMin > 0 ? "+" : "-"}${Math.abs(t.offsetMin)}`;
  }
  const hh = Math.floor(t.clock / 60), mm = t.clock % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "20:41", "sunset", "sunset +30", "sunrise -30" -> time setting, or null. */
export function settingsParseTime(text) {
  const s = String(text).trim();
  let m;
  if ((m = s.match(/^(\d{1,2}):(\d{2})$/))) {
    const hh = +m[1], mm = +m[2];
    if (hh > 23 || mm > 59) return null;
    return { clock: hh * 60 + mm };
  }
  if ((m = s.match(/^(sunset|sunrise|dawn)(?:\s*([+\-−])\s*(\d{1,3})(?:\s*(?:m|min|mins|minutes))?)?$/i))) {
    const ref = m[1].toLowerCase() === "sunset" ? "sunset" : "dawn";
    const offsetMin = m[3] == null ? 0 : (m[2] === "+" ? 1 : -1) * +m[3];
    if (Math.abs(offsetMin) > 720) return null;
    return { ref, offsetMin };
  }
  return null;
}

/* ------------------------- the schema ------------------------- */

/**
 * One row per setting, in the order the file is written. Sections follow the
 * four groups of controls on the page. Types:
 *   number  a number within [min, max]; `digits` decimals when written
 *   int     a whole number within [min, max]
 *   bool    true or false
 *   choice  one of `options`
 *   text    free text
 *   date    month and day, held as a day of year
 *   time    clock time or a twilight-relative time (see settingsParseTime)
 * Ranges are the ranges of the page's controls. Where a slider has coarser
 * steps than the file allows, the page moves to the nearest step on import.
 */
export const SETTINGS_FIELDS = [
  { section: "observer", key: "latitude", type: "int", min: -90, max: 90, def: 40,
    note: "degrees, -90 (south pole) to 90 (north pole)" },
  { section: "observer", key: "date", type: "date", def: 172,
    note: "month and day, e.g. Oct 20" },
  { section: "observer", key: "time", type: "time", def: { ref: "sunset", offsetMin: 30 },
    note: "sunset or sunrise, plus or minus minutes; or a clock time such as \"21:30\"" },
  { section: "observer", key: "hold_time_to_twilight", type: "bool", def: false,
    note: "keep the time relative to sunset or sunrise when latitude or date change" },

  { section: "constellation", key: "satellites", type: "int", min: 10000, max: 1000000, def: 300000,
    note: "10000 to 1000000" },
  { section: "constellation", key: "sso_percent", type: "int", min: 0, max: 100, def: 70,
    note: "percent in Sun-synchronous orbits; the rest are in the 30-degree shell" },
  { section: "constellation", key: "shells", type: "choice",
    options: ["low", "mid", "spread", "custom"], def: "spread",
    note: "low, mid, spread, or custom" },
  { section: "constellation", key: "custom_shells", type: "text", def: "",
    note: "used when shells is custom: altitude:share pairs, e.g. \"550:0.5, 1200:0.5\"" },
  { section: "constellation", key: "brightness_mag", type: "number", min: -7, max: 7, digits: 1, def: 0.5,
    note: "median magnitude at 1,000 km; 0.5 unmitigated, 5.5 strong mitigation, 7 IAU target" },
  { section: "constellation", key: "launch_trains", type: "int", min: 0, max: 10, def: 1,
    note: "0 to 10" },
  { section: "constellation", key: "clustering", type: "bool", def: false,
    note: "group satellites into data-center clusters" },
  { section: "constellation", key: "satellites_per_cluster", type: "int", min: 10, max: 1000, def: 100,
    note: "10 to 1000" },
  { section: "constellation", key: "cluster_diameter_km", type: "number", min: 0.2, max: 10, digits: 1, def: 1,
    note: "0.2 to 10" },

  { section: "display", key: "view", type: "choice", options: ["horizon", "fisheye"], def: "horizon",
    note: "horizon or fisheye" },
  { section: "display", key: "facing", type: "number", min: 0, max: 360, digits: 1, def: 0,
    note: "horizon view: compass direction at the center, degrees (0 north, 90 east)" },
  { section: "display", key: "look_altitude", type: "number", min: -5, max: 80, digits: 1, def: 28,
    note: "horizon view: altitude at the center, degrees, -5 to 80" },
  { section: "display", key: "field_of_view", type: "number", min: 20, max: 140, digits: 1, def: 110,
    note: "horizon view: width of the view, degrees, 20 to 140" },
  { section: "display", key: "sky_limit_mag", type: "number", min: 4, max: 6.5, digits: 1, def: 6,
    note: "faintest magnitude the eye sees, 4.0 to 6.5; lower is a light-polluted site" },
  { section: "display", key: "show_stars", type: "bool", def: true, note: "" },
  { section: "display", key: "long_exposure", type: "bool", def: false,
    note: "30-second camera view" },

  { section: "advanced", key: "seed", type: "int", min: -2147483648, max: 2147483647, def: 12345,
    note: "same seed, same constellation" },
  { section: "advanced", key: "tint_by_orbit_family", type: "bool", def: false, note: "" },
  { section: "advanced", key: "mark_celestial_pole", type: "bool", def: true, note: "" },
  { section: "advanced", key: "satellites_move_in_fast_forward", type: "bool", def: true, note: "" },
  { section: "advanced", key: "cluster_membership_variation", type: "number", min: 0, max: 1, digits: 2, def: 0.35,
    note: "0 to 1" },
  { section: "advanced", key: "cluster_diameter_variation", type: "number", min: 0, max: 1, digits: 2, def: 0.35,
    note: "0 to 1" },
];

export const SETTINGS_SECTIONS = [...new Set(SETTINGS_FIELDS.map((f) => f.section))];

/** The simulator's defaults, as a fresh settings object. */
export function defaultSettings() {
  const out = {};
  for (const f of SETTINGS_FIELDS) {
    if (!out[f.section]) out[f.section] = {};
    out[f.section][f.key] = f.type === "time" ? { ...f.def } : f.def;
  }
  return out;
}

/* ------------------------- writing ------------------------- */

/** A string as a YAML scalar: plain where that is unambiguous, else quoted. */
function settingsQuote(text) {
  const s = String(text);
  const plain = s !== "" && s === s.trim() &&
    !/^[-?:,[\]{}#&*!|>'"%@`]/.test(s) && !/: |:$| #|[\n\t]/.test(s) &&
    !/^(true|false|yes|no|on|off|null|~)$/i.test(s) && !/^[-+.]?\d/.test(s);
  return plain ? s : `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** One setting as it is written in a file. Also used to compare two values. */
export function settingsFormatValue(field, value) {
  switch (field.type) {
    case "int": return String(Math.round(value));
    case "number": return Number(value).toFixed(field.digits);
    case "bool": return value ? "true" : "false";
    case "date": return settingsFormatDate(value);
    case "time": return value.ref ? settingsFormatTime(value) : `"${settingsFormatTime(value)}"`;
    case "text": return settingsQuote(value);
    default: return String(value);
  }
}

/**
 * Settings object -> YAML text. `options.name` adds the title line a preset
 * needs; `options.date` (YYYY-MM-DD) is noted in the header.
 */
export function settingsToYaml(settings, options = {}) {
  const lines = [
    "# SBDC Night-Sky Simulator settings",
    options.date ? `# Exported ${options.date}.` : null,
    "#",
    "# Change any value, save the file, and load it with \"Import settings\".",
    "# Text after a # is a comment. A key that is left out takes its default.",
    "",
  ].filter((l) => l !== null);
  if (options.name) lines.push(`name: ${settingsQuote(options.name)}`, "");
  for (const section of SETTINGS_SECTIONS) {
    lines.push(`${section}:`);
    const rows = SETTINGS_FIELDS.filter((f) => f.section === section).map((f) => {
      const value = settings[section] && f.key in settings[section] ? settings[section][f.key] : f.def;
      return [`  ${f.key}: ${settingsFormatValue(f, value)}`, f.note];
    });
    const width = Math.max(...rows.map((r) => r[0].length));
    for (const [left, note] of rows) lines.push(note ? `${left.padEnd(width)}  # ${note}` : left);
    lines.push("");
  }
  return lines.join("\n");
}

/* ------------------------- reading ------------------------- */

/** Cut a trailing comment: a # at the start or after a space, outside quotes. */
function settingsStripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\" && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      // a quote opens a string only where a value starts
      const before = line.slice(0, i).trim();
      if (before === "" || before.endsWith(":")) quote = c;
    } else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

/** A YAML scalar -> string, number, boolean or null. Throws on a bad quote. */
function settingsScalar(raw) {
  const s = raw.trim();
  if (s[0] === '"') {
    if (s.length < 2 || s[s.length - 1] !== '"') throw new Error("a quoted value needs a closing \"");
    return s.slice(1, -1).replace(/\\(.)/g, (_, c) => (c === "n" ? "\n" : c === "t" ? "\t" : c));
  }
  if (s[0] === "'") {
    if (s.length < 2 || s[s.length - 1] !== "'") throw new Error("a quoted value needs a closing '");
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (/^(true|yes|on)$/i.test(s)) return true;
  if (/^(false|no|off)$/i.test(s)) return false;
  if (/^(null|~)$/i.test(s)) return null;
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return Number(s);
  return s;
}

/**
 * The YAML subset -> { values, errors }. `values` maps "key" and
 * "section.key" to { value, line }. Errors are { line, message }.
 */
export function settingsParseYaml(text) {
  const values = new Map();
  const errors = [];
  const sections = new Set();
  let section = null;
  const rows = String(text).replace(/^﻿/, "").split(/\r?\n/);
  rows.forEach((row, index) => {
    const line = index + 1;
    const body = settingsStripComment(row).replace(/\s+$/, "");
    if (body.trim() === "" || body === "---" || body === "...") return;
    const indentText = body.match(/^\s*/)[0];
    if (indentText.includes("\t")) {
      errors.push({ line, message: "indent with spaces, not tabs" });
      return;
    }
    const content = body.trim();
    if (/^-(\s|$)/.test(content)) {
      errors.push({ line, message: "lists are not used in a settings file" });
      return;
    }
    const m = content.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:(?:\s+(.*))?$/);
    if (!m) {
      errors.push({ line, message: `expected "key: value", found "${content}"` });
      return;
    }
    const key = m[1].toLowerCase();
    const hasValue = m[2] !== undefined && m[2].trim() !== "";
    const indented = indentText.length > 0;
    if (!indented && !hasValue) {
      if (sections.has(key)) errors.push({ line, message: `section "${key}" appears twice` });
      sections.add(key);
      section = key;
      return;
    }
    if (indented && section == null) {
      errors.push({ line, message: `"${key}" is indented but is not under a section` });
      return;
    }
    if (indented && !hasValue) {
      errors.push({ line, message: `"${key}" has no value` });
      return;
    }
    if (!indented) section = null;
    const path = indented ? `${section}.${key}` : key;
    if (values.has(path)) {
      errors.push({ line, message: `"${path}" appears twice` });
      return;
    }
    try {
      values.set(path, { value: settingsScalar(m[2]), line });
    } catch (e) {
      errors.push({ line, message: `${path}: ${e.message}` });
    }
  });
  return { values, errors };
}

/** Check one value against its field. Returns { value } or { error }, with an optional note. */
function settingsCoerce(field, raw) {
  switch (field.type) {
    case "int":
    case "number": {
      if (typeof raw !== "number" || !Number.isFinite(raw)) return { error: "expected a number" };
      let v = field.type === "int" ? Math.round(raw) : raw;
      let note = null;
      if (v < field.min || v > field.max) {
        v = Math.min(field.max, Math.max(field.min, v));
        note = `is outside ${field.min} to ${field.max}; using ${v}`;
      }
      return { value: v, note };
    }
    case "bool":
      return typeof raw === "boolean" ? { value: raw } : { error: "expected true or false" };
    case "choice": {
      const v = String(raw).toLowerCase();
      return field.options.includes(v) ? { value: v }
        : { error: `expected one of ${field.options.join(", ")}` };
    }
    case "text":
      return { value: String(raw).trim() };
    case "date": {
      const doy = settingsParseDate(raw);
      return doy == null ? { error: "expected a month and day, such as Oct 20" } : { value: doy };
    }
    case "time": {
      const t = settingsParseTime(raw);
      return t == null
        ? { error: "expected a time such as \"21:30\", sunset +30, or sunrise -30" }
        : { value: t };
    }
    default:
      return { error: "unknown setting type" };
  }
}

/**
 * YAML text -> { name, settings, notes, errors }.
 *
 * `settings` is complete: every key the file leaves out has its default.
 * `errors` (strings) mean the file cannot be used and `settings` is null.
 * `notes` (strings) report what was read but changed or ignored: a value
 * moved into range, or a key this version does not know.
 */
export function settingsFromYaml(text) {
  const { values, errors: parseErrors } = settingsParseYaml(text);
  const problems = parseErrors.map((e) => ({ line: e.line, text: e.message }));
  const notes = [];
  const settings = defaultSettings();
  let name = null;
  const known = new Map(SETTINGS_FIELDS.map((f) => [`${f.section}.${f.key}`, f]));

  for (const [path, { value, line }] of values) {
    if (path === "name") {
      if (value != null) name = String(value).trim() || null;
      continue;
    }
    const field = known.get(path);
    if (!field) {
      notes.push(`line ${line}: "${path}" is not a setting and was ignored`);
      continue;
    }
    if (value == null) continue;                      // an explicit null is "use the default"
    const got = settingsCoerce(field, value);
    if (got.error) {
      problems.push({ line, text: `${path}: ${got.error}` });
      continue;
    }
    if (got.note) notes.push(`line ${line}: ${path} ${got.note}`);
    settings[field.section][field.key] = got.value;
  }

  const errors = problems.sort((a, b) => a.line - b.line).map((e) => `line ${e.line}: ${e.text}`);
  if (!errors.length && settings.constellation.shells === "custom" &&
      !parseShellSpec(settings.constellation.custom_shells)) {
    errors.push("constellation.shells is custom, so constellation.custom_shells needs " +
      "altitude:share pairs such as \"550:0.5, 1200:0.5\"");
  }
  if (!errors.length && values.size === 0) errors.push("the file has no settings in it");
  return errors.length
    ? { name, settings: null, notes, errors }
    : { name, settings, notes, errors };
}
