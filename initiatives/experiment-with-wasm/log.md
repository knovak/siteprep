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
