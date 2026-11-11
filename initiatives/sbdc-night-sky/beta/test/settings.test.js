// Settings files and presets (beta): the data object, its YAML file, and the
// presets/*.yaml files the build embeds. Pure-module tests, no browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  SETTINGS_FIELDS, defaultSettings, settingsToYaml, settingsFromYaml,
  settingsParseYaml, settingsParseDate, settingsFormatDate,
  settingsParseTime, settingsFormatTime,
} from "../src/settings.js";
import { DEFAULT_VIEW } from "../src/render.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("dates: every day of the year survives a round trip", () => {
  for (let doy = 1; doy <= 365; doy++) {
    assert.equal(settingsParseDate(settingsFormatDate(doy)), doy);
  }
  assert.equal(settingsFormatDate(293), "Oct 20");
});

test("dates: the spellings a person might type", () => {
  assert.equal(settingsParseDate("Oct 20"), 293);
  assert.equal(settingsParseDate("October 20"), 293);
  assert.equal(settingsParseDate("20 Oct"), 293);
  assert.equal(settingsParseDate("10-20"), 293);
  assert.equal(settingsParseDate("mar 15"), 74);
  assert.equal(settingsParseDate("Jun 20"), 171);
  assert.equal(settingsParseDate("Feb 29"), null);   // the model's year has 365 days
  assert.equal(settingsParseDate("Oct 32"), null);
  assert.equal(settingsParseDate("Octember 3"), null);
  assert.equal(settingsParseDate("tomorrow"), null);
});

test("times: clock and twilight-relative forms", () => {
  assert.deepEqual(settingsParseTime("21:30"), { clock: 1290 });
  assert.deepEqual(settingsParseTime("0:05"), { clock: 5 });
  assert.deepEqual(settingsParseTime("sunset"), { ref: "sunset", offsetMin: 0 });
  assert.deepEqual(settingsParseTime("sunset +30"), { ref: "sunset", offsetMin: 30 });
  assert.deepEqual(settingsParseTime("Sunset + 60 min"), { ref: "sunset", offsetMin: 60 });
  assert.deepEqual(settingsParseTime("sunrise -30"), { ref: "dawn", offsetMin: -30 });
  assert.deepEqual(settingsParseTime("dawn -60"), { ref: "dawn", offsetMin: -60 });
  assert.equal(settingsParseTime("24:00"), null);
  assert.equal(settingsParseTime("12:75"), null);
  assert.equal(settingsParseTime("noon"), null);
  assert.equal(settingsParseTime("sunset +999"), null);
  for (const t of [{ clock: 0 }, { clock: 1439 }, { ref: "sunset", offsetMin: 0 },
                   { ref: "sunset", offsetMin: 60 }, { ref: "dawn", offsetMin: -30 }]) {
    assert.deepEqual(settingsParseTime(settingsFormatTime(t)), t);
  }
});

test("defaults match the page's own starting values", () => {
  // The controls in index.html and the renderer's DEFAULT_VIEW are where the
  // simulator's defaults live. A default that changes there has to change in
  // SETTINGS_FIELDS too, or a preset would no longer mean "the defaults".
  const html = read("../src/index.html");
  const attr = (id, name) => {
    const tag = html.match(new RegExp(`<input id="${id}"[^>]*>`));
    assert.ok(tag, `control #${id} is in index.html`);
    const m = tag[0].match(new RegExp(`\\b${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  const checked = (id) => / checked/.test(html.match(new RegExp(`<input id="${id}"[^>]*>`))[0]);
  const selected = (id) => {
    const block = html.match(new RegExp(`<select id="${id}">[\\s\\S]*?</select>`))[0];
    return block.match(/<option value="([^"]*)" selected>/)[1];
  };
  const d = defaultSettings();

  assert.equal(d.observer.latitude, +attr("lat", "value"));
  assert.equal(d.observer.date, +attr("date", "value"));
  assert.equal(d.observer.hold_time_to_twilight, checked("timelock"));
  assert.equal(d.constellation.sso_percent, +attr("sso", "value"));
  assert.equal(d.constellation.shells, selected("shells"));
  assert.equal(d.constellation.brightness_mag, +attr("brightness", "value") / 10);
  assert.equal(d.constellation.launch_trains, +attr("trains", "value"));
  assert.equal(d.constellation.clustering, checked("clusteron"));
  assert.equal(d.display.view, selected("viewmode"));
  assert.equal(d.display.sky_limit_mag, +attr("starlim", "value") / 10);
  assert.equal(d.display.show_stars, checked("show-stars"));
  assert.equal(d.display.long_exposure, checked("longexp"));
  assert.equal(d.advanced.seed, +attr("seed", "value"));
  assert.equal(d.advanced.tint_by_orbit_family, checked("tint"));
  assert.equal(d.advanced.mark_celestial_pole, checked("markpole"));
  assert.equal(d.advanced.satellites_move_in_fast_forward, checked("shimmer"));
  assert.equal(d.advanced.cluster_membership_variation, +attr("cvar", "value") / 100);
  assert.equal(d.advanced.cluster_diameter_variation, +attr("cdvar", "value") / 100);

  assert.equal(d.display.view, DEFAULT_VIEW.mode);
  assert.equal(d.display.facing, DEFAULT_VIEW.centerAz);
  assert.equal(d.display.look_altitude, DEFAULT_VIEW.centerAlt);
  assert.equal(d.display.field_of_view, DEFAULT_VIEW.fovDeg);

  // ranges of the plain sliders
  const range = (section, key) => {
    const f = SETTINGS_FIELDS.find((x) => x.section === section && x.key === key);
    return [f.min, f.max];
  };
  assert.deepEqual(range("observer", "latitude"), [+attr("lat", "min"), +attr("lat", "max")]);
  assert.deepEqual(range("constellation", "sso_percent"), [+attr("sso", "min"), +attr("sso", "max")]);
  assert.deepEqual(range("constellation", "launch_trains"), [+attr("trains", "min"), +attr("trains", "max")]);
  assert.deepEqual(range("constellation", "brightness_mag"),
    [+attr("brightness", "min") / 10, +attr("brightness", "max") / 10]);
  assert.deepEqual(range("display", "sky_limit_mag"),
    [+attr("starlim", "min") / 10, +attr("starlim", "max") / 10]);
});

test("an exported file reads back as the same settings", () => {
  const s = defaultSettings();
  assert.deepEqual(settingsFromYaml(settingsToYaml(s)).settings, s);

  Object.assign(s.observer, { latitude: -24, date: 171, time: { clock: 1290 }, hold_time_to_twilight: true });
  Object.assign(s.constellation, {
    satellites: 63000, sso_percent: 45, shells: "custom", custom_shells: "550:0.5, 1200:0.5",
    brightness_mag: -2.5, launch_trains: 0, clustering: true, satellites_per_cluster: 398,
    cluster_diameter_km: 4.7,
  });
  Object.assign(s.display, {
    view: "fisheye", facing: 271.3, look_altitude: -5, field_of_view: 20, sky_limit_mag: 4.2,
    show_stars: false, long_exposure: true,
  });
  Object.assign(s.advanced, {
    seed: -987654321, tint_by_orbit_family: true, mark_celestial_pole: false,
    satellites_move_in_fast_forward: false, cluster_membership_variation: 0.05,
    cluster_diameter_variation: 1,
  });
  const text = settingsToYaml(s, { name: "Night: all changed # really", date: "2026-11-11" });
  const back = settingsFromYaml(text);
  assert.deepEqual(back.errors, []);
  assert.deepEqual(back.notes, []);
  assert.deepEqual(back.settings, s);
  assert.equal(back.name, "Night: all changed # really");
  assert.match(text, /^# Exported 2026-11-11\.$/m);
});

test("an exported file lists every setting once, with a comment line a person can follow", () => {
  const text = settingsToYaml(defaultSettings());
  for (const f of SETTINGS_FIELDS) {
    const hits = text.match(new RegExp(`^  ${f.key}: `, "gm")) || [];
    assert.equal(hits.length, 1, `${f.section}.${f.key} is written once`);
  }
  assert.match(text, /^observer:$/m);
  assert.match(text, /^  time: sunset \+30 +# /m);
  assert.match(text, /^  date: Jun 21 +# /m);
  assert.doesNotMatch(text, /^name:/m);
});

test("a key left out of a file takes its default", () => {
  const got = settingsFromYaml("observer:\n  latitude: -24\n");
  const want = defaultSettings();
  want.observer.latitude = -24;
  assert.deepEqual(got.settings, want);
  assert.equal(got.name, null);
});

test("reading: comments, quotes, blank lines, CRLF and a byte-order mark", () => {
  const text = "﻿# a comment\r\n---\r\nname: 'Ken''s sky'   # trailing comment\r\n\r\n" +
    "observer:\r\n    latitude:   12   # indented by four\r\n    time: \"06:15\"\r\n" +
    "constellation:\r\n  custom_shells: \"600:1 # not a comment\"\r\n  CLUSTERING: Yes\r\n";
  const got = settingsFromYaml(text);
  assert.deepEqual(got.errors, []);
  assert.equal(got.name, "Ken's sky");
  assert.equal(got.settings.observer.latitude, 12);
  assert.deepEqual(got.settings.observer.time, { clock: 375 });
  assert.equal(got.settings.constellation.custom_shells, "600:1 # not a comment");
  assert.equal(got.settings.constellation.clustering, true);
});

test("reading: a value out of range is moved into range and reported", () => {
  const got = settingsFromYaml("observer:\n  latitude: 95\nconstellation:\n  satellites: 5\n");
  assert.deepEqual(got.errors, []);
  assert.equal(got.settings.observer.latitude, 90);
  assert.equal(got.settings.constellation.satellites, 10000);
  assert.equal(got.notes.length, 2);
  assert.match(got.notes[0], /^line 2: observer\.latitude is outside -90 to 90; using 90$/);
});

test("reading: an unknown key is ignored and reported", () => {
  const got = settingsFromYaml("observer:\n  latitude: 10\n  longitude: 74\ncolour: red\n");
  assert.deepEqual(got.errors, []);
  assert.equal(got.settings.observer.latitude, 10);
  assert.deepEqual(got.notes, [
    'line 3: "observer.longitude" is not a setting and was ignored',
    'line 4: "colour" is not a setting and was ignored',
  ]);
});

test("reading: a file with a mistake is refused, with the line of each mistake", () => {
  const got = settingsFromYaml(
    "observer:\n  latitude: north\n  date: Feb 30\n\ttime: 9\n  hold_time_to_twilight: maybe\n" +
    "constellation:\n  shells: wide\n  - item\n  satellites 5\n");
  assert.equal(got.settings, null);
  assert.deepEqual(got.errors, [
    "line 2: observer.latitude: expected a number",
    "line 3: observer.date: expected a month and day, such as Oct 20",
    "line 4: indent with spaces, not tabs",
    "line 5: observer.hold_time_to_twilight: expected true or false",
    "line 7: constellation.shells: expected one of low, mid, spread, custom",
    "line 8: lists are not used in a settings file",
    'line 9: expected "key: value", found "satellites 5"',
  ]);
});

test("reading: repeated keys, stray indentation and empty files are refused", () => {
  assert.match(settingsFromYaml("observer:\n  latitude: 1\n  latitude: 2\n").errors[0], /appears twice/);
  assert.match(settingsFromYaml("  latitude: 1\n").errors[0], /not under a section/);
  assert.match(settingsFromYaml("name: x\n  latitude: 1\n").errors[0], /not under a section/);
  assert.match(settingsFromYaml("").errors[0], /no settings/);
  assert.match(settingsFromYaml("# only a comment\n").errors[0], /no settings/);
  assert.match(settingsFromYaml('name: "unfinished\n').errors[0], /closing/);
  assert.match(settingsFromYaml("{\"observer\": {\"latitude\": 3}}").errors[0], /expected "key: value"/);
});

test("reading: custom shells need a shell list", () => {
  const bad = settingsFromYaml("constellation:\n  shells: custom\n");
  assert.equal(bad.settings, null);
  assert.match(bad.errors[0], /custom_shells needs/);
  const good = settingsFromYaml("constellation:\n  shells: custom\n  custom_shells: \"550:0.5, 1200:0.5\"\n");
  assert.deepEqual(good.errors, []);
  assert.equal(good.settings.constellation.shells, "custom");
});

test("the YAML subset keeps line numbers and types", () => {
  const { values, errors } = settingsParseYaml("a: 1\nb:\n  c: -2.5\n  d: off\n  e: text here\n  f: ~\n");
  assert.deepEqual(errors, []);
  assert.deepEqual(values.get("a"), { value: 1, line: 1 });
  assert.deepEqual(values.get("b.c"), { value: -2.5, line: 3 });
  assert.deepEqual(values.get("b.d"), { value: false, line: 4 });
  assert.deepEqual(values.get("b.e"), { value: "text here", line: 5 });
  assert.deepEqual(values.get("b.f"), { value: null, line: 6 });
});

/* ------------------------- the preset files ------------------------- */

const presetFiles = readdirSync(new URL("../presets/", import.meta.url))
  .filter((name) => /\.ya?ml$/.test(name)).sort();
const presets = presetFiles.map((file) => ({ file, ...settingsFromYaml(read(`../presets/${file}`)) }));

test("every preset file reads cleanly and has a name of its own", () => {
  assert.ok(presets.length > 0, "there is at least one preset");
  for (const p of presets) {
    assert.deepEqual(p.errors, [], `${p.file} has no errors`);
    assert.deepEqual(p.notes, [], `${p.file} has nothing ignored or moved into range`);
    assert.ok(p.name, `${p.file} has a name`);
  }
  assert.equal(new Set(presets.map((p) => p.name)).size, presets.length, "preset names are unique");
});

test("the presets of this revision: place, date and time, and nothing else", () => {
  const want = [
    ["New York City, 30 minutes after sunset, October 20",
      { latitude: 41, date: "Oct 20", time: { ref: "sunset", offsetMin: 30 } }],
    ["Taos, New Mexico, 30 minutes before sunrise, March 15",
      { latitude: 36, date: "Mar 15", time: { ref: "dawn", offsetMin: -30 } }],
    ["Alice Springs Australia, 60 minutes after sunset, June 20",
      { latitude: -24, date: "Jun 20", time: { ref: "sunset", offsetMin: 60 } }],
  ];
  assert.deepEqual(presets.map((p) => p.name), want.map((w) => w[0]));
  presets.forEach((p, i) => {
    const expected = defaultSettings();
    expected.observer.latitude = want[i][1].latitude;
    expected.observer.date = settingsParseDate(want[i][1].date);
    expected.observer.time = want[i][1].time;
    assert.deepEqual(p.settings, expected, `${p.file} differs from the defaults only in place, date and time`);
  });
});
