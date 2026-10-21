# Single-image editor

The Phase 3 editor is `work/pipeline/index.html`, `editor.mjs` and `editor.css`.
It uses the existing locked pipeline package; `npm run build` there bundles
the UI, workers and local assets into ignored `dist/`. Serve that directory
over localhost, including under a nested path. Nothing has graduated or been
published to a test/production Site.

## Time and settings

Controls map to the pipeline's strict settings resolver. Color text accepts
hex and the inherited friendly names; paired pickers keep valid text in sync.
Switching shapes hides unused fields without erasing them. A timezone datalist
lists browser-supported IANA identifiers, with UTC and the detected zone
always available. Detection failure explicitly selects UTC. Invalid values
remain errors rather than silently normalized settings.

The effective-time display resolves a provisional current instant. Generate
creates one immutable run and publishes its exact filename/time before work
starts. Repeated wall times expose both offsets and instants; editing date,
time or timezone clears the occurrence choice. Retry reuses the same job,
including the originally captured instant. A separate Generate creates a new
run. Filename stems normalize punctuation, path separators, control characters
and reserved device names; the timestamp and `0001` record suffix stay visible.

## Preview and download ownership

Editing increments a revision counter and queues a debounced 320-pixel draft
through the shared serial worker. Obsolete draft replies are ignored. Drafts
are labeled, never downloadable, and never claim final font-fit or metadata
acceptance. Full verification returns a preview sampled from the actual JPEG
decoder pixels. Its canvas remains available offline without loading a Blob
URL. Sampling uses the center of each output pixel; the native file oracle
compares selected pixels against independently decoded JPEGs.

Only verified bytes become a download Blob. The preview, filename, timestamp
and hash all describe the frozen job. Edits during generation leave the result
labeled Previous settings; they cannot replace the current draft. A successful
generation replaces the previous result, while failures and cancellation keep
it obtainable. Download is a deliberate link action and is never taken as
proof that a file was saved. Discard revokes the URL and removes availability.
Page exit cleans up resources except when the browser retains the page in its
back/forward cache. Reload intentionally loses tab-only settings/results/fonts.

The single-result admission check counts retained compressed output plus the
new bytes and Blob allocation against 50 MiB. It is not a bound on decoded
pixels, WASM memory or browser memory. The bounded preview adds at most
420 × 420 RGBA pixels; CSV/ZIP parts and their accounting belong to Phase 4.

## Failures and verification

Runtime preparation disables Generate until local assets and the bundled font
load. Preparation failure offers Retry. Local TTF/OTF loading is bounded before
reading the file and retains earlier immutable font keys. Errors are announced
and focus goes to a correction button for the affected setting, or to the
summary for runtime errors. The correction button opens hidden advanced fields
when needed. Fields remain editable and previous results stay available.
Cancel terminates the worker; retry restores it from retained
assets and the frozen job. Status and controls stay available while encoding.

Run the root `npm ci`, then in `work/pipeline`: `npm ci`, `npm run build`,
`npm test`, `npm run test:browser`, `npm run test:editor`. Native Pillow checks
are `python3 test/verify-files.py` and `python3 test/verify-editor.py`.
The editor suite serves a nested path and exercises two desktop engines,
actual download events, midnight freezing, repeated/skipped times, late
results, cancellation/retry, fonts, offline work, missing assets, responsive
layout and axe checks. Native-select values use Playwright's semantic API;
Tab focus, typing and Generate activation use keyboard input. This is not a
complete native keyboard or screen-reader acceptance claim.

The dated receipt identifies exact source hashes, tools and remaining browser,
device, zoom, performance and batch coverage. Physical iOS evidence remains a
separate blocked item.
