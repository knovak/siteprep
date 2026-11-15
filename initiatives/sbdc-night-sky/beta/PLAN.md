# Beta upgrade plan, November 2026

This is the plan for a set of upgrades to the beta simulator, in five units of
work. Each unit is one pull request, and merging it publishes the beta. The
reasons for the choices made here are in `../decisions.md` under 2026-11-15.

The initiative's `../plan.md` is the supplied July 2026 implementation plan,
kept byte for byte, so this plan has its own file.

## The request

On 2026-11-15 the user asked for upgrades to the beta: study a comparison
document, compare the code and the display with
<https://github.com/sdross0/orbital-datacenter-brightness>, correct the faults
found, and add:

- one or more presets that correspond to that project's default setups
- an option to include moonlight and its effects
- an approximate ratio of SBDC light to the Moon's
- an option to simulate ambient light
- perhaps the number of hours in a night, or a year, in which SBDC light is
  significant at a location
- any further features or improvements the document suggests

The user also asked that the testing strategy be considered so that the work
goes quickly, that the plan be five units, and that each unit include a
deployment to beta and a pull request.

## What was studied

| Source | What it is |
| --- | --- |
| "Visual Comparison of Two Orbital Data Center Sky Simulators", captured 12 October 2026 | 16 paired scenarios, 33 pages. "Site 1" is this simulator; "Site 2" is the sdross0 project. It refers to a separate detailed evaluation, which was not supplied. |
| `sdross0/orbital-datacenter-brightness` at commit `195bee9` | Python model and a browser version (`docs/`), with `README.md`, `ASSUMPTIONS.md` and `FAQ.md`. Read, not run and not copied. |
| `beta/src/`, `beta/data/`, `beta/test/` | This simulator. |

The beta model was run with the document's Site 1 settings. It gave the
document's Site 1 whole-sky count in all 16 cases, so the document describes
the code in this folder as it stood before Unit 1.

## Faults found

| # | Fault | Found by | Unit |
| --- | --- | --- | --- |
| 1 | Choosing "Custom…" for shell altitudes and then typing the shells did nothing until another option was chosen and "Custom…" chosen again | The document, page 33; also `../log.md`, 2026-11-11 | 1 |
| 2 | The time control was labelled "Local time". It is local solar time | The document, page 33 | 1 |
| 3 | A time within half a minute of the next hour was written with the wrong hour: 19:59.6 as "19:00" | Reading `ui.js` | 1 |
| 4 | The compass label read "facing 180°" on first load while the view faced north. Arrow keys turned the view without updating the label | `README.md` in this folder; reading `ui.js` | 1 |
| 5 | The hills along the horizon changed shape when the view was panned past north | Reading `render.js` | 1 |
| 6 | The Satellites slider could not be set to 500,000. Its nearest position was 501,000 | The document, page 2 | 1 |
| 7 | With one plane per shell, every Sun-synchronous satellite was placed at one edge of the plane spread. A launch train of one satellite had no position. Neither could be reached from the controls | Reading `model.js` | 1 |
| 8 | The readout gave whole-sky totals only. The document compares them with Site 2's "in this view" counts and says the two must stay distinct | The document, pages 1 and 23 | 1 |
| 9 | The twilight sky-brightness table is darker than the photometry it cites: 16.5 mag/arcsec² with the Sun 6° down, where Patat et al. (2006) measured 13.3. Stars and satellites are counted as visible too early in the evening | Comparison with Site 2's twilight model, then the paper | 3 |

Fault 9 is the largest. At the end of civil twilight the simulator's sky is
about 19 times darker than the measured sky, so the limiting magnitude there is
about 3.8 where the measured sky gives about 1.5.

One known fault is not in this plan. On a phone the sky scrolls away, because a
later CSS rule overrides the sticky rule. `../initiative.json` holds that as
`mobile-sky-follow-up`, blocked until the user chooses to resume it.

## Differences that are modelling choices

The document lists these as what remained different after the settings were
matched. Each becomes a setting, so that either simulator's choice can be
selected. The defaults stay as they are.

| Subject | Site 2 | This simulator before the upgrade | Unit |
| --- | --- | --- | --- |
| Latitude | Decimal, 37.2 | Whole degrees | 2 |
| Reference brightness | +0.796 and +6.213 | Steps of 0.5 | 2 |
| Scatter between satellites | None | 1.3 magnitudes, fixed | 2 |
| Phase law | Lambertian sphere, or the measured Gen2 Mini curve | Lambertian sphere | 2 |
| Plane spread | ±10° or ±30° | About ±11.25°, fixed | 2 |
| Orbital planes | 2 per altitude level, 108 in all, satellites evenly spaced along each, which draws as bands | 72 per shell and node family, satellites at random along each, which draws as a diffuse field | 2 |
| Altitudes | 54 levels, 565 to 1,002 km | Three presets, or a typed list | 2 |
| Reproducing a scenario | A link | A list of manual steps | 2 |
| Artificial skyglow | Bortle class 1 to 8 | An eye-limit cap only | 3 |
| Moon | Not modelled | Not modelled | 4 |
| Year | Any | 2026 | 4 |
| Projection | Perspective | Azimuth and elevation panorama | 5 |
| Aiming | "Aim at densest sky" | By hand | 5 |
| Counts through the night | A curve, with evening and morning peaks | One moment at a time | 5 |

## The five units

### Unit 1 - Faults found by the comparison, and the checks later units reuse

Scope: faults 1 to 8 above. No change to the model's numbers: the golden
fixtures and the 16 paired counts are unchanged.

- `src/format.js` is new: clock text, the time relative to sunset or sunrise,
  the Satellites slider's totals, and the one-line summary of a shell list.
- The readout gives the count in view beside each whole-sky total in the
  horizon view, and the time as minutes from sunset or sunrise.

Checks added, and kept for the later units:

- `test/fixtures/paired-comparisons.json` and `test/paired.test.js`: the 16
  cases of the document, with this simulator's counts of 12 October 2026 and
  Site 2's counts for the same cases.
- `test/format.test.js`.
- `tests/e2e/sbdc-beta.spec.js` at the repository root: the published beta
  page in Chromium, run by the site's workflow on every push.

### Unit 2 - Constellation and brightness settings, and presets for the sdross0 defaults

New settings. Each default is the current behaviour.

| Setting | Values | Default |
| --- | --- | --- |
| `observer.latitude` | tenths of a degree | 40 |
| `constellation.brightness_mag` | steps of 0.1 | 0.5 |
| `constellation.brightness_scatter_mag` | 0 to 2 | 1.3 |
| `constellation.phase_law` | `lambert`, `mini` | `lambert` |
| `constellation.plane_spread_deg` | 0 to 30 | 11.25 |
| `constellation.plane_layout` | `spread`, `filed` | `spread` |
| `constellation.shells` | adds `filed-sso`, the 54 levels | `spread` |

`mini` is the mitigated Starlink Gen2 Mini phase curve of Mallama et al. (2023),
`2.630 + 0.1065 φ − 0.0005167 φ²` at 1,000 km with φ in degrees, taken relative
to its value at 90° so that the reference brightness keeps its meaning. `filed`
places two planes at each altitude level, one for each node family, each with
its node drawn at random within the spread, and spaces the satellites evenly
along the plane.

Presets, each a file in `presets/`:

- sdross0 default, no mitigation: 37.2° N, September 22, 80 minutes after
  sunset, 500,000 satellites, 100% SSO, the 54 levels, two planes per level,
  spread ±10°, Lambertian, reference +0.8, no scatter, facing 315°.
- sdross0 default, optimistic mitigation: the same with the Mini phase curve
  and reference +6.2.
- sdross0 optimistic mitigation at the December solstice, where that project
  reports its largest count.

A "Copy link" button writes the settings that differ from the defaults into
the page address, and a page opened with such an address applies them.

Acceptance: with the presets' settings, the whole-sky counts for the paired
cases are compared with Site 2's. The tolerance is set from Site 2's own
statement of its scatter between plane layouts, about 2% without mitigation
and about 30% with it at an equinox, plus the difference between the two sky
models that remains until Unit 3.

### Unit 3 - Sky brightness: the twilight correction and ambient light

- Fault 9: the twilight table takes the V-band values of Patat et al. (2006)
  from 5° to 15° of solar depression and joins the existing day and night
  values. This moves the numbers at dusk and dawn, including the opening view.
  `test/golden/golden.json` and the Site 1 column of the paired fixture are
  regenerated in the same pull request, and its description lists what moved.
- `display.ambient_light`, Bortle class 1 to 9, default 1. Artificial skyglow
  is added to the sky in linear units, so it lowers the limiting magnitude and
  brightens the drawn sky. Classes 2 to 8 take the zenith values Site 2 uses.
- The existing "Eye / sky quality limit" stays as the observer's own limit and
  is relabelled so that the two controls are not confused.
- The readout gives the zenith sky brightness and the limiting magnitude.

### Unit 4 - Moonlight, and SBDC light compared with the Moon

- `observer.year`, default 2026, so that a date has a Moon.
- `display.moon`: `off` (default), `date`, or `phase` with
  `display.moon_age_days`. `date` takes the Moon's position for the chosen date
  and solar time at longitude 0, because the simulator has no longitude; the
  Moon moves about half a degree an hour, so the position is within a few
  degrees for any longitude.
- The moonlit sky follows Krisciunas and Schaefer (1991) and is added to the
  sky brightness, so moonlight hides faint satellites and stars as it does in
  the sky. The Moon is drawn with its phase.
- The readout gives the summed light of all sunlit SBDCs above the horizon as
  one magnitude, and its ratio to the full Moon, to the Moon as set, and to
  the natural moonless night sky.

### Unit 5 - Hours of significant SBDC light, and display items from the comparison

- A "Night and year" panel. For the chosen latitude and date it computes the
  night in steps of a few minutes and draws visible SBDCs, visible stars and
  SBDC light against time. It reports the hours in that night, and from a
  sample of dates the hours in the year, in which SBDC light is significant.
  Three definitions are reported side by side: at least 100 SBDCs visible to
  the naked eye; visible SBDCs outnumber visible stars; SBDC light exceeds the
  natural moonless night sky. Moonlight and ambient light, when on, are
  included.
- A perspective view beside the panorama and the all-sky view.
- An "Aim at densest sky" button.
- This folder's README gains a short guide to the new controls.

## Testing strategy

Three layers, arranged so that most faults are caught without opening a
browser by hand.

1. **Node suites in `test/`.** `publish.mjs` runs every `*.test.js` before it
   builds, so a failure stops the site build and the beta is not published.
   They take about two seconds. Each unit adds a suite for its own module.
2. **Fixtures with a stated origin.** `golden.json` freezes the default model.
   `paired-comparisons.json` freezes the 16 documented cases and carries
   Site 2's numbers as targets. A unit that is meant to move a frozen number
   regenerates the fixture in the same pull request and says why. A unit that
   is not meant to move one leaves both files untouched, which is the check
   that a new setting's default is the old behaviour.
3. **`tests/e2e/sbdc-beta.spec.js`.** The site workflow builds the site and
   runs Playwright against it, so the published beta page is driven in
   Chromium on every push. Each unit adds the checks for its controls here.
   It asserts no page errors and no network requests in every test.

Before a pull request is opened: the Node suites, one `npm run build`, the
Playwright spec, and one screenshot of the changed view.

Site 2's code is not run in these checks. Its published numbers are used: the
document's 16 whole-sky counts, and the tables in its README.

## How each unit is deployed

The beta is published by the site build from `main`. A unit is deployed by
merging its pull request once the workflow has passed. The pull request's
branch preview has its own copy of the beta at
`branch/<branch>/demos/SBDC Night Sky/beta/` before that.

No unit changes `../lib/`, `../work/` or `demos/SBDC Night Sky/`. The released
simulator stays as released.

## Status

| Unit | State |
| --- | --- |
| 1 - Faults and checks | In its pull request |
| 2 - Constellation and brightness settings, presets | Planned |
| 3 - Twilight correction and ambient light | Planned |
| 4 - Moonlight and light ratios | Planned |
| 5 - Hours of significant light, display items | Planned |
