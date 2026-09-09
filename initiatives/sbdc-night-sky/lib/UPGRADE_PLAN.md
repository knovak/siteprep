# SBDC Night-Sky Simulator — Upgrade Plan (v3)

*Developed by Ken Novak and David Sandalow, draft for review 2026-07-20*

**Status: APPROVED AND IMPLEMENTED.** July 18, 2026 · Review answers: (1) brightness semantics approved; (2) clustering **off** by default; (3) 100 sats / 1 km defaults confirmed; (4) derived cluster count + inherited distribution confirmed; (5) twilight-lock behavior approved; (6) fast-forward motion behind a **shimmer checkbox, default on**; (7) Advanced group contents as proposed.

This plan evaluates the five requested upgrades, proposes designs, and lays out implementation phases with the documentation updates and test expansion built into each. Open questions for review are collected at the end.

---

## Evaluation of the five requests

### 1. "Brightness" slider replacing "Brightness mitigation" — sound, with one definitional subtlety

The current design (hidden baseline distribution + mitigation offset) buries the most-challenged assumption two layers deep. Exposing brightness directly is a genuine auditability improvement. The subtlety: *apparent* magnitude varies per satellite with range, phase angle, and extinction, so one number cannot literally be every satellite's apparent magnitude. **Proposed definition:** the slider sets the **reference brightness** — the median satellite magnitude at a standard condition (1,000 km range, 90° phase, zenith), range **−7 to +7**. The population keeps its ±1.3-mag scatter (satellites differ in size/attitude/albedo); range, phase, and extinction then vary each satellite around that, exactly as now. Mitigation is reframed as *interpretation*, not mechanism: the slider gains labeled anchors — **+0.5 "unmitigated large platform"** (the report-annex envelope, and the proposed default so all published figures remain reproducible), **≈ +5.5 "strong mitigation (Starlink-style darkening record)"**, **+7 "IAU recommendation"** — with a hint explaining that darkening coatings and attitude control are the engineering that moves a design along this scale. −7 (≈ 60× Venus at reference) is retained as an exploration bound, flagged in the data file as beyond any plausible design.

Internals: `state.brightnessRefMag` replaces `state.mitigationMag`; generation stores each satellite's *deviation* from the reference, so moving the slider stays evaluation-cheap (no constellation rebuild). **This changes the state schema → golden fixtures will be regenerated intentionally, with an equivalence test proving the default reproduces today's default population exactly.**

### 2. Advanced settings group — straightforward

New fourth collapsible group **Advanced**, collapsed by default on all screen sizes, containing Seed + Randomize, Tint by orbit family, and Mark celestial pole — plus (proposed) the cluster-*variation* sliders from item 5, which are exactly the kind of second-order knob that belongs there. Mobile boot logic and the group-collapse smoke assertions update from 3 groups to 4.

### 3. Local solar time — the easy parts, plus one that reaches into the physics core

**Dawn −60** button: trivial. **Twilight-locked time:** a checkbox — *"Hold time relative to sunset/dawn"*. When on, the app stores the current time as an offset from its nearest twilight reference (sunset or dawn); changing latitude or date then recomputes the clock so "sunset + 30 min" stays sunset + 30 min at the new location. Dragging the time slider while locked re-anchors at the new offset. Polar day/night (no sunset exists): fall back to absolute time with a brief hint, lock resumes when a sunset exists again.

**Two playback modes** — here is the buried technical issue: the model is currently a *statistical snapshot*. Satellites never move along their orbits; advancing time only rotates the frame, so in a naive "real time" mode satellites would drift with the stars at 15 arcsec/s — precisely failing the stated goal. Real-time play therefore requires **orbital propagation**: each satellite advances along its circular orbit analytically from its stored position and velocity (`P(τ) = P·cos nτ + rV̂·sin nτ` — two trig calls per satellite, cheap even at 1M). With that in place: **▶ Real time** advances simulated time at wall-clock speed with re-evaluation at ~3 Hz (adaptive, lower on phones), and satellites visibly cross the sky at their true 0.4–0.9°/s while the stars sit almost still — the exact contrast requested. **▶▶ Fast forward** keeps today's accelerated sweep; satellites shimmer statistically (they cross the sky many times per tick), which is honest. Propagation defaults to τ = 0, so all existing golden fixtures and published figures are untouched. New physics tests: radius conservation under propagation, full-period return, overhead angular rate in the 0.4–0.9°/s window, and the headline integration test — over 10 s of real time, median satellite displacement ≥ 3° while star displacement ≤ 0.05°.

### 4 & 5. Hierarchical clustering — the most consequential change, and worth doing carefully

**Physics evaluation: plausible and illuminating.** Tight clusters serve the architecture the FCC filing emphasizes (high-bandwidth optical intra-links for compute traffic; longer links between clusters and to Starlink relays), though the filing itself is silent on clustering — this enters the data file as a new *assumed* section with that motivation stated. The ground-view consequences are dramatic and the additive renderer already does half the work: a 1-km cluster at 600 km range subtends ~6 arcmin (1–2 pixels at default zoom), so members blend into a single knot *automatically* at the pixel level. The part that needs real modeling is **visibility**: 100 satellites of magnitude 6 (each individually invisible) sum to magnitude 1 — a prominent object. Per-satellite visibility testing would wrongly hide such clusters, so the model gains cluster-aware aggregation: combined magnitude m꜀ = −2.5·log₁₀ Σ10^(−0.4mᵢ) over sunlit above-horizon members, flux-weighted centroid position, and angular extent. The readout distinguishes **visible objects** (what the eye counts — knots plus singles) from **visible satellites** (what they contain); tooltips on a knot report members, extent, and combined magnitude. Streak mode inherits correctly (parallel close trails).

**Generator design:** cluster *centers* are placed by the existing shell/plane/anomaly machinery — so the constellation stays distributed across planes and around Earth exactly as now, and the "number and orbital distribution of clusters" (item 5's last bullet) is inherited from the existing family/shell controls rather than duplicated. Members are strewn around each center with along-track spacing plus small cross-track/radial offsets. Parameters (new `clustering` section of the data file, every value confidence-tagged):

| Parameter | Proposed control | Proposed default |
|---|---|---|
| Clustering on/off | Constellation group, checkbox | **open question** |
| Satellites per cluster (typical) | Constellation group, log slider 10–1,000 | 100 |
| Cluster diameter (typical) | Constellation group, slider 0.2–10 km | 1 km |
| Membership variation (lognormal σ) | Advanced group | 0.35 |
| Diameter/density variation (lognormal σ) | Advanced group | 0.35 |
| Cluster count | derived = total ÷ per-cluster, displayed live | — |

One physical note recorded in the data file: members at slightly different radii shear apart slowly (~1 km per 10 min at 1-km radial spread); real clusters would station-keep, and the model treats clusters as rigid over display timescales.

**Test expansion for clustering:** generator statistics (member counts and diameters match the configured lognormals; members share their center's plane and shell); flux conservation (clustered vs unclustered total flux identical for the same population); combined-magnitude math against hand-computed cases; the invisible-members/visible-knot scenario as an acceptance test; angular-extent geometry (1 km @ 600 km ≈ 5.7′); band-geometry scenarios A1–A10 re-run in clustered mode (large-scale distribution must be statistically unchanged); new golden fixtures for two clustered states alongside the retained unclustered ones; smoke coverage for the new controls and the objects-vs-satellites readout.

## Implementation phases

**U1 — Brightness refactor** (model + data + UI + i18n; goldens regenerated with change note; equivalence test). **U2 — Advanced group** (UI + mobile collapse + smoke updates). **U3 — Time controls** (dawn −60, twilight lock, orbital propagation, dual play modes; new physics tests). **U4 — Clustering model** (generator, aggregation, visibility, counts API; the largest test batch). **U5 — Clustering UI & rendering** (controls, knot tooltips, objects-vs-satellites readout, both view modes, streak mode check). **U6 — Documentation, validation, packaging** (below). Order: U2 first (Advanced group must exist before U1's relocated pieces and U5's variation sliders land in it), then U1, U3, U4, U5, U6. Estimated effort split: U4+U5 ≈ half the work.

## Documentation updates (integrated, not an afterthought)

`sbdc-data.json`: brightness anchors replace the mitigation entry; new clustering section; propagation and station-keeping notes — every value confidence-tagged as usual. `SPECIFICATION.md`: a "v3 upgrades" section specifying the brightness semantics, playback modes, and clustering model, plus addendum updates. `TUTORIAL.md`: rewritten brightness explanation (anchors instead of mitigation), the real-time-vs-fast-forward experiment, a new "clusters" walkthrough (why knots, objects vs satellites), updated control map. `README.md`: feature list, control groups, updated developer test counts. `FINAL_REPORT.md`: v3 change log. Both languages for every new UI string. `tools/validate.mjs`: re-anchor the Starlink sanity check under the new brightness semantics; add a clustered-vs-unclustered flux-conservation validation line.

## Risks

Golden regeneration (U1) is deliberate schema-driven churn — mitigated by the equivalence test and an explicit change-log entry. Real-time re-evaluation at 1M satellites on phones may not hold 3 Hz — mitigated by adaptive cadence and a hint suggesting lower counts. Cluster-aware visibility is the most intricate logic (double-counting risk between object and satellite tallies) — mitigated by conservation tests written before the implementation, per the project's usual order.

---

## Open questions before implementation

1. **Brightness semantics and default.** Confirm: slider = median magnitude at the 1,000 km / 90°-phase / zenith reference, population scatter retained, default +0.5 so every published figure stays reproducible, with the three labeled anchors (unmitigated / strong mitigation / IAU +7)?
2. **Clustering default state.** On or off when the file opens? *Off* preserves continuity with the report's published figures; *on* leads with the new hypothesis. My recommendation: off by default, with the tutorial pointing straight at the toggle.
3. **Cluster defaults.** 100 satellites per cluster, 1 km typical diameter — acceptable starting values?
4. **Cluster count and distribution.** Agreed that cluster *count* is derived (total ÷ per-cluster, displayed) and cluster *distribution* is inherited from the existing shell/family controls rather than adding a separate control?
5. **Twilight-lock behavior.** Checkbox as described; slider-drag while locked re-anchors at the new offset; polar day/night falls back to absolute time. Any changes?
6. **Fast-forward motion.** With propagation in place, fast-forward will show satellites shimmering through the band (physically honest). Prefer that, or freeze along-track motion in fast-forward (today's calmer look)?
7. **Advanced group contents.** Seed, Tint, Celestial pole, plus the two cluster-variation sliders — anything else you'd like moved there (e.g., the eye/sky-quality limit)?
