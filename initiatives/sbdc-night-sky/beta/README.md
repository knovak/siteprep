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

| 2026-11-15 | The twilight sky corrected to measured values; ambient light by Bortle class; a choice of naked-eye threshold; the sky brightness and limit in the readout | The November 2026 upgrade, Unit 3 |
| 2026-11-15 | The Moon, with its phase and place; moonlight in the sky; SBDC light compared with the Moon and with a natural night sky; the readout below the sky | The November 2026 upgrade, Unit 4 |
| 2026-11-15 | Hours of significant SBDC light for a night and for a year; a perspective view; aiming at the densest sky | The November 2026 upgrade, Unit 5 |
| 2026-11-26 | Each group shows up to three controls and keeps the rest under a Details section; presets have a description and a category, choose which controls each group shows, and are chosen in a preset browser; the Moon is as on the date by default | The control panel; Presets; Unit 4 |
| 2026-11-26 | Documents for readers: README, tutorial, specification and report, with screenshots | Documents for readers |

`PLAN.md` in this folder is the plan for the November 2026 upgrade, in five
units. All five are described below, after a short guide to what they added.

## Settings files

The first group in the sidebar, "Presets & settings", shows the preset in use
and a "Browse presets" button. Its Details section has "Copy link", "Export
settings" and "Import settings…".

- **Export settings** downloads every setting as a YAML text file named like
  `sbdc-settings_lat41_Oct20_1757_<reference>.yaml`.
- **Import settings…** reads such a file and sets every control from it.
- **Browse presets** lists the settings files stored in the simulator; choosing
  one sets every control from it. See Presets below.

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

The first four sections are the four groups of settings: `observer`,
`constellation`, `display`, `advanced`. The fifth, `panel`, arranges the
controls on the page and changes nothing in the sky; see The control panel
below. `SETTINGS_FIELDS` in `src/settings.js` is the full list, with each
setting's type, range, default and comment.

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
- `name`, `category` and `description` are optional. A preset needs a name and
  a description. An export writes all three only while a preset is loaded and
  no setting has changed since.

What a settings file does not hold: the language (EN/FR), whether playback is
running, and whether the Details section of "Presets & settings" is open.
Loading a file or a preset stops playback and rebuilds the constellation, so
the same file always gives the same picture.

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
that folder, in the order of the number each file name starts with, so
`100-…` follows `60-…`.

A preset has three lines of text before its settings:

```yaml
name: Taos, New Mexico, 30 minutes before sunrise, March 15
category: Places
description: Morning twilight at Taos's latitude, 36.4° N, ... still sunlit and visible.
```

- **`name`** is its title in the preset browser and on the card in the
  sidebar. It is required, and no two presets may share one.
- **`description`** is one or two sentences saying what the preset shows and
  what to look for. It is required, and at most 320 characters
  (`SETTINGS_DESCRIPTION_MAX`). It is on one line; a colon inside it is part of
  the text, but ` #` starts a comment, so quote a description that needs one.
- **`category`** is the heading it is listed under. It is optional; presets
  without one are listed under "Other". Categories appear in the order of
  their first preset.

A preset may also have a `panel` section, which chooses the controls each group
shows; see The control panel. None of the six presets has one, so all of them
show the default arrangement.

To work with presets:

- **Add a preset:** add a file to `presets/`. Start from an existing one, or
  load a preset, change the controls and export the settings, then edit the
  `name`, `category` and `description` lines. The number at the start of the
  file name sets its place in the list; leave gaps (10, 20, 30) so a preset can
  go between two others.
- **Remove a preset:** delete its file.
- **Rename or change a preset:** edit its file.

Nothing else needs to change. `build.js` stops with an error if a preset file
has a mistake, an unknown key, an out-of-range value, no `name`, a `name`
another preset already uses, no `description`, or a description over the
limit, so a broken preset fails the pull request's check and is not
published. `test/settings.test.js` also names the presets of the current
revision; update its list when presets are added or removed.

### The preset browser

"Browse presets" opens a list of every preset with its description, under its
category. With many presets:

- **Filter** by typing in the box at the top. Every word typed has to appear in
  the name, the description or the category, in any order: "december
  optimistic" finds one preset.
- **Category** buttons under the box show one category at a time. They appear
  when there is more than one category.
- **Keyboard:** the down arrow moves from the box into the list, the arrows
  move through it, and Enter loads the preset. Enter in the box loads the first
  match. Escape closes the list without loading anything.
- The preset in use is marked "loaded".

Choosing a preset loads it and closes the list. The card in the sidebar then
shows its category, name and the first three lines of its description; "more"
shows the rest. The ‹ and › buttons beside "Browse presets" load the previous
and next preset in the list without opening it, for stepping through a series.
Once a control is changed, the card says which preset the settings started
from.

On a phone the list fills the screen, and the filter box is not focused when it
opens, so the keyboard does not cover the list.

## The control panel

Each group of controls shows up to three of its controls and keeps the rest
under a "Details" section. Details sections start closed. While one is closed,
the names of the controls inside it are written under the word "Details" in
small type, and in its tooltip. A click opens it. A group may show none: by
default "Night & year" and "Advanced" are only their title and their Details.

The groups, their controls in the order they appear, and the ones shown by
default (in bold) are in `SETTINGS_PANEL` in `src/settings.js`:

| Group | Controls |
| --- | --- |
| Observer | **latitude**, **date**, time (the Solar time slider), **time_jumps** (the Sunset, +30 min … buttons), hold_time_to_twilight, playback |
| Constellation | **satellites**, sso_percent, shells, plane_layout, plane_spread_deg, **brightness_mag**, brightness_scatter_mag, phase_law, launch_trains, **clustering** (with its two sliders) |
| Sky & display | **view** (with "Aim at densest sky"), sky_limit_mag, ambient_light, moon (with the year and the phase), show_stars, long_exposure |
| Night & year | compute (the buttons and the status line), hours (the table), chart |
| Advanced | seed, naked_eye_threshold, tint_by_orbit_family, mark_celestial_pole, satellites_move_in_fast_forward, cluster_membership_variation, cluster_diameter_variation |

A control is named by the key of its setting where it has one. "Presets &
settings" is not in the list: it is the same for every preset.

The `panel` section of a settings file holds two lines for each group:

```yaml
panel:
  constellation: satellites, brightness_mag, phase_law   # shown, in this order
  constellation_details: closed                          # closed or open
  night: none                                            # only Details
```

- The first line names the controls the group shows, up to three of its own,
  in the order they are shown, or `none` for a group that shows only its
  Details. The rest stay under Details in the group's own order. More than
  three, or an empty value, is a mistake, and the file is not loaded. A name
  that is not one of the group's controls is ignored and reported.
- The second line says whether the Details section is open when the file or
  preset is loaded.
- A group left out shows its default controls with Details closed, as any key
  left out takes its default. A preset that does not mention the panel
  therefore shows the defaults.

An export and a link record the panel as it is: the controls shown, and which
Details sections are open. Opening or closing a Details section is not a
change to the settings, so the preset on the card stays loaded. The settings
reference in an export's file name and in a saved PNG leaves out the panel
section, so two pictures of the same sky have the same reference whichever
sections were open.

The page's markup in `src/index.html` is the default arrangement, so nothing
moves when it loads. `ui.js` moves each control's element, with its handlers,
between the group's shown area and its Details section when a file, a preset
or a link gives another arrangement. `test/settings.test.js` checks that the
markup and `SETTINGS_PANEL` name the same controls and the same defaults.

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

### A short guide to what was added

Where each thing is on the page, and what to try first. Since 2026-11-26 most
controls are under their group's Details section; a closed Details section
lists the names of the controls inside it.

| To do this | Use |
| --- | --- |
| See the other simulator's setups | "Browse presets": the category "Compared with sdross0" |
| Send someone exactly what you see | "Copy link", under Details in the same group |
| Set a latitude such as 37.2 | The box beside the Latitude slider |
| See the constellation as distinct rings | "Constellation": Orbital planes, "As filed", with Shell altitudes "Filed SSO levels" |
| Compare mitigated and unmitigated satellites | "Constellation": SBDC brightness, with Phase law "Measured Starlink Gen2 Mini" for the mitigated case |
| See the sky from a town or a city | "Sky & display": Ambient light, Bortle 5 to 9 |
| Change the Moon | "Sky & display", under Details: Moon. It is "As on this date" unless a file or preset turns it off |
| Compare SBDC light with the Moon's | The second line under the sky, in a warmer color |
| See what a camera would see | "Sky & display": View, "Perspective" |
| Find where the satellites are | "Aim at densest sky", under View |
| See how long it lasts | "Night & year": "Compute this night", then "Compute the year" |

Three things to know when reading the numbers:

- The first line under the sky gives totals for the whole sky, each followed
  by the count in the picture. They answer different questions.
- Half an hour after sunset the sky is still bright and little is visible.
  "+60 min" shows the constellation against a darker sky.
- Every time is local solar time. The readout also gives it as minutes from
  sunset or sunrise.

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
spread ±10°, no scatter, no launch trains, no Moon, 37.2° N, facing
northwest.

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
- **The sky.** Since Unit 3 the presets use that project's threshold formula.
  The twilight curves still differ: this simulator's is Patat et al.'s,
  measured at Paranal, which is about half a magnitude darker than that
  project's with the Sun 10° to 11° down.
- **Plane nodes.** Each simulator draws its own. That project reports about 2%
  scatter between layouts without mitigation, and about 30% with it at an
  equinox.
- **Extinction.** 0.20 magnitude per airmass here, 0.15 there.

`test/paired.test.js` compares the two simulators' whole-sky counts for the 16
documented cases with these settings, within a stated band for each. With seed
12345, since Unit 3:

| Pairs | No mitigation, this / that | Optimistic, this / that |
| --- | --- | --- |
| 01-08, dark sky | 0.88 to 1.02 | 1.06 in December; 0.33 to 0.80 near the equinox |
| 11-12 and 15-16, twilight | 1.00 and 1.04 | 1.79 and 1.25 |
| 09-10 and 13-14, counts near 1,000 | 1.10 and 0.52 | both zero, as there |

The equinox optimistic counts are of satellites within a few tenths of a
magnitude of the limit. A tenth of a magnitude changes such a count by half,
and one plane layout differs from another by a factor of three: six seeds gave
329 to 1,194 for pair 02, where that project reports 835 to 1,766 over five of
its own layouts.

### Unit 3: the twilight sky, ambient light, and the naked-eye threshold

#### The twilight sky was too dark

`skyBrightness.table` in the data file gives the brightness of the sky at the
zenith for each altitude of the Sun. It cited Patat et al. (2006) and did not
match that paper in twilight:

| Sun below the horizon | The paper, mag/arcsec² | The table before | Faintest magnitude seen: before, now |
| --- | --- | --- | --- |
| 6° (end of civil twilight) | 13.30 | 16.5 | 3.8, 1.5 |
| 9° | 17.00 | 18.2 | 4.9, 4.2 |
| 12° (end of nautical twilight) | 19.67 | 19.5 | 5.7, 5.7 |
| 15° | 21.32 | 20.9 | 6.2, 6.3 |

A larger number is a darker sky. At the end of civil twilight the table's sky
was about 19 times darker than the measured one, so fourth-magnitude stars and
satellites counted as visible when only first-magnitude ones are. The table
now has the paper's V-band fit, one row per degree from 5° to 15°, and
measured values at sunset and 3° down in place of two rows that were 4 to 5
magnitudes too dark. The day and night ends are unchanged.

What this moved, with everything else at its default:

| View | Sun | Visible SBDCs: before, now | Visible stars: before, now |
| --- | --- | --- | --- |
| The opening view: 40° N, June 21, 30 min after sunset | 5.6° down | 3,290, 546 | 67, 2 |
| Preset: New York City, 30 min after sunset | 6.4° down | 20,427, 9,305 | 107, 4 |
| Preset: Taos, 30 min before sunrise | 6.9° down | 17,565, 8,697 | 144, 10 |
| 40° N, June 21, 60 min after sunset | 10.0° down | 4,534, 3,899 | 480, 286 |
| 40° N, June 21, 90 min after sunset | 14.0° down | 4,218, 4,286 | 1,535, 1,552 |
| Preset: Alice Springs, 60 min after sunset | 13.5° down | 29,234, 29,671 | 1,605, 1,776 |

Half an hour after sunset there is now little to see, because the sky is still
bright. An hour after sunset the numbers are within about 15% of what they
were, and from 75 minutes on they are slightly higher. The opening view is
still 30 minutes after sunset; "+60 min" shows the constellation against a
dark sky.

The sky's colors are drawn from its brightness, and each color was chosen for
a stage of twilight. The color ramp's anchors moved with the table, so the sky
has the same color at the same stage as before. `test/render.test.js` checks
that the two stay together.

`test/golden/golden.json` and the Site 1 counts in
`test/fixtures/paired-comparisons.json` were regenerated for this change. The
fixture keeps the document's counts of 12 October 2026 beside the new ones.

#### Ambient light

"Ambient light" in "Sky & display" is artificial skyglow by Bortle class, 1
(none, the default) to 9 (inner city). It is `display.ambient_light` in a
settings file. The class's skyglow is added to the sky's light, so the sky is
brighter, the faintest magnitude seen is lower, and fewer satellites and stars
are counted and drawn. The drawn sky takes a warm gray tint in proportion to
how much of its light is skyglow.

| Class | Skyglow at the zenith, mag/arcsec² | Faintest magnitude under a dark sky |
| --- | --- | --- |
| 1 | none | 6.5 |
| 3, rural | 21.5 | 6.2 |
| 5, suburban | 19.8 | 5.7 |
| 7, suburban to urban | 18.2 | 4.9 |
| 8, city | 17.5 | 4.5 |
| 9, inner city | 16.8 | 4.0 |

Classes 2 to 8 are the values `sdross0/orbital-datacenter-brightness` uses;
class 9 continues the trend. The skyglow is taken as the same in every
direction. A real light dome is brighter toward the nearest town.

The existing control beside it is now labelled "Eye limit": the faintest
magnitude this observer sees under a dark sky, 4.0 to 6.5, default 6.0. The
sky's own limit, from twilight and ambient light, applies when it is lower.
With the default eye limit of 6.0, classes 1 to 4 make no difference once the
sky is dark, because their limits are above 6.0.

#### The naked-eye threshold

The threshold turns a sky brightness into the faintest magnitude seen.
"Naked-eye threshold" in "Advanced" (`advanced.naked_eye_threshold`) chooses
between two:

- **Table** (the default): the simulator's own table. With the corrected sky it
  matches when stars are seen to appear in twilight: first magnitude with the
  Sun about 6° down, third by 8°, fifth by 11°.
- **Schaefer formula**: `7.93 − 5 log10(1 + 10^(4.316 − mu/5))`, the form used
  for sky-quality-meter readings and by the sdross0 project. It is stricter
  under a bright sky, by 0.8 magnitude at 18 mag/arcsec² and by 1.9 with the
  Sun 6° down, and within 0.1 once the sky is dark. With it and the Bortle
  table above, this simulator reproduces the limits that project publishes for
  Bortle 1, 3, 4, 5 and 8 to within 0.03 magnitude.

The three sdross0 presets use the Schaefer formula.

#### The readout

The second readout line gives the sky overhead and its limit:

```
zenith sky 18.1 mag/arcsec² (Bortle 7), naked-eye limit 4.1
```

#### What Unit 3 changed in the code

- `data/sbdc-data.json`: `skyBrightness.table` corrected;
  `skyBrightness.artificialByBortle` and `limitingMagnitude.closedForm` added.
- `src/model.js`: `addMu`, `artificialMu` and `skyExtras` are new. `muAt`,
  `limitingMag` and `starVisibility` take what `skyExtras` returns, and
  `evaluate` returns it as `sky` so that the renderer draws the sky the counts
  were made against. `summarize` adds `zenithSkyMu` and `zenithLimitMag`.
- `src/render.js`: the color ramp's anchors; `skyColor` and
  `SKY_COLOR_STAGES` are new.
- `src/settings.js`, `src/ui.js`, `src/index.html`: the two controls and their
  settings; the readout line.

### Unit 4: the Moon, moonlight, and SBDC light compared with the Moon

#### The Moon

"Moon" in "Sky & display" has three settings (`display.moon` in a file):

- **Off** (`off`): no Moon. This was the default until 2026-11-26. The three
  sdross0 presets set it, because that project has no Moon.
- **As on this date** (`date`, the default since 2026-11-26): the Moon where it
  is on the chosen date and solar time in the year given in the "Year" box
  (`observer.year`, default 2026). The simulator has no longitude, so the
  solar time is taken as universal time. The Moon moves about half a degree
  an hour, so its place is within about 7° of the truth for any longitude, and
  its phase within a few percent.
- **Set the phase** (`phase`): a Moon a chosen number of days after new
  (`display.moon_age_days`, 0 to 29.5), on the ecliptic. 7.4 is first quarter,
  14.8 is full. This needs no date.

Because the default changed, a link made before 2026-11-26 that does not
mention `display.moon` now opens with the Moon of its date; add
`&display.moon=off` to it to see the sky as it was then. An exported file is
not affected, since an export lists every setting. In the opening view, half
an hour after sunset with the sky still bright, the Moon of June 21, 2026, half
lit and 38° up, changes none of the counts.

The Moon's place comes from the low-precision series of the Astronomical
Almanac, good to about 0.3°. `test/model.test.js` checks it against the solar
eclipses of 12 August 2026 and 2 August 2027 and the lunar eclipse of 3 March
2026: it puts the Moon within 0.1° of the Sun's longitude at the first two and
within 0.1° of opposite at the third. The year changes the Moon only. The Sun
and stars stay on the model's 2026 calendar, where they differ from another
year's by less than a quarter of a degree; the Moon is placed by its angle
from the Sun, so its phase is right for the year asked for.

The Moon is drawn with its phase, the lit side toward the Sun, about three
times its true size so that the phase can be seen. The label beside "Moon"
gives its lit fraction and altitude, and so does a tooltip on the Moon.

#### Moonlight

A Moon above the horizon lights the sky. The brightness it adds at each point
follows Krisciunas and Schaefer (1991): it depends on the Moon's phase and
altitude, on how far the point is from the Moon, and on the point's own
altitude. It is added to the twilight sky and to ambient light, so the limit
falls and fewer satellites and stars are counted and drawn, most of all near
the Moon. The drawn sky takes a blue-gray tint where moonlight is most of its
light. A Moon below the horizon adds nothing.

With the default constellation at 40° N on 24 November 2026, 19:00:

| | No Moon | The full Moon of that date, 25° up |
| --- | --- | --- |
| Zenith sky, mag/arcsec² | 21.9 | 18.9 |
| Naked-eye limit | 6.0 | 5.3 |
| Visible SBDCs | 20,996 | 15,741 |
| Visible stars | 1,699 | 523 |

#### SBDC light compared with the Moon

The readout has a second line, in a warmer color:

```
SBDC light −9.2 mag in total  ·  1/22 of a full Moon  ·  10× a moonless natural night sky  ·  Moon 100% lit, 25° up: 1/15 of this Moon’s light
```

- **SBDC light, in total**: the light of every sunlit SBDC above the horizon,
  added up and written as one magnitude. It includes the ones too faint to see
  one by one.
- **Of a full Moon**: that light divided by the light of a full Moon overhead.
- **A moonless natural night sky**: that light divided by the light of the
  whole dark sky, stars and airglow together, which is about magnitude −6.7,
  or one thousandth of a lux.
- **Of this Moon's light**: shown when a Moon is set and is up. The Moon as it
  is: its phase, and dimmed by the air when it is low.

All are ratios of apparent brightness, satellites and Moon both seen through
the air. They are approximate: the satellites' brightness is the least certain
part of the model, and the total depends on the brightest few percent.

Some values, without a Moon:

| Setup | Sun | SBDC light | Of a full Moon | Against a natural night sky |
| --- | --- | --- | --- | --- |
| Default (300,000, +0.5), 40° N, June 21, 60 min after sunset | 10° down | −7.6 | 1/93 | 2.4× |
| The same at midnight | 27° down | −5.3 | 1/758 | 1/3.4 |
| Default, 40° N, December 21, 90 min after sunset | 17° down | −10.3 | 1/8.1 | 27× |
| 1,000,000 satellites, the same evening | 17° down | −11.6 | 1/2.5 | 90× |
| sdross0 no mitigation, September 22 | 17° down | −7.7 | 1/83 | 2.6× |
| sdross0 no mitigation, December 21 | 18° down | −10.2 | 1/8.5 | 26× |
| sdross0 optimistic mitigation, September 22 | 17° down | −3.7 | 1/3,344 | 1/15 |
| sdross0 optimistic mitigation, December 21 | 18° down | −5.5 | 1/637 | 1/2.9 |

#### The readout is below the sky

The readout strip used to lie over the bottom of the sky. With three lines it
covered the horizon, where most of the constellation is, and the compass
points. It is now below the sky, and the sky is drawn in the space above it.

#### A fault corrected: a redraw during a rebuild

Turning or zooming the view in the instant after the constellation was rebuilt
could raise "Simulator error". The picture was drawn from the new
constellation and the evaluation of the old one, whose satellite numbers did
not match. The picture and the tooltips now use the constellation each
evaluation was made from. This fault was in the simulator before the upgrade;
`tests/e2e/sbdc-beta.spec.js` has a check that reproduces it.

#### What Unit 4 changed in the code

- `src/model.js`: `julianDate`, `moonEphemeris`, `moonState`, `moonMagnitude`
  and `moonSkyMu` are new, as are `muParts` (the sky's light part by part),
  `lightSummary`, `hemisphereMagnitude` and `magnitudeToLux`. `skyExtras`
  carries the Moon; `evaluate` returns the satellites' summed light;
  `summarize` adds a `light` block. `test/golden/golden.json` gained that
  block and no existing number in it changed.
- `src/render.js`: `_drawMoon`; `skyColor` takes a moonlight share.
- `src/format.js`: `formatRatio`.
- `src/settings.js`: `observer.year`, `display.moon`, `display.moon_age_days`.
  A bare `off` in a file is read as the choice named off where a setting has
  one, since the YAML reader takes `off` as false.
- `src/ui.js`, `src/index.html`, `src/app.css`: the Moon controls, the light
  line, the readout below the sky, and `App.evCons`.

### Unit 5: hours of significant SBDC light, a perspective view, aiming

#### Night & year

The "Night & year" group answers how long SBDC light is significant at a
place. "Compute this night" works through the chosen date at the chosen
latitude in steps of five minutes; "Compute the year" works through 24 dates,
the 6th and the 21st of each month, in steps of fifteen minutes, and scales
them to a year. Both use every other setting as it stands: the constellation,
its brightness, the eye limit, ambient light, the threshold, and the Moon.

"Significant" has no single definition, so three are reported side by side:

| Row | A moment counts when |
| --- | --- |
| at least 100 SBDCs visible to the naked eye | 100 or more are above the horizon, sunlit, and brighter than the limit of the sky where they are |
| visible SBDCs outnumber visible stars | more SBDCs than stars are visible |
| SBDC light exceeds the sky's own light | the summed light of all sunlit SBDCs above the horizon is at least the light of the whole sky at that moment: twilight, ambient light and scattered moonlight |

The first row of the table is the length of the night, the Sun below the
horizon, for scale. A moment with the Sun up counts for nothing.

The chart shows visible SBDCs (gold) and visible stars (blue) through the
night on a logarithmic scale, with three bars underneath for when each
definition holds, and a line at the time the sky is showing. A click on the
chart moves the time to that moment.

Some results, each from one click:

| Setup | Date | Night | At least 100 visible | Outnumber stars | Exceeds the sky |
| --- | --- | --- | --- | --- | --- |
| Default (300,000, +0.5), 40° N | June 21 | 8.9 h | 8.3 h | 5.2 h | 1.2 h |
| | December 21 | 14.8 h | 14.4 h | 10.3 h | 5.2 h |
| | a year | 4,304 h | 4,011 h | 2,738 h | 1,068 h |
| sdross0 no mitigation, 37.2° N | September 22 | 11.8 h | 5.2 h | 4.4 h | 1.2 h |
| | December 21 | 14.4 h | 8.2 h | 7.0 h | 4.3 h |
| | a year | 4,296 h | 1,798 h | 1,479 h | 616 h |
| sdross0 optimistic mitigation, 37.2° N | September 22 | 11.8 h | 1.5 h | 0 | 0 |
| | December 21 | 14.4 h | 3.9 h | 3.0 h | 0 |
| | a year | 4,296 h | 597 h | 365 h | 0 |

The default constellation is visible nearly all night because it has shells up
to 1,800 km and a 30° family, which stay sunlit far longer than the filed
Sun-synchronous levels of the sdross0 presets.

The sdross0 rows can be set against that project's own statements. It reports
the optimistic case visible for about 44 minutes each evening at the equinox
and about 118 minutes near the December solstice; a day here is an evening and
a morning, so twice that is 1.5 and 3.9 hours, which is what the table has. It
reports the no-mitigation case outnumbering the stars for "some two and a half
hours" each evening at the equinox; the table has 4.4 hours for the day.
`test/model.test.js` holds those comparisons.

How it is computed, and how far to trust it:

- **A date is one day of the model.** The 24 hours run from noon through
  midnight to noon with the Sun's declination of that date, so "this night" is
  the date's evening and its morning. Together they are as long as a night.
- **The satellites are thinned.** A night uses up to 100,000 of the
  satellites and a year up to 30,000, evenly taken, with each one standing for
  several. Counts are good to a few percent. The summed light depends on the
  brightest few percent of satellites and is good to about a fifth, so the
  third row is the least exact.
- **Small numbers are noisy.** Where a few satellites and a few stars are
  visible, as on a June night at 60° N, "outnumber" can go either way.
- **A year with "Set the phase" has that Moon every night.** For a year with
  the Moon as it is, use "As on this date"; the 24 sampled dates then have 24
  different Moons, which is a coarse sample of the month.
- **Results belong to the settings they were computed from.** When a setting
  changes, the table and chart are dimmed and the panel says so, until they are
  computed again. The time of day is not one of those settings.

#### Perspective view

"View" has a third choice, "Perspective (as a camera sees it)"
(`display.view: perspective`). The horizon view is a panorama: azimuth runs
evenly across it and altitude evenly up it, so the horizon is level and a
ring of satellites is drawn curved. The perspective view is what a flat sensor
records: straight lines in the sky stay straight, the horizon is level only at
the centre, and the scale grows toward the edges. It is aimed, turned and
zoomed like the panorama, and draws a field of at most 120°.

It is the projection the other simulator uses, so with an sdross0 preset the
two pictures can be set side by side.

#### Aim at densest sky

"Aim at densest sky", under "View", turns the view to the direction that takes
in the most visible SBDCs: the fullest window as wide as the field of view,
anywhere round the horizon. For a ring with two lobes that is the fuller lobe;
the average direction would be the gap between them. It does not change the
altitude the view is aimed at.

#### What Unit 5 changed in the code

- `src/model.js`: `thinConstellation`, `sampleInstant`, `nightSamples`,
  `significantHours`, `yearHours`, with `SIGNIFICANCE`, `YEAR_SAMPLE_DAYS` and
  `NIGHT_SUN_ALT_DEG`.
- `src/render.js`: `projPerspective`, `unprojPerspective`, `densestAzimuth`,
  `PERSPECTIVE_MAX_FOV`; the hills and compass points for the perspective
  view; `pixelsPerDegree`.
- `src/ui.js`: the `Night` object, which runs the sampling and draws the chart
  and table; the aim button; the horizon-only branches now cover both aimed
  views.
- `src/settings.js`: `display.view` gains `perspective`.

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
mistake changes nothing and says why in the panel. When a preset is loaded, the
link carries its name, and the page that opens shows that preset again. The
panel is part of a link: see The control panel. Nothing is sent anywhere: the
text after `#` stays in the browser.

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

## Documents for readers

`docs/` holds the beta's own versions of the released documents, written for
people who use the simulator rather than change it:

| File | Counterpart in the release |
| --- | --- |
| `docs/README.md` | `../lib/README.md` |
| `docs/TUTORIAL.md` | `../lib/TUTORIAL.md` |
| `docs/SPECIFICATION.md` | `../lib/SPECIFICATION.md` |
| `docs/BETA_REPORT.md` | `../lib/FINAL_REPORT.md` |

`docs/images/` holds the screenshots they use and the slide deck uses, taken
from the published beta page; the deck takes them from this folder's address
on GitHub. The numbers in the documents are what the beta shows with its
defaults and the settings each passage names.

The documents are copied, as Google Docs, to the
[beta folder](https://drive.google.com/drive/folders/1x0nnagEYqlsBVhjR4IMs3tkTjnjSChgU)
of the simulator's Drive folder, beside the beta page, its data file, its
source, this folder's `PLAN.md`, the two audit notes in `../notes/`, and the
[beta slide tutorial](https://docs.google.com/presentation/d/1aKs2W20J9ixJlvAotCNw85hKo_v_U1MPxK2g_xvOCt4/edit).
The files here are the source; the Drive copies are refreshed from them. The
released documents in the parent Drive folder and in `../lib/` are not
changed.

## Changing the beta

Edit files in this folder only. A change that alters what a reader sees or
the numbers the documents quote updates `docs/` in the same pull request, and
the Drive copies afterwards. Then, from this folder:

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
new control there. Its `openBeta` and `choosePreset` helpers open every Details
section, so a test can reach any control; pass `{ details: 'closed' }` to test
the page as it opens. To run it locally, from the repository root, after
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
