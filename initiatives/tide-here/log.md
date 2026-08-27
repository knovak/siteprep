# Log

## 2026-08-19 — Draft objectives.md - what "done" would mean

Drafted eight outcome-focused objectives for place resolution, coastal relevance, five local days of tides and astronomy, transparent coverage failures, a shareable first version, and the later browser-location path.

## 2026-08-19 — Draft spec.md, including the coverage, coastal relevance, provider, and deployment alternatives

Specified a NOAA-first, U.S.-coverage demo with conservative coast matching, explicit ambiguity and coverage states, SunCalc astronomy in the station time zone, a switchable geocoder, and a single serverless boundary. Compared the tide, geocoder, astronomy, and deployment alternatives.

## 2026-08-19 — Revise the spec after review

Expanded the official-source audit across Canada, Australia, the United Kingdom, New Zealand, Norway, France, Japan, and other OECD coasts. Added Canadian Hydrographic Service coverage to the first version and placed Australia first in the next-provider queue pending a supported machine feed and confirmed terms. Replaced the serverless boundary with a direct static-page architecture for the intended infrequent single user, specified a complete normalized response history stored only in the browser, and detailed the later explicit browser-geolocation path.

## 2026-08-19 — Draft plan.md and test-plan.md from the NOAA-first specification

Drafted plan.md and test-plan.md. Eight phases ordered by what could invalidate an architectural decision (phase 0 proves the three providers still allow browser reads, on which the static-page choice rests), then by what a silent wrong answer flows through (the day model), then by what another phase would be rewritten without (the normalized response, fixed with two providers at once). The test plan is organised around the two confidently-wrong answers the objectives name - a distant station presented as the user's coast, and a device time zone moving an event into the wrong day - with the coastal thresholds challenged by real awkward coastlines rather than invented numbers.

## 2026-08-20 — Critique plan.md and test-plan.md before building starts

Critiqued the plan and test plan before building; cleared Phase 0 to proceed with a stricter evidence-bundle contract and identified unresolved local-history and coastal-topology design gaps for their affected phases.

## 2026-08-20 — Phase 0 - prove NOAA CO-OPS, CHS IWLS and Nominatim reach a real HTTPS page, and record the responses as fixtures

Verified NOAA CO-OPS, CHS IWLS, and Nominatim as readable CORS responses from a real HTTPS Chromium page; recorded dated sanitized evidence, source terms, and exact response fixtures, with a failing non-CORS negative control.

## 2026-08-20 — Revise the critique after review

Recorded the reviewer's choice of Option B for explicit local history, revised O8 to make the 100-entry local-only history and its controls an explicit outcome, and aligned the critique, plan, and test plan with that privacy boundary.

## 2026-08-21 — Phase 1 - the day model: zone resolution, the five coast-local dates, and placing a UTC instant into a row

Implemented the pinned offline zone lookup and pure five-day coast-local model; seven phase-1 tests cover device-zone independence, DST bounds, row placement, and per-instant offsets.

## 2026-08-21 — Phase 2 - build the station catalogue and coastal match

Added normalized NOAA and CHS prediction-station catalogues, a seven-day cache, configuration-owned coastal thresholds, and a three-outcome great-circle matcher with Puget Sound, border, subordinate, inland, and cache-expiry tests.

## 2026-08-21 — Phase 3 - build the NOAA and CHS tide adapters

Built and verified a provider-neutral TideProvider seam with NOAA and CHS request builders, five-local-day UTC ranges, datum and station provenance, normalized high/low events and offsets, and tides-unavailable handling for empty, malformed, HTTP-error, and timeout cases.

## 2026-08-21 — Phase 4 - add sun and moon calculations

Added the pinned SunCalc astronomy adapter with coast-local event windowing, zero/two-event arrays, polar states, local-noon moon phases, and isolated astronomy-unavailable handling.

## 2026-08-21 — Phase 5 - build resolve, forecast and the failure vocabulary

Added a policy-aware, switchable Geocoder plus two-step resolve and forecast composition with eight distinct failure states, chooser reuse, and partial tide or astronomy results.

## 2026-08-21 — Phase 6 - build the page

Built the five-day page with explicit coast identity and time zone, ambiguous-coast chooser and map, eight distinct states, partial results, and desktop and phone browser coverage.

## 2026-08-21 — Refine the page for fluid windows and iPhone Pro Max

Removed the equal-row sizing that made sparse days inherit the busiest day's
height on a one-column phone layout. Added compact two-column event groups at
Pro Max widths, a narrower-phone fallback, safe-area padding, and a 320–1600 px
browser regression matrix with the phone project pinned to an iPhone 15 Pro
Max viewport.

## 2026-08-22 — Phase 7 - add local history, caching, and the privacy statement

Added 100-entry device-local history with view, download, and history-only clear; wired hashed hourly forecast, 24-hour geocoder, and seven-day station caches; and verified the privacy disclosure and no-transmission boundary.

## 2026-08-22 — Phase 8 - deploy, run live smoke tests, and review thresholds

Deployed the owner-only Tide Here validation Site, passed live NOAA, CHS, Nominatim, desktop, and iPhone Pro Max checks, and recorded unchanged thresholds and provider policy review.

## 2026-08-22 — General place lookup and quieter entry

Moved local history and the data-disclosure copy below the forecast display,
removed the requested entry-page slogans, and replaced the production fixture
catalogue with cached complete NOAA/CHS catalogues plus chosen-station metadata.

## 2026-08-22 — Compact coast and astronomy disclosures

Collapsed the detailed entered-place block under the coast name, kept every
day's high and low tides visible, and folded sun and moon details under a label
that includes the day's moonrise time. Tightened the phone layout so the first
two tide days are immediately visible at an iPhone Pro Max viewport.

## 2026-08-23 — Write a user-facing README covering how to use it and how to deploy it

Added a user-facing README covering the public Site, NOAA/CHS coverage, coast-local interpretation, device-local history and privacy, local verification, and the path-preserving static deployment workflow.

## 2026-08-23 — Propose optional improvements as a pull request, from better documentation to suggested features

Proposed five optional refinements with expected value, likely size, safety boundaries, and evidence: browser location, a geographic coast chooser, local pins, inline help, and another official provider adapter.

## 2026-08-26 — Revise documentation and forecast disclosures

Updated the user guide for the current Show selection and opt-in Show here workflow, separated the current test and production Site addresses, and replaced the completed browser-location proposal with still-open options. Moved Prediction source details below the safety notice and added a collapsed Debug record containing the local-history control and the What leaves this device explanation.

## 2026-08-26 — Release

Released to production — ChatGPT Site, version 4, `4ec23b4`. <https://tide-here-five-coast-local-days.ken-novak.chatgpt.site> See releases.md.

## 2026-08-26 — Choose an optional improvement, request another proposal round, or declare the initiative dormant

Chose closest-first ambiguous results with a collapsed Alternative coasts override; implementation is in this pull request.

## 2026-08-26 — Plan global tide coverage and complete its Stage 1 feasibility spike

Added the U.S./Canada, Australian Standard Ports, and FES2022 refinement plan,
with a protected idempotent `/init` and version health check at every
data-bearing stage. Implemented the first R2-shaped storage boundary, immutable
versioned dataset manifests, activate-last initialization, nearest harmonic
point lookup, and five-day high/low calculation. The committed data is plainly
identified as a non-FES TICON-3 Brest fixture. Twelve focused tests pass, and
the first five highs and lows remain within six minutes and five centimetres of
the results published in the official PyFES example. Nothing was deployed.

## 2026-08-26 — Complete global coverage Stage 2 and the Stage 3 implementation path

Added a versioned provider registry and shared stored-provider gateway. NOAA and
CHS remain active direct-browser providers; Australian Standard Ports and the
global fallback are registry descriptors rather than gateway branches, so a
future Korean, Irish, or other national source can be added through the same
contract. Registry initialization verifies every referenced dataset and writes
its active pointer last.

Added the offline Australian annual-source importer, immutable artifact
storage, stored station catalogue, and normalized five-day adapter. Sydney,
Darwin, and Fremantle fixtures exercise three IANA zones and explicit year/date
coverage errors. The fixture is synthetic, cannot be selected in production,
and contains no Bureau or Australian Hydrographic Office prediction values.
Official activation remains blocked on licensed machine-readable annual data,
confirmed reuse terms, and source comparisons. Nothing was deployed.

## 2026-08-27 — Release

Released to production — ChatGPT Site, version 5, `60fdfcc`. 2 commit(s) since the previous release. <https://tide-here-five-coast-local-days.ken-novak.chatgpt.site> See releases.md.
