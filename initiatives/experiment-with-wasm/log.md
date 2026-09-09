# Log

## 2026-09-07 — Draft objectives.md — define standalone conversion acceptance

Completed objectives, application evaluation, specification and plan under the user request to implement.

## 2026-09-07 — Complete and verify the standalone WASM conversion

Implemented a self-contained Bookmark Sorter fork with SQLite WASM, local IndexedDB snapshots, compatible import/export, picture attachment and full backups. Six WASM integration tests and five offline Chromium browser tests passed.

## 2026-09-07 — Convert Tide Here into a standalone WASM application

Added standalone Tide Here with the complete 65,203-point coastal model, 170,946 offline places, original harmonic calculations inside WASM, history backup/restore, and five integration plus five offline browser tests.

## 2026-09-07 — Release

Released to production — Demo, `a99f847`. <https://knovak.github.io/siteprep/demos/experiment-with-wasm/> See releases.md.

## 2026-09-07 — Publish the wish, findings and both applications as a static demo

Prepared the static demo in demos/experiment-with-wasm for PR #467: landing page, complete wish and findings, both unchanged self-contained applications, downloads, licences and provenance. Production publication follows PR merge; Safari, Firefox and iPad verification remains actionable.

## 2026-09-07 — Write a user-facing README covering how to use it and how to deploy it

The initiative README documents opening both apps, sample use, database backup and transfer, conversion limits, rebuilding and release-initiative deployment. The demo landing and findings pages provide the same user-facing entry points.

## 2026-09-07 — Release

Released to production — Demo, `471ff3e`. 1 commit(s) since the previous release. <https://knovak.github.io/siteprep/demos/experiment-with-wasm/> See releases.md.

## 2026-09-07 — Release

Released to production — Demo, `a7545f1`. 1 commit(s) since the previous release. <https://knovak.github.io/siteprep/demos/experiment-with-wasm/> See releases.md.

## 2026-09-07 — Fix legacy bookmark imports in the WASM app

Reproduced the reported whole-file failure with a mixed HTML export containing non-web bookmarks. HTML and portable JSON imports now retain valid absolute URLs; only HTTP(S) card titles become links. Reload and full backup validation accept the same records. Added a visible import explanation and regression coverage for all records surviving deduplication, JSON export/import, reload and backup/restore, non-web titles remaining inert, and malformed URLs still rolling back. All seven WASM integration tests and six offline Chromium tests passed. Regenerated the standalone app and prepared the staged preview; production remains at its recorded release. CI verifies the staged website so source fixes do not require a production copy.

## 2026-09-07 — Release

Released to production — Demo, `35499ea`. 2 commit(s) since the previous release. <https://knovak.github.io/siteprep/demos/experiment-with-wasm/> See releases.md.

## 2026-09-07 — Verify desktop Safari, Firefox and iPad-shaped WebKit

Opened both downloaded applications in installed Safari 26.6.2 and Firefox 153.0.4. Safari retained a Bookmark Sorter edit across reload, restored a full SQLite backup into a fresh file copy, and retained Tide Here history; pinned Firefox automation passed all direct-file and static-demo cases. All static-demo workflows also passed an iPad Pro 11 WebKit/touch emulation. A physical iPad is not attached, so that acceptance evidence remains an explicit `data:` blocker.

## 2026-09-08 — Propose optional improvements as a pull request, from better documentation to suggested features

Added a prioritized, reviewable menu covering physical-iPad acceptance, a recovery guide, installable offline use, storage health and evidence-led performance options; none is authorized by the proposal.

## 2026-09-08 — Optional online data in both experiments

Added explicit online controls while retaining both offline workflows: Bookmark Sorter URL imports, website metadata, remote picture downloads and named Microlink metadata/screenshots; Tide Here Photon search and NOAA/CHS station/prediction adapters with bounded caches, source/datum labels and cancellation. User bookmark fields and attached pictures are preserved. Live browser probes verified NOAA, Photon and a saved Microlink screenshot. CHS API responses were available outside the browser, but browser CORS blocked live retrieval; the limitation is documented. Rebuilt artifacts and staged preview are prepared in the internet-access PR; this is not a production release.


## 2026-09-08 — Correct the normal Tide Here lookup

Responded to the user's San Diego screenshot by routing Show tides, location, Today, history and deep links through Photon and official station predictions. Clear matches resolve automatically using the hosted 25 km / 0.6 station rule; ambiguity opens a chooser, and failures show a local fallback reason. Added a local-only choice and compact source controls. A live form submission loaded 20 NOAA San Diego events without separate online actions; 9 Node and 13 Chromium tests pass, with 8 online journeys also passing Firefox and WebKit. Integrated main's newer Wasm title/collection labels while retaining this PR's functionality. Production remains outside this change.

## 2026-09-08 — Website-parity correction in PR #477

Removed the date row and made coast-local today the only UI date. Matched the hosted geocoder’s ranked-result/settlement preference while keeping alternate matches available. Embedded the original licensed 2026 Bureau annual dataset (76 ports, 103,597 extrema), retaining source provenance, conditions, datums and IANA zones; official-table forecasts work offline and use a visible model fallback when their full five-day window is outside coverage. Real Chromium submissions now send plain San Diego to NOAA Broadway and Maroochydore to Mooloolaba, matching the supplied website results. Added hosted-provider parity tests and online/offline/expiry browser coverage; see verification.md for evidence.
