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

## 2026-09-07 — Publish the experiment as a static demo

The user requested extending PR #467 with "the wish, and the findings you've discovered and the web pages you've created with the sample applications" and said, "I'd like this to deploy as a static website under demos/ . it's first page should have a brief explanation of wasm and then links to these first two applications."

This authorizes preparing `demos/experiment-with-wasm/` in that PR, not a merge. It contains the landing page, complete original wish and findings, both applications and downloads, licences, provenance, verification and prompt history. Production goes live after merge and Pages publication.

The original wish stays intact. Build sources remain in the initiative; the runtime is copied in full with source commits and hashes. Existing local-file paths remain available. The iPad and Home Screen offline-installation findings are documented as unverified/future work, not silently treated as implemented features.

## 2026-09-08 — Internet access in both applications

The user requested: **“enable as much internet access as possible for both applications. make a PR”** after the investigation found that both applications used `connect-src 'none'` and had replaced their online features during conversion.

This authorizes online data retrieval in the two experimental forks. A standalone application does not have to be disconnected: SQLite and harmonic calculations remain local, while explicit online controls use HTTP(S) services. No new application backend, paid account, API secret, original hosted-app change, merge or production release is included.

Bookmark Sorter gains direct website metadata, picture-URL downloads, URL imports, and named Microlink metadata/screenshot modes. Microlink receives URLs only when the user chooses that source and requests previews. Original bookmark fields and attached pictures are preserved. Tide Here gains Photon address searches and NOAA/CHS station and prediction adapters, with provider/datum labels, bounded caches and visible failures. Station choice is explicit because a nearby station may be across a bay or island.

The remaining external limits are browser cross-origin permissions, upstream availability and free-service quotas. Canadian requests returned data to the API probe but were blocked in live Chromium; the adapter is implemented and covered by controlled responses, without claiming that this environment verified live Canadian retrieval. Physical-iPad acceptance and a production release remain separate.


## 2026-09-08 — Normal Tide Here actions must use the internet

The user reported: **“I don't think this works. I check the tide here application and it doesn't go the internet to get tides -- it always does FES2022 model instead of looking it up online. And, it doesn't resolve place names like the online one does.”**

This corrects the earlier implementation of internet access as separate optional buttons. Show tides must search place names and addresses online and prefer official predictions. The same flow applies to coordinates, Show here, Today, history and deep links. The bundled catalogue and FES2022 model remain fallbacks, with a visible explanation; Local model only is an explicit choice.

A clearly closer station within 25 km is selected automatically, retaining the hosted application's 0.6 distance-ratio rule. Ambiguous places and stations still require a choice, so an arbitrary station across a bay is not selected silently. Nearby station choices remain bounded at 150 km. Current NOAA/CHS adapters, provider/browser limitations, cached data labels and the separate production release boundary remain in effect.

## 2026-09-08 — Match website place selection and Australian tides

The user asked to remove “First day (blank means today on the coast)” and pointed out that San Diego should resolve without a place chooser, while Maroochydore should use the Bureau source shown by the website. This clarifies the requested internet-enabled behavior in PR #477.

The implementation follows the website’s ranked geocoder selection (settlement preferred over a leading administrative boundary), keeps alternate places accessible, and starts forecasts today in the coast’s time zone. It includes the same existing licensed 2026 Bureau annual dataset as the website, preserving station identity, datum, attribution and conditions; this is prepared annual data, not a new live Bureau API. It adds no new source licence or hosting service. The 25 km / 60% / 150 km coastal safeguards remain. Annual-table renewal, additional countries, Canadian CORS availability and physical-iPad acceptance remain separate follow-ups.
