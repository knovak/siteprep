# experiment with wasm

Standalone forks of **Bookmark Sorter** and **Tide Here**, both powered by real WebAssembly with no backend or runtime network requests.

The released static demo is [experiment with wasm](../../demos/experiment-with-wasm/index.html). Its first page explains WASM and links to both apps. The [wish and findings](../../demos/experiment-with-wasm/findings.html) preserve the original goal, comparison, storage findings, validation evidence and Safari/iPad limitations.

- [Open Bookmark Sorter](work/dist/index.html): a browser database and the existing bookmark card interface.
- [Open Tide Here](work/tide-here/dist/index.html): a single 39.5 MB HTML file carrying 65,203 global coastal harmonic points and 170,946 searchable places. Five days of tides, sun and moon are calculated locally for the chosen coast and date. See [Tide Here details and rebuild instructions](work/tide-here/README.md).

The tide model is embedded in the HTML file and cannot be erased by clearing browser storage. Its optional local forecast history can be cleared or lost; history backup/restore is included. Predictions use the global model everywhere, with explicit differences from the hosted app's live national providers. The following sections describe Bookmark Sorter.

## Open the application

Open [`work/dist/index.html`](work/dist/index.html) in Chrome, Edge, Firefox, or Safari. No installation, account, internet connection, local web server, or backend is needed. Chromium, Safari 26.6.2 and Firefox 153.0.4 have been tested directly on desktop. An iPad Pro 11 WebKit/touch emulation passes the hosted workflows, but a physical iPad remains an explicit acceptance check.

It starts with an empty **My bookmarks** collection. Open **Import** to load a browser bookmark HTML export or a `bookmark-sorter/v1` JSON export. **Local tools → Try sample bookmarks** creates a separate sample collection, leaving existing collections alone.

Keep, Junk, Archive, Needs-time, Undo, page navigation, marking, keyboard shortcuts, tag/untag, verdict filters, boolean selection expressions, proposals, saved/previous selections, and sitting reports work locally. Collection and selection JSON exports can be imported into the original Sorter. Pictures can be attached to cards from PNG, JPEG and WebP files up to 5 MB.

## Keeping and moving your data

Changes are saved in this browser's IndexedDB after each successful action. Use **Local tools → Download full backup** to save all collections, local pictures, selections, and sitting/undo history as a `.sqlite` file. **Restore full backup** replaces all local collections only after confirming and validating the file.

The original **Export** control downloads compatible bookmark JSON for the current collection or selection. That format retains bookmark fields, tags and verdicts; it does not contain pictures, saved selections or sitting history.

Browser storage is not a backup. Clearing browser data, private browsing, browser changes or moving the HTML file can affect availability. Export a backup before those changes. Another open window cannot overwrite newer saved changes: it reports a conflict and asks you to reload. An unavailable/full storage system reports a failed save and rolls back that action.

## Conversion boundaries

The initial evaluation selected Bookmark Sorter because its core inputs are complete local files; see [evaluation.md](evaluation.md). At the user's subsequent request, Tide Here was also converted by bundling its complete available global coastal dataset and replacing network geocoding with a local catalogue.

This edition uses device-local ownership. Cloud sign-in, user allowlists, cross-device sync and automatic remote website screenshots are absent. Attach pictures locally instead. No personal export, account list, deployment configuration or capture database is bundled. Opening bookmark links is the only routine action that leaves the app; those websites need a connection.

SQLite performs storage, indexed filtering/counting/paging, deduplication, tag/verdict mutations and history queries inside WASM. JavaScript retains the UI, file parsing, expression normalization/compilation, proposal grouping and IndexedDB persistence. This does not claim that the DOM or every line of application code was compiled to WASM.

The database is held in memory and saved as a complete snapshot. This experiment has a 100 MB database limit; very large picture collections are a poor fit. The 5,600-item generated workload and current verification results are recorded in [verification.md](verification.md).

## Rebuild and test

From the repository root:

```sh
npm ci
cd initiatives/experiment-with-wasm/work
npm ci
npm run build
npm test
npm run test:browser
```

The browser test uses the repository's pinned Playwright installation. Provision Chromium with the root `npm run setup:browsers` only if needed. The committed `work/dist/index.html` embeds the pinned WASM module and needs no build to run. `work/dist/build.json` records its byte counts and hashes. The license is embedded in the HTML and also provided as `SQLJS-LICENSE.txt`.

The Playwright configurations default to Chromium. Set `WASM_BROWSER=firefox` or `WASM_BROWSER=webkit` to select another installed Playwright engine, and optionally set `WASM_DEVICE='iPad Pro 11'` for that device profile. Browser-engine runs do not replace direct-file checks in the installed browser.

[Fork provenance](fork-provenance.json) identifies the exact original commit and source hashes. [Specification](spec.md), [test plan](test-plan.md), and the root [technical documentation](../../EXPERIMENT_WITH_WASM_TECHDOC.md) describe the implementation. Source and build capabilities remain in the initiative; the published runtime is a complete, recorded copy under `demos/`.

## Rebuild the static demo

After rebuilding an application, record its committed HTML hash and source commit in `work/demo-src/applications.json`. Run `npm run build:demo` in `work/` to render the original wish and [findings](findings.md), verify both snapshots and stage the complete website in `work/site/`. Run `npm run test:demo` to compare the release copy with that package and exercise both apps through a static web address. Before a first release, set `WASM_DEMO_ROOT` to the absolute `work/site` directory to test the staged package.

Publish updates through `release-initiative`; the root build generates the Demo TOC. The original direct-file app paths remain available so this website publication does not relocate anyone's local bookmark database. Transfer data from a downloaded file to the website by backup and restore.

[Optional improvements](improvements.md) records a reviewable menu; none is authorized merely by appearing there.
