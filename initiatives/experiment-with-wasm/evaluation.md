# Application evaluation

Evaluated 2026-09-07 against siteprep commit `48c0f4b54`.

| Criterion | Bookmark Sorter | Tide Here |
|---|---|---|
| Main computation | SQLite records, deduplication, selections, tags, judgments, history | Geocoding, coast matching, time zones, tide forecasts, astronomy |
| Current backend | Worker/Vinext, D1 database, R2 captures, identity | Hosted wrapper plus provider and geocoder adapters; prepared station/model datasets |
| Offline inputs | User-owned HTML / portable JSON exports are complete inputs for triage | Place names need a geocoder; NOAA/CHS forecasts need providers; stored national tables have bounded dates; FES2022 needs licensed model inputs |
| Direct WASM fit | Existing D1 SQL can execute in browser SQLite/WASM with a small binding adapter | Astronomy and harmonic calculations fit WASM, but do not replace missing worldwide tide and place data |
| UI reuse | Existing card grid and controls can call a local dispatcher | Existing five-day UI can be reused, but offline geographic/date coverage would narrow |
| Necessary changes | Device-local ownership and storage; manually attached pictures replace remote capture | Bundle and maintain sufficiently complete geographic, tide and time-zone datasets or retain network services |
| Choice | **Best first conversion** | Keep as a potential later experiment |

## Evidence in the source

Bookmark Sorter: `work/src/worker.mjs` routes import, selections, verdicts, tags, export, and sitting actions to `d1-store.mjs`; `selection-sql.mjs` already compiles expressions to parameterized SQL. `pile-page.mjs` is a reusable HTML/CSS/JavaScript interface. The current capture pipeline depends on remote websites and R2.

Tide Here: `work/phase-5/src/resolve-forecast.mjs` composes a geocoder, station catalogue, coast matcher, time-zone lookup, tide provider, and astronomy adapter. `work/phase-5/src/geocoder.mjs` and `work/phase-3/src/tide-provider.mjs` require external services for live place names and official forecasts. Its FES2022 work adds model data preparation and validation obligations. Porting a calculator alone would not preserve the complete application.

## Runtime choice

Use the WASM build of [sql.js](https://github.com/sql-js/sql.js), pinned in the lockfile. It is SQLite compiled with Emscripten, with a byte-array database import/export API. The SQL engine runs in WASM; JavaScript remains responsible for DOM rendering, file parsing, expression normalization, and browser storage plumbing. This is a conversion of the actual database workload, not a token arithmetic WASM demonstration.

[SQLite browser persistence documentation](https://www.sqlite.org/wasm/doc/trunk/persistence.md) describes the browser-specific persistence constraints. An IndexedDB snapshot store is selected here to support a single-file distribution without cross-origin-isolation headers or a server. Save conflicts and failures must be visible.

## Functional boundary

This is a local, single-person fork. There is no cloud sign-in, user allowlist, cross-device sync, or background screenshot service. Manual image attachment supplies local card pictures. Portable bookmark JSON retains the original fields; full database backups additionally retain pictures, collections, selections, undo records and sitting history. The original applications and their deployments are unchanged.
