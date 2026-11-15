# SBDC Night-Sky Simulator - beta

This folder is the beta line of the simulator. It has its own copy of the code,
it is published on every merge to `main`, and changing it cannot change the
released simulator.

| | Released | Beta |
| --- | --- | --- |
| Code | `../lib/` and `../work/` | this folder |
| Published at | `demos/SBDC Night Sky/` | `demos/SBDC Night Sky/beta/` |
| Changes when | someone asks for a release | a change to this folder merges |
| Label on the page | Released · changed *date* | Beta · changed *date* |

Live URLs:

- Released: <https://knovak.github.io/siteprep/demos/SBDC%20Night%20Sky/>
- Beta: <https://knovak.github.io/siteprep/demos/SBDC%20Night%20Sky/beta/>

A pull request's branch preview carries its own copy of both, under
`branch/<branch-name>/`, so a beta change can be looked at before it merges.

## What is here

`src/`, `data/`, `test/`, `tools/`, `build.js` and `package.json` started on
2026-11-11 as copies of the same files in `../lib/`. Two things differed from
`../lib/` on that day; the features added since are listed in the next
section:

- `build.js` accepts a directory: `node build.js <directory>` writes
  `<directory>/index.html`. Without an argument it writes
  `dist/sbdc-sky-simulator.html` as before. `dist/` is ignored by git here.
- `publish.mjs` is new. It is the step the site build runs.

The nine original documents (`README.md`, `TUTORIAL.md`, `SPECIFICATION.md`,
the plans and reports) are not copied. They stay in `../lib/` as the record of
the released simulator. Describe beta behavior that differs from them in this
file.

On the day it was created, the beta built a page byte-identical to the released
`demos/SBDC Night Sky/index.html`.

## What the beta has that the released simulator does not

| Since | Feature | Section below |
| --- | --- | --- |
| 2026-11-11 | Export and import of all settings as a text file, and presets | Settings files; Presets |
| 2026-11-15 | Eight faults corrected; counts in view beside the whole-sky totals; the time relative to sunset or sunrise | The November 2026 upgrade, Unit 1 |
| 2026-11-15 | Plane layout, plane spread, brightness scatter and phase law as settings; latitude to a tenth of a degree; three presets for the sdross0 setups; a link that carries the settings | The November 2026 upgrade, Unit 2 |

`PLAN.md` in this folder is the plan for the November 2026 upgrade, in five
units. Units 1 and 2 are described below; the others are added here as they
merge.

## Settings files

The first group in the sidebar, "Presets & settings", has a Preset list, an
"Export settings" button and an "Import settings…" button.

- **Export settings** downloads every setting as a YAML text file named like
  `sbdc-settings_lat41_Oct20_1757.yaml`.
- **Import settings…** reads such a file and sets every control from it.
- **Preset** sets every control from a settings file stored in the simulator.

All three use one data object and one file format. A file looks like this
(shortened here; an export lists every setting, each with a comment):

```yaml
name: New York City, 30 minutes after sunset, October 20

observer:
  latitude: 41                  # degrees, -90 (south pole) to 90 (north pole)
  date: Oct 20                  # month and day, e.g. Oct 20
  time: sunset +30              # sunset or sunrise, plus or minus minutes; or a clock time such as "21:30"
  hold_time_to_twilight: false

constellation:
  satellites: 300000            # 10000 to 1000000
  shells: spread                # low, mid, spread, or custom
```

The sections are the four groups of controls: `observer`, `constellation`,
`display`, `advanced`. `SETTINGS_FIELDS` in `src/settings.js` is the full list,
with each setting's type, range, default and comment.

Rules of the format:

- **A key that is left out takes its default.** A file therefore always gives
  the same result, whatever the simulator showed before it was loaded. A preset
  lists only what it changes.
- **`time`** is either relative to sunset or sunrise (`sunset`, `sunset +30`,
  `sunrise -30`, in minutes) or a clock time in quotes (`"21:30"`, local solar
  time). An export writes the relative form when the time is a whole number of
  minutes from sunset or sunrise, as it is after a jump button or a preset.
- **`date`** is a month and day: `Oct 20`, `October 20`, `20 Oct` or `10-20`.
  The model's year has 365 days, so `Feb 29` is refused.
- **A file with a mistake changes nothing.** The panel lists each mistake with
  its line number. A value outside its range is moved to the nearest end of
  the range, and an unknown key is ignored; both are reported and the rest of
  the file is used.
- **A value between two slider steps moves to the nearest step**, and the panel
  says which values moved. The plane spread is in quarter degrees, for example.
- `name` is optional. A preset needs one. An export writes it only while the
  Preset list still shows a preset.

What a settings file does not hold: the language (EN/FR), which groups are
open, and whether playback is running. Loading a file or a preset stops
playback and rebuilds the constellation, so the same file always gives the
same picture.

If `time` is relative to a sunset or sunrise that does not happen at that
latitude and date (polar day or night), the time stays where it was and the
panel reports it.

The file is read by a small YAML reader in `src/settings.js`, since the page
loads no libraries. It reads comments, `key: value` lines, quoted strings and
one level of indented sections, which is everything an export contains. Lists,
deeper nesting and multi-line strings are refused with a message. Messages
about a file's contents are in English in both languages, like the file.

## Presets

Each file in `presets/` is one preset. The build embeds every `*.yaml` file in
that folder, in file-name order, and the Preset list shows each file's `name`.

- **Add a preset:** add a file to `presets/`. Start from an existing one, or
  export the settings wanted from the simulator and add a `name:` line. The
  number at the start of the file name sets its place in the list.
- **Remove a preset:** delete its file.
- **Rename or change a preset:** edit its file.

Nothing else needs to change. `build.js` stops with an error if a preset file
has a mistake, an unknown key, an out-of-range value, no `name`, or a `name`
another preset already uses, so a broken preset fails the pull request's check
and is not published. `test/settings.test.js` also names the presets of the
current revision; update its list when presets are added or removed.

The simulator has a latitude and no longitude, and its time is local solar
time, so a place is its latitude: New York City is 40.7, Taos 36.4, Alice
Springs -23.7. Until Unit 2 of the November 2026 upgrade the latitude was in
whole degrees, and those three presets used 41, 36 and -24.

The three presets whose names start with "sdross0" are described under Unit 2
below.

## How the settings feature is built

The display and the simulation are not changed by it. On 2026-11-11
`src/model.js` and `src/render.js` were the same as in `../lib/`; the November
2026 upgrade changes them, as described in its own section.

- `src/settings.js` is new. It has no DOM and no simulation: the schema, the
  defaults, and the YAML writer and reader. `build.js` puts it in the page
  between `render.js` and `ui.js`.
- `src/ui.js` has a new section, "settings: export, import, presets".
  `readSettings()` copies the current state out. `applySettings()` sets each
  control and fires that control's own `input` or `change` event, so the
  existing handlers do the work exactly as they do for a person.
- Two existing parts of `src/ui.js` were touched. The three sliders whose
  position is not their value (satellites, satellites per cluster, cluster
  diameter) read through `SLIDER_SCALES`, the same arithmetic moved into named
  functions so `applySettings()` can find the position for a value.
  `rebuildConstellation()` does nothing while `applySettings()` is running,
  and is then called once.
- `test/settings.test.js` checks the format, and checks the defaults in
  `SETTINGS_FIELDS` against the controls in `src/index.html` and the
  renderer's `DEFAULT_VIEW`. If a default changes in the page, that test fails
  until `SETTINGS_FIELDS` matches.

The compass label reads the direction the view faces. Until 2026-11-15 it read
"facing 180°" on first load while the view faced north, as it still does in
the released simulator.

## The November 2026 upgrade

The upgrade follows a comparison of this simulator with
`sdross0/orbital-datacenter-brightness`. `PLAN.md` lists the faults found, the
differences between the two simulators, and the five units.

### Unit 1: faults corrected

None of these changes a number the model produces. `test/golden/golden.json`
is unchanged.

- **Custom shells.** Choosing "Custom…" and then typing the shells now uses
  them. Before, they were ignored until another option was chosen and
  "Custom…" chosen again. Text that cannot be read as `altitude:share` pairs
  leaves the shells in use as they are, and the hint under the box says so. A
  long list is summarised in the hint: "54 shells · 565–1,002 km".
- **Solar time.** The time control is labelled "Solar time", with a hint: the
  Sun is highest at 12:00, and a clock can differ by an hour or more. The
  second readout line gives the time relative to the nearer of sunset and
  sunrise: "19:22 solar time (82 min after sunset)".
- **Clock text.** A time within half a minute of the next hour was written
  with the old hour, 19:59.6 as "19:00". It is now "20:00".
- **Compass label.** It is right on first load, follows the arrow keys as well
  as the pointer, and changes language with the rest of the page.
- **Hills.** The silhouette along the horizon repeats every 360°, so it no
  longer changes shape when the view pans past north. Its outline differs
  slightly from the released simulator's.
- **Satellites slider.** It lands on round totals when its own value is within
  1% of one, so 500,000 can be chosen. Its nearest position used to be 501,000.
- **One plane, one satellite.** With one plane per shell, the plane sits at the
  centre of the spread; it used to sit at one edge. A launch train of one
  satellite has a position. Neither case can be reached from the controls yet;
  Unit 2 adds a control for the first.

### Whole sky and in view

The first readout line gives whole-sky totals. In the horizon view it now also
gives how many of them are in the picture:

```
naked-eye VISIBLE 28,652 (17,242 in view)  ·  visible stars 2,267 (432 in view)
```

That line is the comparison document's first case, facing northwest: 37° N,
September 22, 19:22, 500,000 satellites in the 54 filed levels, reference
brightness +1.0.

"In view" means inside the picture and above the hills. Turning or zooming the
view changes that number and leaves the total alone. The all-sky view shows the
whole sky, so it gives one number. The two kinds of count answer different
questions and should not be compared with each other.

### Unit 2: settings that reproduce the sdross0 setups

Each new setting's default is what the simulator did before, so the opening
view is unchanged. `test/golden/golden.json` and the Site 1 column of
`test/fixtures/paired-comparisons.json` are unchanged.

| Control | Setting in a file | Values | Default |
| --- | --- | --- | --- |
| Latitude, the box beside the slider | `observer.latitude` | tenths of a degree | 40 |
| Shell altitudes, "Filed SSO levels" | `constellation.shells: filed-sso` | | `spread` |
| Orbital planes | `constellation.plane_layout` | `spread`, `filed` | `spread` |
| Plane spread | `constellation.plane_spread_deg` | 0 to 30, quarter degrees | 11.25 |
| SBDC brightness | `constellation.brightness_mag` | now in steps of 0.1 | 0.5 |
| Brightness scatter | `constellation.brightness_scatter_mag` | 0 to 2 | 1.3 |
| Phase law | `constellation.phase_law` | `lambert`, `mini` | `lambert` |

- **Latitude.** The slider still moves in whole degrees. The box beside it
  takes tenths, and a settings file or a link may give a tenth.
- **Filed SSO levels.** The 54 altitude levels of the filing's three
  Sun-synchronous groups: 10 from 565 to 585 km, 22 from 707 to 744 km, 22 from
  967 to 1,002 km, with shares in proportion to the filed satellites per plane.
  It is the list the comparison document had to type into "Custom…".
- **Orbital planes.** "Spread" is the original layout: 72 planes for each shell
  and node family, evenly spaced across the plane spread, with satellites at
  random along each. It draws as a diffuse field. "As filed" has two planes at
  each shell level, one for each node family, each with its node drawn once at
  random within the spread, and satellites evenly spaced along the plane. With
  the 54 levels that is 108 distinct rings, which draw as bands.
- **Plane spread.** How far the Sun-synchronous planes spread to each side of
  the dawn-dusk line. It was fixed at 11.25° (45 minutes of local time). Boley,
  Lawler and Rein's "relaxed" case is 10°; the filing allows 30°.
- **Brightness scatter.** How much satellites differ from each other in
  reference brightness, 1 sigma. It was fixed at 1.3 magnitudes. At 0 every
  satellite is the same.
- **Phase law.** How brightness changes with the Sun-satellite-observer angle.
  "Lambertian sphere" is the original. "Measured Starlink Gen2 Mini (mitigated)"
  is the curve of Mallama et al. (2023), `2.630 + 0.1065 a - 0.0005167 a²`
  magnitudes at 1,000 km with `a` in degrees. Both are used relative to their
  value at 90°, so the SBDC brightness slider means the same under either: the
  median magnitude at 1,000 km, 90° and the zenith. The Mini curve is about 4.4
  magnitudes brighter at 10° than at 90°; the sphere is about 1.2.

In the data file these are `scenario.shellPresets` (`filed-sso`),
`scenario.planeLayouts` and `photometry.phaseLaws`, each with its source, and
they appear in "Assumptions & data".

### The sdross0 presets

Three presets set the constellation of `sdross0/orbital-datacenter-brightness`:
500,000 satellites, all Sun-synchronous, the 54 filed levels, planes as filed,
spread ±10°, no scatter, no launch trains, 37.2° N, facing northwest.

| Preset | Brightness | Date and time |
| --- | --- | --- |
| sdross0 default, no mitigation | Lambertian sphere, +0.8 | September 22, sunset +80 |
| sdross0 default, optimistic mitigation | Mini curve, +6.2 | September 22, sunset +80 |
| sdross0 optimistic mitigation, December | Mini curve, +6.2 | December 21, sunset +92 |

+0.8 is that project's "No mitigation" model, the Lambertian sphere of Boley,
Lawler and Rein with albedo 0.2 and 800 m², which is +0.796 at this
simulator's reference condition. +6.2 is its "Optimistic mitigation" model,
the Mini curve made 1.97 magnitudes brighter for an area of 710 m² against
116 m², which is +6.213. `test/model.test.js` has both sums.

What still differs from that project, with these presets:

- **Sunset.** It counts minutes from the Sun's centre on the horizon. This
  simulator's sunset is when the upper edge has gone, about four minutes
  later. "sunset +80" here is near its 84 minutes.
- **The sky.** Its limiting magnitude comes from a different twilight curve and
  a different threshold formula. Once the sky is dark the two limits are within
  about 0.2 magnitude. In twilight this simulator's sky is too dark until
  Unit 3.
- **Plane nodes.** Each simulator draws its own. That project reports about 2%
  scatter between layouts without mitigation, and about 30% with it at an
  equinox.
- **Extinction.** 0.20 magnitude per airmass here, 0.15 there.

`test/paired.test.js` compares the two simulators' whole-sky counts for the 16
documented cases with these settings, within a stated band for each. With seed
12345 the no-mitigation count is 0.85 to 1.00 of that project's once the sky is
dark, and the December optimistic count is 0.98 of it. The equinox optimistic
counts are 0.2 to 0.6 of it: those satellites are within a few tenths of a
magnitude of the limit, and this simulator's limit is slightly stricter.

### A link that carries the settings

"Copy link" puts the settings in the page address, after `#`, and copies the
address where the browser allows it. Opening that address applies the
settings. Only the settings that differ from the defaults are written, so the
link to the opening view has nothing after the page name:

```
…/beta/#observer.latitude=37.2&observer.date=Sep%2022&observer.time=sunset%20%2B80&constellation.phase_law=mini
```

The keys are the same `section.key` names as in a settings file, and the same
rules apply: a key left out takes its default, a value outside its range moves
to the nearest end, an unknown key is ignored and reported, and a link with a
mistake changes nothing and says why in the panel. When the Preset list shows a
preset, the link carries its name, and the page that opens shows that preset
again. Nothing is sent anywhere: the text after `#` stays in the browser.

### What Unit 2 changed in the code

- `src/model.js`: `generateConstellation` has the `filed` plane layout, taken
  only when `planeLayout` is `"filed"`, so the default layout draws the same
  random numbers in the same order as before. `phaseMagnitude` is new, and
  `satMagnitude` and `evaluate` take a phase law.
- `src/settings.js`: seven schema rows changed or added; `settingsToQuery` and
  `settingsFromQuery` are new and share their checking with the file reader.
- `src/ui.js`: the new controls, `copySettingsLink` and `loadSettingsLink`.
  `reevaluate()` does nothing until the first constellation exists, so settings
  can be applied while the page is starting.
- `data/sbdc-data.json`: three entries, listed above.

### What Unit 1 changed in the code

- `src/format.js` is new: clock text, the time relative to sunset or sunrise,
  the Satellites slider's totals, and the one-line shell summary. It has no
  DOM, so `test/format.test.js` covers it. `build.js` puts it in the page
  between `settings.js` and `ui.js`.
- `src/render.js`: `hillAltDeg` repeats every 360°; `inFrame` and
  `SkyRenderer.countInView` are new.
- `src/model.js`: the plane offset and the train position no longer divide by
  a count minus one when the count is one.
- `src/ui.js`: `redraw()` writes the compass label and the readout, so both
  follow every pan and zoom.

## Changing the beta

Edit files in this folder only. Then, from this folder:

```sh
node --test test/*.test.js
node build.js          # writes dist/sbdc-sky-simulator.html to open locally
```

Commit the source change and push. There is no built page to commit: the site
build runs `publish.mjs`, which runs every `test/*.test.js` suite and then
builds the page into the published `beta/` folder. If a test fails, the site
build fails and the pull request's check goes red, so a beta that does not pass
its own tests is not published.

The site workflow then runs `tests/e2e/sbdc-beta.spec.js`, at the repository
root, which drives the published beta page in Chromium. Add the checks for a
new control there. To run it locally, from the repository root, after
`npm ci` and `npm run build`:

```sh
npx playwright test tests/e2e/sbdc-beta.spec.js --project=chromium --trace off
```

Two fixture files freeze numbers the model produces:
`test/golden/golden.json` for the default constellation, and
`test/fixtures/paired-comparisons.json` for the 16 cases of the 12 October 2026
comparison document. A change that is not meant to move those numbers leaves
both files as they are. A change that is meant to move them updates the files
in the same pull request and says why.

`test/smoke-browser.mjs` and the scripts in `tools/` are not run by the site
build. `tools/make-golden.mjs` rewrites `test/golden/golden.json`; run it only
when a model change is meant to move the golden values, and say so in the pull
request.

Do not edit `../lib/`, `../work/`, or `demos/SBDC Night Sky/` as part of beta
work. Those are the released line.

## The label

The site build adds "Beta · changed *date*" to the end of the credit line in
the sky view (the `#attribution` element), and "Released · changed *date*" to
the released page. The label is not in this code. The build derives it from the
path it publishes to, and the date from git: the last commit that changed this
folder, or `demos/SBDC Night Sky/` for the released page.

Because the label is added at publish time, the same code reads "Beta" at the
beta URL and "Released" at the released URL. Do not add channel wording to
`src/`. If a beta change removes or renames `#attribution`, the label falls
back to a small fixed line in the bottom-right corner; update `beta.stamp` in
`../initiative.json` to name the new element.

Saved PNG files are not affected. The exported image draws its own credit line.

## Promoting the beta to the released version

Promotion is a production release. Do it only when the user asks for it in
their own words.

1. Copy the beta's code over the released line's code, and rebuild the released
   snapshot from it:

   ```sh
   cd initiatives/sbdc-night-sky
   for part in src data test tools presets; do rm -rf "lib/$part" && cp -r "beta/$part" "lib/$part"; done
   cp beta/build.js beta/package.json lib/
   node lib/build.js work                     # writes work/index.html
   cp lib/data/sbdc-data.json work/sbdc-data.json
   ```

2. Commit, and check the test preview
   (`preview/initiatives/sbdc-night-sky/index.html` in the branch preview).
3. Run the `release-initiative` skill, which copies `work/` to
   `demos/SBDC Night Sky/` and records the release.

The beta folder stays as it is and continues from there. After a promotion the
two lines are identical again until the next beta change.

Promotion is the first change to `../lib/` since the adoption, so the SHA-256
values in `../adoption-manifest.json` stop matching the code files from then
on. The manifest still describes the package adopted on 2026-09-08, and git
history keeps those files. Record the promotion in `../decisions.md`.
