# SBDC Night-Sky Simulator — Specification (beta)

*Developed by Ken Novak and David Sandalow, beta, 2026-11-26*

**Purpose:** An interactive, standalone simulation showing how a very large constellation of space-based data centers (SBDCs) would appear in the sky from any point on Earth, at any time of day and year.

**Status:** The beta, as published on 2026-11-26. This specification describes the beta. The released simulator of 2026-07-20 is specified by the `SPECIFICATION.md` in the parent folder, which is unchanged; this document keeps its section numbers where the content is the same and says what changed.

---

## 1. Background and scope

The simulator generalizes the report's two frozen figures — an orbit-geometry diagram and a horizon view about 30 minutes after sunset. The user chooses a latitude, a date and a time of day; the simulator renders the sky that observer would see, with the SBDC swarm, launch trains, background stars and optionally the Moon, and reports what is above the horizon, what is sunlit, what the naked eye would see, and how the light of the constellation compares with the Moon and with the natural night sky.

The scenario is the January 30, 2026 FCC filing: up to one million satellites, 500–2,000 km altitude, in Sun-synchronous (dawn–dusk) and 30°-inclination shells. The filing does not specify shell arrangement, satellite size or brightness, so those are explicit, user-adjustable assumptions (Section 5).

**In scope:** naked-eye horizon, perspective and all-sky views; twilight, night and day; Earth-shadow eclipsing; both orbit families, with the filing's 54 Sun-synchronous levels as one arrangement; launch trains; latitude effects; satellite brightness as a stated parameter with a choice of phase law; data-center clustering; artificial skyglow; the Moon and moonlight; the summed light of the constellation; the hours of a night and of a year in which that light is significant; real-time and fast-forward playback; settings files, links and presets.

**Out of scope:** photometric-grade brightness prediction; radio and thermal impacts; collisions and debris; individual-satellite ephemerides against real TLEs.

## 2. User-facing behavior

### 2.1 Views

**Horizon view (default).** A panorama: azimuth runs evenly across, altitude evenly up, so the horizon is level and a ring of satellites is drawn curved. Twilight glow sits over the Sun's azimuth. A ground silhouette with compass points runs along the bottom; it repeats every 360°.

**Perspective view.** What a flat camera sensor records: straight lines in the sky stay straight, the horizon is level only at the center, the scale grows toward the edges. At most 120° across. It is the projection the sdross0 simulator uses.

**All-sky view.** Fisheye projection, zenith at the center, horizon at the rim.

All views pan (drag) and zoom (wheel, pinch, `+`/`−`; 20°–140° in the horizon view). **Aim at densest sky** turns an aimed view to the window of the current width that holds the most visible SBDCs, anywhere round the horizon, without changing its altitude. Hovering or tapping a point shows a tooltip: for a satellite, its family, altitude and azimuth, range, shell, magnitude and whether it is sunlit; for a cluster, its members, extent and combined magnitude; for a bright star, its name; for the Moon, its lit fraction and altitude.

### 2.2 Controls and the control panel

The controls are in six groups. Each group shows up to three controls and keeps the rest under a **Details** section that starts closed; a closed section lists the names of the controls inside it, in small type and in its tooltip. A settings file's `panel` section chooses which controls each group shows, in what order, and whether each Details section is open; a preset uses it to show the controls it is about. The default arrangement:

| Group | Shown | Under Details |
|---|---|---|
| Presets & settings | the preset card, Browse presets, ‹ › | Copy link, Export settings, Import settings |
| Observer | latitude, date, the jump buttons | solar time, hold time relative to twilight, playback |
| Constellation | satellites, SBDC brightness, clustering | orbit families, shell altitudes, plane layout, plane spread, brightness scatter, phase law, launch trains |
| Sky & display | view (with Aim) | eye limit, ambient light, Moon, stars, long exposure |
| Night & year | — | compute, the table of hours, the chart |
| Advanced | — | seed, naked-eye threshold, orbit-family tint, celestial pole, shimmer, cluster variations |

Control ranges: latitude −90° to +90° to a tenth of a degree; date as month and day on a 365-day calendar; solar time to the minute; satellites 10,000 to 1,000,000 (logarithmic, landing on round totals); SBDC brightness −7 to +7 in tenths; brightness scatter 0 to 2 mag; plane spread 0° to 30°; launch trains 0 to 10; eye limit 4.0 to 6.5; ambient light Bortle 1 to 9; Moon off, as on the date (default), or a set age 0 to 29.5 days; year 1900 to 2100 for the dated Moon.

### 2.3 Readouts

Under the sky, not over it:

- **Headline:** visible objects in view and across the whole sky, and visible stars in view and across the sky, with **Aim at densest sky** beside it.
- **First line:** the Sun's altitude; SBDCs above the horizon, sunlit, and naked-eye visible (with the count in view); visible stars; the brightest SBDC magnitude with a plain anchor. With clustering on, it counts visible objects and the satellites within them.
- **Light line:** the summed light of every sunlit SBDC above the horizon as one magnitude, as a fraction or multiple of a full Moon overhead and of a moonless natural night sky, and — when a Moon is up — of that Moon's light.
- **Sky line:** latitude, date, solar time and its distance from sunset or sunrise, the zenith sky brightness (with the Bortle class when there is ambient light), the naked-eye limit, the seed, and the definition of "visible".

The compass label reads the direction the view faces and follows every pan.

### 2.4 Physical behaviors the simulation must reproduce

1. **Twilight concentration.** For dawn–dusk Sun-synchronous satellites, the dense band is seen near local dusk and dawn; at local midnight at middle and low latitudes most of the swarm is below the horizon or in shadow.
2. **The twilight sky hides faint objects.** Half an hour after sunset the sky is still bright; visible counts rise steeply as the Sun sinks from 6° to 12° below the horizon. In the default scenario at 40°N on June 21: 546 visible SBDCs against 2 stars at 30 minutes after sunset, 3,759 against 272 at 60 minutes, 736 against 1,641 at midnight.
3. **Latitude independence of the twilight pass.** Every latitude passes under the band twice a day.
4. **High-latitude summer.** Near 55°–65° around the June solstice the ring stays above the horizon and sunlit all night (at 60°N, 10,955 of 11,251 above the horizon at midnight), while the twilight sky limits what the eye sees (13 at midnight).
5. **30°-shell behavior.** Visible from low and middle latitudes across the sky, progressively eclipsed as the night deepens, absent from high-latitude skies.
6. **Earth shadow.** A satellite in shadow is not drawn; higher shells stay sunlit longer.
7. **Band geometry.** Density increases toward the horizon along the slant path, while extinction dims the lowest objects. With planes as filed the constellation draws as distinct rings.
8. **Appearance.** Satellites are steady points rendered as smooth point-spread profiles.
9. **Launch trains** run along the track of the plane they are climbing into, lower and brighter than the operational shells.
10. **Day sky.** Before sunset and after sunrise the sky hides almost everything.
11. **Moonlight.** A Moon above the horizon brightens the sky most near itself, lowers the limit and hides faint satellites and stars; a Moon below the horizon adds nothing.
12. **Clusters.** Packed satellites appear as fewer, brighter objects; an unresolved group counts once in every visible count.

### 2.5 Night & year

**Compute this night** works through the chosen date's day, noon to noon, in five-minute steps; **Compute the year** works through 24 dates (the 6th and the 21st of each month) in fifteen-minute steps and scales them to a year. Both use every other setting as it stands. Three definitions of "significant" are reported side by side, with the length of the night (the Sun below −0.833°) for scale:

| Row | A moment counts when |
|---|---|
| at least 100 visible SBDC objects | 100 or more are above the horizon, sunlit, and brighter than the limit of the sky where they are |
| visible SBDC objects outnumber visible stars | more SBDC objects than stars are visible |
| SBDC light exceeds the sky's own light | the summed light of all sunlit SBDCs above the horizon exceeds the light of the whole sky at that moment |

The calculation runs off the main thread and can be cancelled. A night uses up to 100,000 of the satellites and a year up to 30,000, each standing for several. A chart shows visible SBDCs and stars through the night with bars for each definition; a click or the chart-time slider moves the sky to that moment. Results carry the observer they were computed for and are marked stale when a setting changes.

## 3. Architecture

**Deliverable:** one standalone HTML file, about 460 KB, no network access, everything inline. The build fails if the page exceeds 600 KB or references any external resource.

Source modules, kept separate until the build inlines them into one scope:

- `data/sbdc-data.json` — every constant, assumption and dataset (Section 5), embedded as `<script type="application/json" id="sbdc-data">`.
- `src/model.js` — pure functions, no DOM: ephemerides of the Sun and Moon, coordinate transforms, constellation generator, shadow test, magnitude and phase laws, sky brightness with twilight, skyglow and moonlight, visibility, summed light, and the night and year sampling.
- `src/render.js` — Canvas 2D renderer for the three projections, hills, compass, Moon and long-exposure trails.
- `src/settings.js` — the settings schema, the YAML writer and reader, links, and the control panel's groups.
- `src/format.js`, `src/provenance.js` — text formatting; the settings reference and PNG metadata.
- `src/ui.js` — controls, panel arrangement, preset browser, readouts, Night & year.
- `src/analysis-worker.js` — the night and year calculations, run in a worker built from the same model code.
- `presets/*.yaml` — one settings file per preset, embedded by the build in the order of their leading numbers.

**Reproducibility:** all random placement uses a seeded generator; the seed is a setting. A settings file or link reproduces a sky exactly, and a saved PNG records its settings.

## 4. Physical model

### 4.1 Sun position

As released: a low-precision solar ephemeris gives declination and equation of time; sunset and twilight times come from solar-altitude crossings (−0.833°, −6°, −12°, −18°). The clock is local solar time, so longitude is not an input.

### 4.2 Constellation generator

As released — circular orbits, Sun-synchronous inclinations from the J2 nodal-precession condition, nodes clustered about the dawn–dusk line — with these changes:

- **Plane spread** (`plane_spread_deg`, default ±11.25°, the released fixed value) sets how far the Sun-synchronous planes spread each side of the dawn–dusk line.
- **Plane layout.** *Spread* (default, the released layout): 72 planes per shell and node family, evenly across the spread, satellites at random along each. *As filed*: two planes per shell level, one per node family, each node drawn once within the spread, satellites evenly spaced along the plane.
- **Filed SSO levels:** the 54 altitude levels of the filing's three Sun-synchronous groups (565–585, 707–744 and 967–1,002 km), with shares in proportion to the filed satellites per plane.
- One plane per shell sits at the center of the spread; a launch train of one satellite has a position.

### 4.3 Visibility pipeline (per satellite)

1. **Above horizon:** spherical Earth, refraction ignored.
2. **Sunlit:** conical Earth-shadow test.
3. **Bright enough:** the satellite's magnitude (4.4) against the naked-eye limit of the sky at its position (4.5), which includes twilight, skyglow and moonlight.

With clustering, members of an unresolved group are combined into one object of their summed light before the test; the readout reports both the objects and the satellites they contain.

### 4.4 Satellite magnitude model

m = m₀ + 5·log₁₀(range / 1,000 km) + P(α) − P(90°) + k · airmass

m₀ is drawn per satellite from N(m_ref, σ), where **SBDC brightness** sets the median m_ref (default +0.5) and **brightness scatter** sets σ (default 1.3). Extinction k = 0.20 mag per airmass. P(α) is the phase law in magnitudes, taken relative to its value at 90°, so the brightness slider means the same under either:

- **Lambertian sphere** (default, the released law).
- **Measured Starlink Gen2 Mini, mitigated:** 2.630 + 0.1065·α − 0.0005167·α² mag at 1,000 km, α in degrees (Mallama et al. 2023). About 4.4 mag brighter at 10° than at 90°; the sphere is about 1.2.

Labels mark +0.5 "unmitigated" and +5.5 "strong mitigation". The slider is a population median at a reference geometry, not an apparent magnitude at the observer; it is not a compliance test. **This remains the least certain part of the model.**

### 4.5 Sky brightness and detection threshold

The zenith sky brightness μ (mag/arcsec²) is the sum, in light, of three parts:

- **Twilight:** a table against the Sun's depression. Since the beta's correction it follows the V-band fit of Patat et al. (2006), one row per degree from 5° to 15°, with measured values at sunset and 3° down (13.30 at 6°, 17.00 at 9°, 19.67 at 12°, 21.32 at 15°). At the end of civil twilight the released table's sky was about 19 times darker than these values. A gradient brightens the sky toward the Sun.
- **Ambient light:** artificial skyglow by Bortle class, taken as the same in every direction (class 1 none; 3, 21.5; 5, 19.8; 7, 18.2; 8, 17.5; 9, 16.8). Classes 2 to 8 are the values the sdross0 project uses.
- **Moonlight:** Krisciunas and Schaefer (1991), from the Moon's phase and altitude, the angular distance from the Moon and the altitude of the point.

The naked-eye limit for a point is then one of two threshold laws, capped by the **eye limit**:

- **Table** (default): the simulator's own table, which with the corrected sky matches when stars are seen to appear in twilight (first magnitude with the Sun about 6° down, third by 8°, fifth by 11°).
- **Schaefer formula:** 7.93 − 5·log₁₀(1 + 10^(4.316 − μ/5)), the form used for sky-quality-meter readings and by the sdross0 project; stricter under a bright sky, within 0.1 mag once the sky is dark.

Stars and satellites share the threshold. The dark-sky zenith, moonless and with no skyglow, is 21.90 mag/arcsec², 0.19 mag fainter than the 21.71 Patat (2008) measured at Cerro Paranal.

### 4.6 Star field

As released: the Yale Bright Star Catalog, 9,096 stars to V ≈ 6.5, with proper names for the brightest.

### 4.7 Launch trains

As released: about 60 satellites at about 400 km, strung along-track in a plane offset from the operational planes.

### 4.8 The Moon

The Moon's place comes from the low-precision series of the Astronomical Almanac (about 0.3°), for the chosen year, date and solar time taken as universal time; with no longitude the place is within about 7° of the truth anywhere. Its phase comes from its angle from the Sun. "Set the phase" places a Moon of a chosen age on the ecliptic instead. The Moon is drawn with its phase, about three times its true size. The tests check the series against the solar eclipses of 12 August 2026 and 2 August 2027 and the lunar eclipse of 3 March 2026.

### 4.9 Summed light

The light of every sunlit SBDC above the horizon is added and written as one magnitude, including satellites too faint to see one by one. It is compared with a full Moon overhead, with the light of the whole moonless sky (stars and airglow, about −6.7 mag, about one thousandth of a lux), and with the Moon as it is, dimmed by the air. It is light summed over the hemisphere, neither a brightening at any one point nor illuminance on the ground.

## 5. Data & assumptions file

Every value in `sbdc-data.json` carries a value, units, source and confidence (measured, published, modeled or assumed). The **Assumptions & data** panel renders it as nine tables with 47 parameters: 7 measured, 7 published, 13 modeled, 20 assumed.

| Section | Contents | Changed in the beta |
|---|---|---|
| `physicalConstants` | Earth radius, μ, J2, AU, Sun radius, obliquity, tropical year | — |
| `scenario` | totals, the Sun-synchronous share, node time and spread, shell presets, planes per shell, plane layouts | `shellPresets.filed-sso`, `planeLayouts` |
| `photometry` | m₀ mean, scatter and clamp, phase function, phase laws, extinction, launch trains, camera mode, reference brightness | `phaseLaws` |
| `skyBrightness` | the twilight table, the twilight glow, skyglow by Bortle class | `table` corrected, `artificialByBortle` |
| `limitingMagnitude` | the threshold table, the eye limit cap, the Schaefer formula | `closedForm` |
| `shadowModel` | shadow geometry | — |
| `geometryModel` | spherical Earth, refraction, airmass, year anchor, propagation | — |
| `renderCalibration` | point-spread profiles | — (the sky's color ramp, in `render.js`, moved with the corrected table) |
| `clustering` | membership, diameter, their variation, resolution limit, station keeping | — |

Replacing the JSON block changes the simulation with no code edits.

## 6. Settings files, links and presets

Every setting travels as one settings object, in one format:

- **A settings file** is YAML in five sections: `observer`, `constellation`, `display`, `advanced` and `panel`. An export lists every setting with a comment. Times are relative to sunset or sunrise (`sunset +30`) or a clock time in quotes. A key left out takes its default, so a file always gives the same result. A file with a mistake changes nothing and the panel lists each mistake by line; a value out of range moves to the nearest end and an unknown key is ignored, both reported.
- **A link** carries the settings that differ from the defaults after `#`, as `section.key=value` pairs, under the same rules. Nothing is sent anywhere.
- **A preset** is a settings file in `presets/` with three lines of text before its settings: a `name`, a one- or two-sentence `description` (at most 320 characters), and an optional `category`. The build refuses a preset with a mistake, an unknown key, an out-of-range value, a missing or repeated name, or a missing or overlong description.
- **The panel section** holds, for each group, the controls shown outside Details (none, or up to three, in order) and whether its Details section is open.
- **The settings reference** in an export's file name and a saved PNG is a hash of the settings without the panel section, so two pictures of the same sky have the same reference.

The **preset browser** lists every preset with its description under its category, with a word filter, category buttons, and keyboard use; on a phone it fills the screen.

## 7. Standalone

The simulator remains a single standalone file. The reasons of the released specification still hold, and nothing in the beta needs a server: the settings travel in files and links, and the Moon and the hours are computed on the device.

## 8. Non-functional requirements

Performance: interactive pan and zoom at 300,000 satellites on a recent laptop; the night calculation does not block input (cancellation acknowledged in about 30 ms in a phone-sized Chromium profile). Compatibility: current Chrome, Edge, Firefox and Safari, desktop and phone; the page is never wider than the screen. Accessibility: native buttons and disclosures; keyboard shortcuts only while the sky is focused; a modal Assumptions panel that takes and returns focus; a keyboard chart-time slider with a text equivalent; counts as live text. No external network requests.

## 9. Verification

`BETA_REPORT` gives the tests and checks against which this specification is verified, and what remains open.
