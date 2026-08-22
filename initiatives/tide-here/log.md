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
