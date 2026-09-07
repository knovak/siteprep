# Decisions

## 2026-09-07 — Runtime and first application

The user requested an application that "runs alone without a backend server and with a wasm module running in the browser performing the same functions," and explicitly delegated evaluating Bookmark Sorter and Tide Here to choose the best fit.

**Implementation choice under that delegation: Bookmark Sorter with SQLite/WASM.** The comparison in evaluation.md finds that complete local bookmark exports provide the data needed for triage, whereas Tide Here retains live-data and geographic coverage dependencies. The existing D1 SQL and card UI can be forked with relatively little domain-behavior change.

### Alternatives considered

- Tide Here: attractive numerical WASM workload, but preserving its complete geographic and date coverage requires substantial input datasets and provider replacement.
- Reimplement Bookmark Sorter in Rust: possible, but would replace mature import, selection and UI behavior without a clear benefit for the first experiment.
- JavaScript-only local store: simpler, but does not meet the WASM requirement.

### What this settles, and what it does not

- The fork runs locally with SQLite compiled to WASM, with no cloud account or backend. JavaScript still handles the DOM, parsers and browser-storage interfaces.
- The actual deliverable is one HTML file, with local persistence and portable backups. This is work in the initiative, not a production release.
- Account administration and remote screenshot services are not equivalent in a standalone browser. The fork replaces those with device-local ownership and local picture attachment; the limitation is visible in Help and README.md.
- Human acceptance and any later graduation or deployment remain open. No existing Site or live bookmark collection is modified.

## 2026-09-07 — Convert Tide Here as well

The user asked, **"can you do the same for tide-here?"** This expands the experiment to both applications. The original Bookmark Sorter file stays at its existing path; Tide Here is added under `work/tide-here/`.

Implementation choices within that requested conversion: reuse the actual 65,203-point derived FES2022b dataset retained locally for the existing Tide Here, and embed a GeoNames offline gazetteer. Execute the pinned original harmonic engine in QuickJS compiled to WebAssembly. This preserves the algorithm and its Schureman corrections without pretending a rewritten approximation is equivalent. It is an interpreter inside WASM, not a native numerical port or a promised performance improvement.

The offline edition uses FES2022 model predictions everywhere. It cannot offer the online application's live NOAA/CHS forecasts or official-provider preference. Its independent place catalogue, 40 km model coverage limit, model datum and approximate nature are visible in the interface. Calculations do not have a fixed end-of-year cutoff, but this does not establish indefinite accuracy or future browser/time-zone compatibility.

The existing reviewed FES package is transformed harmonic data, not redistribution of the original native atlas. Source checksums, prior transformations, attribution and licence links are retained. No original hosted application, production dataset or live bookmark database is changed. Graduation, production deployment and broader browser acceptance remain open.
