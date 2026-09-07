# Log

## 2026-09-07 — Adopt the existing World Migration Atlas

Created the initiative around the existing working demo, following the user's migration-only request. Preserved the supplied wish and linked its prompt history. Adopted the original specification and implementation plan without changes and retained the complete supplied README with current context. Added objectives, decisions, provenance, and a test plan grounded in those records.

Copied all nine repository demo files unchanged into `work/` and registered the existing demo as the output and the destination for a later release. The adoption manifest records the source commit, hashes, and attachment provenance. The existing production demo, application behavior, research data, and deployment scripts are unchanged.

The initiative rests pending user testing and an explicit production-release decision. Historical build phases and prompts are not treated as fresh instructions to change code.

### Adoption verification

The nine source files and two adopted attachments passed byte-for-byte comparisons; the supplied README was confirmed intact within the new README. `npm ci` installed the repository dependencies successfully with no reported vulnerabilities.

A Chromium browser check of `work/index.html` via `file://` passed: 48 migration records; initial type coloring; legend and color toggles; identical canvas output after scrubbing away from and back to 1880; 48 table rows and an opening detail panel; Irish-migration search; playback; wheel zoom and drag pan. A 390×844 touch-emulated page rendered without horizontal overflow and its legend opened. No uncaught page errors were observed. This is migration verification, not a rerun of the historical T1–T8 suites.
