# SBDC Night-Sky Simulator — Beta Report

*Developed by Ken Novak and David Sandalow, beta, 2026-11-26*

This report covers the beta line from its creation on 2026-11-11 to 2026-11-26. The released simulator of 2026-07-20, and its `FINAL_REPORT.md`, are unchanged; promoting the beta to a release is a separate step that needs explicit approval.

## What was delivered

| Date | Change | Pull request |
|---|---|---|
| 2026-11-11 | The beta created as a copy of the released code, published at `demos/SBDC Night Sky/beta/` on every merge. Every setting can be exported, edited and imported as a YAML file; presets are stored settings files | [knovak/siteprep#643](https://github.com/knovak/siteprep/pull/643) |
| 2026-11-15 | **Unit 1.** Eight faults found by a comparison with the sdross0 simulator corrected: custom shells ignored until reselected, the time labelled as clock time, a clock that wrote 19:59.6 as 19:00, a compass label wrong on first load, hills that changed shape past north, a satellites slider that could not reach 500,000, and two edge cases of one plane or one satellite. The readout gives counts in view beside the whole-sky totals | [knovak/siteprep#652](https://github.com/knovak/siteprep/pull/652) |
| 2026-11-15 | **Unit 2.** Plane layout, plane spread, brightness scatter and phase law as settings; the filing's 54 Sun-synchronous levels; latitude to a tenth of a degree; three presets for the sdross0 setups; a link that carries the settings | [knovak/siteprep#653](https://github.com/knovak/siteprep/pull/653) |
| 2026-11-15 | **Unit 3.** The twilight sky corrected to Patat et al. (2006); ambient light by Bortle class; a choice of naked-eye threshold; the sky's brightness and limit in the readout | [knovak/siteprep#654](https://github.com/knovak/siteprep/pull/654) |
| 2026-11-15 | **Unit 4.** The Moon with its phase and place; moonlight in the sky; SBDC light compared with a full Moon, the Moon as it is, and a natural night sky; the readout moved below the sky | [knovak/siteprep#655](https://github.com/knovak/siteprep/pull/655) |
| 2026-11-15 | **Unit 5.** Hours of significant SBDC light for a night and a year, by three definitions; a perspective view; aiming at the densest sky | [knovak/siteprep#656](https://github.com/knovak/siteprep/pull/656) |
| 2026-11-16 | The page kept at the phone's width: at 390 px it had become 1,452 px wide | [knovak/siteprep#661](https://github.com/knovak/siteprep/pull/661) |
| 2026-11-20 | An independent review ranked eleven findings; all four packages of fixes implemented: clustered satellites counted as objects and the "+7 = IAU target" cue removed; calculations bound to their inputs and cancellable off the main thread; counts readable on a phone and standard keyboard behavior; the date advanced at midnight, estimates qualified, and PNGs that record their build and settings | [knovak/siteprep#671](https://github.com/knovak/siteprep/pull/671) |
| 2026-11-26 | Each group shows a few controls and keeps the rest under Details; presets have descriptions and categories, choose which controls show, and are chosen in a preset browser; the Moon is "As on this date" by default, off in the sdross0 presets | [knovak/siteprep#687](https://github.com/knovak/siteprep/pull/687) |
| 2026-11-26 | These documents | the pull request that adds `beta/docs/` |

## Verification summary

**Automated, on every merge.** The site build runs the beta's own suites before it publishes the beta, and does not publish one that fails:

- **158 Node tests** in `beta/test/`: the physics core, rendering, formatting, settings files and links, the presets, and the regression fixtures.
- **Golden fixtures** (`test/golden/golden.json`) freeze the default constellation's numbers. They were regenerated once, in Unit 3, for the twilight correction, and gained the light summary in Unit 4 with no existing number changed.
- **Paired comparisons** (`test/paired.test.js`) set the 16 cases of the 12 October 2026 comparison document against the sdross0 simulator's whole-sky counts, each within a stated band (seed 12345):

| Pairs | No mitigation, this / that | Optimistic mitigation, this / that |
|---|---|---|
| 01–08, dark sky | 0.88 to 1.02 | 1.06 in December; 0.33 to 0.80 near the equinox |
| 11–12 and 15–16, twilight | 1.00 and 1.04 | 1.79 and 1.25 |
| 09–10 and 13–14, counts near 1,000 | 1.10 and 0.52 | both zero, as there |

  The equinox optimistic counts are of satellites within a few tenths of a magnitude of the limit, where a tenth of a magnitude changes the count by half and one plane layout differs from another by a factor of three.

- **36 Chromium browser tests** (`tests/e2e/sbdc-beta.spec.js`) drive the published page: every control reaches the model, presets and links reproduce a sky, a mistake in a file or link changes nothing, the panel and the preset browser, the Night & year results, keyboard behavior, the page at 320 and 390 px in English and French, and the PNG metadata against the exported settings.
- **The build** checks the page size (under 600 KB), the absence of any external reference, and every preset.

**Checks against outside values.**

- The moonless, unpolluted zenith well after twilight is **21.90 mag/arcsec²**, 0.19 mag fainter than the **21.71** Patat (2008) measured at Cerro Paranal from 692 dark-time V-band measurements, within one observed RMS (0.24).
- With the Schaefer threshold and the Bortle table, the simulator gives the limits the sdross0 project publishes for Bortle 1, 3, 4, 5 and 8 to within 0.03 mag.
- The Moon's series puts it within 0.1° of the Sun's longitude at the solar eclipses of 12 August 2026 and 2 August 2027, and within 0.1° of opposite at the lunar eclipse of 3 March 2026.
- For the sdross0 optimistic-mitigation setup, that project reports about 44 visible minutes each evening at the equinox and about 118 near the December solstice. The beta gives 1.5 and 3.9 hours for an evening and a morning together, twice those figures.

**Responsiveness.** At 390 × 844 in Chromium with 300,000 satellites, cancelling a night calculation was acknowledged in 27–32 ms over five trials, where the beta before the review's fixes blocked the page for 3,409 ms under a 4× CPU slowdown. One uninterrupted night took 1.38 s with no main-thread task over 50 ms.

**Sampling.** `tools/sensitivity.mjs` compares the hours with fewer satellites and coarser steps. In one June case, changing only the satellite sample moved the light-exceedance result by 20 minutes, and halving the time step moved it by 2.5 minutes. The 24 sampled dates of a year are not bounded by these checks.

## Document map

| Document | What it is |
|---|---|
| `README` | What the beta is, what changed from the release, using it, building it |
| `TUTORIAL` | A guided walkthrough with the beta's numbers |
| `SPECIFICATION` | User-facing behavior and the physical model |
| `BETA_REPORT` | This report |
| `PLAN` (beta upgrade plan) | The plan for the November 2026 upgrade, in five units |
| Beta audit, 2026-11-20 | The independent review before its fixes |
| Beta audit implementation, 2026-11-20 | The fixes, with measured results |
| `SBDC_Simulator_Tutorial (beta)` | The slide tutorial for the beta |
| `sbdc-sky-simulator.html`, `sbdc-data.json`, `sbdc-sim-beta-source.zip` | The page, its data file, and its source |

The repository's `initiatives/sbdc-night-sky/beta/README.md` is the developer reference for every change, with the before-and-after numbers of each unit.

## Remaining items

- **Accessibility on a real phone.** A VoiceOver or TalkBack session that reads both counts, aims, enters and leaves Assumptions, selects a chart sample and cancels a calculation. Automated focus and reflow checks do not replace it.
- **Before citing hours externally.** A domain review of the reference brightness, the phase law, the cluster resolution limit, and whether 24 dates suffice for the claim, with the settings, seed and build published beside any quoted figure.
- **The phone sky.** On a phone the sky scrolls away with the controls; the released documents describe it as pinned, which it never was. Whether to pin it is an open choice, recorded as an optional later item.
- **The credit line in the page** still reads "draft for review 2026-07-20", followed by the build's "Beta · changed *date*" label. These documents carry the beta date.
- **Release.** The beta becomes the released simulator only when someone asks for that in so many words. The repository's `beta/README.md` describes the steps.
