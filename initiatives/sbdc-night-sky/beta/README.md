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
  says which values moved. Latitude is in whole degrees, for example.
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
time, so a place is its latitude: New York City is 41, Taos 36, Alice Springs
-24.

## How the settings feature is built

The display and the simulation are not changed by it. `src/model.js` and
`src/render.js` are the same as in `../lib/`.

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

After loading settings the compass label reads the direction the view faces.
On first load it reads "facing 180°" while the view faces north, as it does in
the released simulator; the settings code does not change that.

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
