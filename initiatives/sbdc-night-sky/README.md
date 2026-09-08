# SBDC Night-Sky Simulator initiative

Adopted on 2026-09-08 from the existing demo and the supplied `sbdc.zip`.
The application and supplied documents are preserved unchanged. The existing
application implements the wish; this PR brings its source, tutorial, reports,
and lifecycle records into the initiative system.

## Start here

- [Test simulator](../../preview/initiatives/sbdc-night-sky/index.html)
- [Existing production demo](https://knovak.github.io/siteprep/demos/SBDC%20Night%20Sky/)
- [Wish](wish.html), [objectives](objectives.html), and [adoption decisions](decisions.html)
- [Supplied specification](spec.html) and [supplied implementation plan](plan.html)
- [Adoption checks and user test plan](test-plan.html)
- [Provenance and all supplied phase, final, and upgrade reports](notes.html)
- [Adoption log](log.html)

The original README and complete tutorial appear below, without edits. Their
`sbdc-sky-simulator.html` is adopted as `work/index.html`; downloading that file
provides the same standalone simulator. All nine original markdown documents
also remain under `lib/` with their original filenames and bytes. The source
archive is retained intact under `notes/`.

## Original file map

| Supplied document | Read in this initiative | Original file |
| --- | --- | --- |
| `README.md` | This page | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/README.md) |
| `TUTORIAL.md` | This page | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/TUTORIAL.md) |
| `SPECIFICATION.md` | [Specification](spec.html) | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/SPECIFICATION.md) |
| `IMPLEMENTATION_PLAN.md` | [Implementation plan](plan.html) | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/IMPLEMENTATION_PLAN.md) |
| `PHASE1_REPORT.md` | [Notes](notes.html) | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/PHASE1_REPORT.md) |
| `PHASE23_REPORT.md` | [Notes](notes.html) | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/PHASE23_REPORT.md) |
| `PHASE4_REPORT.md` | [Notes](notes.html) | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/PHASE4_REPORT.md) |
| `FINAL_REPORT.md` | [Notes](notes.html) | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/FINAL_REPORT.md) |
| `UPGRADE_PLAN.md` | [Notes](notes.html) | [Original](https://github.com/knovak/siteprep/blob/codex/adopt-sbdc-night-sky/initiatives/sbdc-night-sky/lib/UPGRADE_PLAN.md) |

## Working on the adopted source

The complete source tree is in `lib/`, with its own original README. The
commands in that README run from that directory. The repository has no new
dependencies or build steps for this adoption. `work/` is the deployment
snapshot; the preserved builder writes `lib/dist/sbdc-sky-simulator.html`
when explicitly invoked. A later approved source change would need to update
the snapshot deliberately.

For the full inherited suite, include the renderer tests:

```sh
cd initiatives/sbdc-night-sky/lib
node --test test/model.test.js test/scenarios.test.js test/golden.test.js test/render.test.js
node build.js
cmp dist/sbdc-sky-simulator.html ../work/index.html
```

The original `npm test` omits `test/render.test.js`. The inherited simulated
browser smoke requires `jsdom` and `canvas`, which its package manifest does
not declare. The adoption uses the repository's installed Playwright Chromium
for a real-browser smoke check; see the test plan for coverage and limits.

This is a file adoption and test preview. Application changes and corrections
to the supplied documents require a separate scope; document edits require the
user's permission. Production release requires explicit approval after testing.

---

## Supplied README — preserved in full

# SBDC Night-Sky Simulator

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

An interactive, physics-based simulation of how a very large constellation of space-based data centers (SBDCs) would appear in the sky — from any latitude, on any date, at any time of day. Built to accompany the SBDC report; scenario grounded in the January 30, 2026 FCC filing (up to 1,000,000 satellites, 500–2,000 km, Sun-synchronous and 30°-inclination shells).

## Using it

Open **`sbdc-sky-simulator.html`** in any modern browser. It is a single self-contained file: no installation, no internet connection, nothing else to download. On a phone, the sky stays pinned at the top of the screen while the controls scroll and collapse beneath it, so every slider change is visible immediately.

**Looking around:** the default view faces north, with east on the right like a map; drag to pan, scroll or pinch to zoom (20°–140° field of view), or switch to the all-sky fisheye (zenith at center, horizon at the rim, north up, east right). A small labeled crosshair marks the celestial pole — the point the whole sky rotates around (altitude equals your latitude); switch it off under Sky & display. Hover or tap a bright point to identify it — satellites report family, range, shell, and magnitude; stars report their names. Keyboard: arrows pan, `+`/`−` zoom, space toggles Play.

**Controls:** latitude, date (sunset/sunrise shown live, including polar day/night), and local solar time with quick jumps (Sunset, +30, +60, Midnight, Dawn−30) and a Play animation. Constellation size runs 10,000–1,000,000 (default 300,000, the report's "several hundred thousand"); further sliders set the SSO/30°-shell split, shell-altitude preset, the **SBDC brightness** reference (−7 to +7 mag, anchors at +0.5 unmitigated / +5.5 strong mitigation / +7 IAU target), recent launch trains, and the eye/sky-quality limit. **Data-center clustering** (v3, off by default) packs satellites into tight formations; the readout then counts visible *objects* versus the satellites they contain. Playback offers **Real time** (true orbital propagation — satellites traverse the sky against near-still stars) and **Fast forward** with a shimmer toggle; a **twilight lock** holds sunset/dawn-relative time across latitude and date changes. Seed, tint, pole marker, the fast-forward shimmer toggle, and cluster-variation dials live in the **Advanced** group. Every view and exported PNG carries the attribution line. The seed makes every rendered sky exactly reproducible.

**Save PNG** exports the current view with the readout burned in — report-ready. The readout strip always shows sun depression, satellites above the horizon / sunlit / naked-eye visible, visible stars, and the brightest satellite with a plain-language anchor.

**Long-exposure camera mode** (Sky & display) renders the astronomy-impact view: one 30-second exposure in which every sunlit satellite becomes a 12–27° streak and the star field deepens to the full catalog. **Custom shell mixes** can be typed as `altitude:share` pairs under Shell altitudes → Custom. The **FR** button switches the interface to French (the assumptions table stays in English, mirroring the data file verbatim). See `TUTORIAL.md` for a guided walkthrough and the user-relevant limitations.

## Auditing the physics

Click **Assumptions & data**. Every constant the simulation uses — 43 parameters — is listed with its value, units, source, and a confidence rating (measured / published / modeled / assumed). The photometry section is deliberately flagged as the least certain: the FCC filing gives no satellite sizes or albedos, so the magnitude distribution is calibrated to the report annex's −2 to +4 envelope. The renders are illustrative, not photometric predictions.

To change an assumption, edit the `<script type="application/json" id="sbdc-data">` block inside the HTML file (or `data/sbdc-data.json` in the source tree and rebuild). No code changes are needed — the model reads everything from that block.

Documented simplifications: spherical Earth, no atmospheric refraction (~0.5° at the horizon), circular orbits, local solar time as the clock (longitude therefore irrelevant), no Moon, penumbra ignored. None materially affect the questions the tool answers.

## For developers

```
npm test                 # 59 unit + acceptance + golden-regression tests
node build.js            # inline everything -> dist/sbdc-sky-simulator.html
node test/smoke-browser.mjs  # boots the BUILT file headlessly, 3 layouts
node tools/validate.mjs  # credibility checks vs external anchors
node tools/make-golden.mjs   # refreeze golden fixtures (intentional changes only)
```

Layout: `data/` (assumptions + Yale Bright Star Catalog, 9,096 stars), `src/model.js` (pure physics — the tested core), `src/render.js` (Style A twilight-photographic renderer), `src/ui.js`, `build.js`. Node is used only for tests and the build; the artifact itself has zero dependencies.

## Manual checks before wide distribution

Automated coverage is strong (the headless smoke test boots the real built file at desktop, phone, and pathological layouts), but three things only real devices confirm: pointer/pinch feel in Safari, Chrome, and Firefox; the Save PNG download flow (in-app preview panes sometimes sandbox downloads — use "open in browser" if it fails); and performance on older phones, where lowering the satellite slider is the intended relief valve.

## v2 status

Long-exposure/telescope streak mode: **implemented**. Second language (French): **implemented**. Live TLE overlays of real tracked satellites: **not implemented by design** — it inherently requires network access, which contradicts the standalone requirement; the served-version trade-off is documented in SPECIFICATION.md §6 and the architecture (data + pure model + UI) ports without rework if it is ever wanted.

---

## Supplied tutorial — preserved in full

# SBDC Night-Sky Simulator — User Tutorial

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

This tool shows you what the sky would look like if a very large constellation of space-based data centers (SBDCs) were in orbit — from anywhere on Earth, on any date, at any time. It runs from a single file, `sbdc-sky-simulator.html`, entirely on your own device: open it in any browser, no internet needed.

## Five minutes to the main story

Open the file. You're looking north from 40°N (east on the right, like a map) about half an hour after sunset on the June solstice, with 300,000 SBDCs overhead — the warm points are satellites, the cooler white points are real stars. The strip along the bottom of the sky tells you what you're seeing: how many satellites are above the horizon, how many are lit by the Sun, how many your naked eye could actually pick out, and how that compares to the number of visible stars.

One more experiment before the tour: press **▶ Real time**. The satellites crawl visibly across the sky — a moon-width every few seconds for the nearer ones — while the stars behind them stand essentially still. That contrast, steady stars behind drifting artificial lights, is what an evening under this constellation would actually feel like. **▶▶ Fast forward** sweeps through the night instead; with "shimmer" on (the default) satellites keep streaming through the band as time races, and switching it off freezes their along-track motion for a calmer sweep.

Now try the experiment the tool was built for. Tap **Midnight**: the satellites vanish — at local midnight the swarm is below the horizon and Earth blocks the view. Tap **Sunset**, then **+30 min**, then **+60 min**, and watch the band of satellites emerge as the sky darkens, then thin out. Press **Play** to sweep through a whole day continuously. This is the report's central geometry made interactive: the dawn–dusk swarm rides the day–night line, Earth turns beneath it, and *every* place on Earth passes under it at its own local twilight, twice a day.

Then move the **Latitude** slider (tick **Hold time relative to sunset/dawn as latitude changes** first if you want "30 minutes after sunset" to stay 30 minutes after *local* sunset as you travel; under polar day or night, where no sunset exists, the clock simply holds still). Near the equator at dusk the band stands tall through the southern sky. Drag up to 55–60°N with the date near June 21 and jump to Midnight: the satellites *don't* vanish — at high summer latitudes they stay sunlit and visible all night. That is the high-latitude problem the report describes, and you just found it with two sliders.

## Looking around

Drag the sky to turn; pinch (or scroll) to zoom between a 20° close-up and a 140° panorama. The compass badge shows which way you're facing. A small labeled crosshair marks the **celestial pole** — the fixed point the entire sky wheels around each night, sitting at an altitude equal to your latitude, toward the north (or the south, below the equator). Drag the latitude slider and watch it climb from the horizon at the equator to straight overhead at the pole. It can be switched off under Sky & display. Switch **View** to the all-sky fisheye to see the entire sky at once — zenith at the center, horizon around the rim, the "more satellites than stars" picture in one frame. Tap or hover any bright point to identify it: satellites report their orbit family, distance, shell altitude, and brightness; the brightest stars answer with their names.

On a phone, the sky stays pinned to the top of the screen while the controls scroll beneath it, so you always see the effect of a slider as you move it. The three control groups collapse and expand with a tap.

## The controls, and what they're for

**Observer** sets where and when: latitude, date (the computed sunset and sunrise appear under the date slider — including "polar day" and "polar night" when there isn't one), and local time.

**Constellation** sets the scenario. The satellite count runs from 10,000 to 1,000,000 — the upper end is the FCC filing's maximum; 300,000 matches the report's "several hundred thousand." The **orbit families** slider splits the population between Sun-synchronous dawn–dusk orbits (the twilight band) and 30°-inclination shells (spread across the sky at low latitudes, invisible from polar regions). **Shell altitudes** offers presets or *Custom…*, where you can type your own mix as `altitude:share` pairs, e.g. `550:0.5, 1200:0.5`. **SBDC brightness** is the single most consequential slider in the tool, and as of v3 it *is* the assumption, stated directly: the median satellite magnitude at a standard reference (1,000 km away, half-lit, overhead), from −7 to +7. Three labeled anchors orient you: **+0.5** is the unmitigated large platform of the report's annex (the default); **+5.5** is *strong mitigation*, roughly the Starlink darkening record; **+7** is the astronomers' (IAU) recommendation. Mitigation measures — darkening coatings, careful attitude control — are simply the engineering that moves a design toward the faint end of this scale. Watch the visible count fall by an order of magnitude as you slide right, without ever reaching zero. **Launch trains** adds freshly launched strings of satellites climbing to their orbits.

**Cluster into data-center groups** is v3's biggest idea, off by default so the report's published skies stay reproducible. Real orbital data centers might not fly as scattered singletons: keeping compute traffic on short optical links argues for packing satellites into tight formations — tens to hundreds within a kilometer or so — with longer links between clusters. Switch it on and the sky transforms: thousands of scattered points collapse into a few hundred brilliant knots, because a hundred individually-invisible satellites shining together add up to one very visible object. The readout switches to counting **visible objects** and telling you how many satellites they contain, and hovering a knot reports its membership, angular size, and combined magnitude — the brightest knots outshine Venus. Satellites per cluster and cluster diameter sit beside the toggle; their statistical variations are under Advanced. The FCC filing is silent on clustering, so this whole section is flagged *assumed* in the data file — it exists precisely so the two architectures can be compared. The **seed** (under **Advanced**, alongside the family-tint, celestial-pole, and fast-forward-shimmer toggles and the cluster-variation dials) makes any sky exactly reproducible — note it down and anyone can recreate your exact frame.

**Sky & display** controls what you compare against. The **eye/sky quality limit** simulates your site: 6.5 is a pristine dark sky, 4.5 a light-polluted suburb. **Tint by orbit family** colors the satellite families differently — useful for analysis, off by default for realism. **Long-exposure camera (30 s)** switches from what your *eye* sees to what a *telescope or camera* records: every sunlit satellite becomes a 12–27° streak across the frame, and the star field deepens to the full catalog. This is the astronomy-impact view — a research image with thousands of trails through it.

**Save PNG** exports exactly what you see, with the readout burned in, ready for a report or an email. **FR** switches the interface to French (the assumptions table remains in English — it mirrors the underlying data file verbatim). **Assumptions & data** is described below, and is worth a visit.

## Reading the numbers honestly

The readout distinguishes three things that are easy to conflate. *Above horizon* is pure geometry. *Sunlit* removes satellites hiding in Earth's shadow. *Visible* is the naked-eye test: a satellite (or star) counts only if it outshines the sky behind it — which is why almost nothing is "visible" at noon, and why the counts change minute by minute through twilight. The *brightest mag* figure comes with a plain-language anchor ("Venus-class," "like Jupiter") so the magnitude scale doesn't get in your way. Remember that magnitudes run backwards: −4 is brilliant, +6 is the faintest thing a perfect eye can see.

## Limitations and assumptions you should know about

**The satellite brightness is an assumption, not a measurement.** The FCC filing says nothing about satellite sizes, coatings, or orientations. The simulator assumes large unmitigated platforms spanning roughly magnitude −2 to +4 — the envelope derived in the report's annex — with the mitigation slider expressing how much engineering could darken them. Every rendered sky is an *illustration of a scenario*, not a photometric prediction. If someone challenges a picture from this tool, the honest answer is: the geometry is solid; the brightness is a stated, adjustable assumption.

**The constellation arrangement is invented within the filing's envelope.** The filing bounds the totals, altitudes (500–2,000 km), and the two inclination families, but not how satellites divide among shells and planes. The presets are plausible arrangements, not the operator's plan — which is exactly why they're sliders.

**Simplifications that don't change the story:** the Earth is treated as a perfect sphere; atmospheric refraction (about half a degree at the horizon) is ignored; orbits are perfect circles; there is no Moon, so real nights will sometimes be brighter than shown; satellite colors and the rolling-hills silhouette are aesthetic. The clock (labeled simply "Local time") is *local solar time* — your watch may differ by up to an hour or so (more with daylight saving), so "sunset" here means the real Sun at the horizon, not 6 pm on the dial. The long-exposure mode draws each trail as a straight 30-second chord and assumes a camera reaching magnitude 9. Real-time playback moves satellites along ideal circular orbits (drag and higher-order gravity are negligible over minutes); clusters are treated as rigid formations, as station-keeping would make them.

**Every number behind the simulation is inspectable.** The **Assumptions & data** panel lists all 53 parameters with units, sources, and a confidence rating — *measured*, *published*, *modeled*, or *assumed*. The "assumed" rows are the ones a skeptical reader should probe, and the tool is designed so probing them is a slider, not an argument. Editing the data block inside the HTML file changes the physics with no programming.

**What it deliberately doesn't do:** it does not track real satellites (no live orbital data — that would require an internet service), does not model radio-frequency or thermal impacts, and does not simulate collision or debris questions. It answers one question well: *what would this look like?*
