# Plan

Drafted October 21, 2026 (Australia/Brisbane), from the reviewed [objectives](objectives.html), [decisions](decisions.html) and [specification](spec.html). This is an implementation sequence and an evidence contract. No runtime has been selected, prototype measured, or browser acceptance passed by writing this plan.

## First increment and lifecycle

Review and critique this plan before building. The first implementation increment compares two export paths using real files, then records the choice and its limits. Keep prototypes, application source, fixtures and evidence inside this initiative until an explicitly requested graduation. Do not change the supplied reference files.

| Phase / todo ID | Deliverable and dependency | Exit evidence |
| --- | --- | --- |
| 0 / `critique-plan` | Critique the plan and test plan after this planning PR merges: metadata independence, timezone fixtures, font coverage, worker cancellation, download ownership and physical-device prerequisites. Correct concrete defects before building. | Dated critique with resolved findings and explicit remaining limitations; seed `compare-wasm-exports` from this table. Stage remains `planned`. |
| 1 / `compare-wasm-exports` | Build two minimal export prototypes under `work/`, using identical frozen input fixtures. Depends on Phase 0. | T1 comparison receipt, real JPEGs and independent metadata output; reproducible dependencies/builds; measured selection or a specific documented blocker. This first executable increment advances to `building` and requires a current brief. |
| 2 / `build-verified-export` | Turn the selected path into a serial worker pipeline with strict settings/time resolution, all three designs, font validation, metadata insertion and independent read-back. Depends on Phase 1. | T2-T4 pass locally, including corruption and worker-failure cases. A missing timestamp or offset never reaches a successful download. |
| 3 / `build-marker-editor` | Add the single-image editor, visible effective time, draft/authoritative previews, stable generation snapshot and deliberate JPEG download. Depends on Phase 2. | T5 and applicable T9: settings and downloaded bytes agree; previous results remain correctly labeled; keyboard/error paths work. |
| 4 / `build-csv-batches` | Add CSV review, inheritance/row edits, frozen batch jobs, progress/cancel/retry, ZIP parts and manifests. Depends on Phase 3. | T6-T8, including ten-row mixed input, bounds, part exhaustion, packaging failure and byte-identical ZIP extraction. |
| 5 / `verify-browser-delivery` | Exercise Chrome/Safari desktop and physical iOS, offline generation, subdirectory hosting, performance and accessibility. Depends on Phase 4. | T9-T11 receipts identify actual devices, failures and tested limits. Missing physical-device findings remain `data:` work; emulation cannot close them. |
| 6 / `prepare-static-graduation` | Finish usage/build instructions, dependency/font notices and a self-contained static output; propose graduation readiness. Depends on Phase 5. | T12 plus the complete acceptance matrix; user chooses release/graduation. The sweep does not publish to production or declare dormancy. |

Add the next table item with `scripts/initiatives.mjs add` before completing the current item. Use `complete` for completion/stage transitions. A partial receipt does not close its parent acceptance item. Record unavailable user-owned device evidence as `data:`, new costs as `cost:`, and release authority as `permission:`; do not invent those answers. Seed a subsequent actionable increment only where this plan supplies it.

## Plan critique — October 21, 2026

The [dated critique](notes/plan-critique-20261021.html) closes Phase 0. It clarifies prototype scope, timestamp freezing, stable row identity and bounded download ownership below. The historical-offset/range check and physical-device evidence remain explicit gates, not passed tests.

## Compare the WASM approaches first

The following is a source-based comparison, not benchmark evidence. Recheck and pin versions/commits, licenses and build inputs when making the prototypes. The existing Python is a reference for geometry and defaults, not a ready browser implementation.

| Candidate | Reuse and likely benefit | Questions the prototype must settle |
| --- | --- | --- |
| A: Pyodide module worker, Pillow, explicit EXIF writer | Reuses much of the supplied shape and font-fitting logic. Pyodide documents module workers and lists Pillow; Pillow accepts JPEG quality and raw EXIF at save time. | Runtime/package/font transfer and initialization cost; browser font loading/glyph coverage; six required timestamp/offset tags; working serial cancellation/restart; physical iOS memory and downloads. Pin the Pillow version actually supplied by the selected Pyodide distribution, not an unrelated current Pillow release. |
| B: browser drawing/font APIs, WASM JPEG codec, explicit EXIF writer | Can keep the UI and drawing code close to browser primitives while actual JPEG encoding satisfies substantive WASM processing. Squoosh documents separately built JS/WASM codec modules. | Reproducible maintained codec build and quality-95 settings; licensed glyph inspection/shaping strategy; worker drawing support or bounded main-thread raster fallback; metadata insertion and independent reader; preview equivalence, transfer and memory. A canvas-only JPEG fallback is not acceptable. |
| C: purpose-built Rust/C++ renderer/encoder | Could own drawing, encoding and memory in one module. | Font/text/shaping and metadata development plus toolchain maintenance are additional work. Consider only if A/B have documented blocking failures or evidence justifies the additional implementation; do not build a third full application speculatively. |

Primary documentation checked October 21, 2026: [Pyodide module-worker guidance](https://pyodide.org/en/stable/usage/webworker.html), [Pyodide package inventory](https://pyodide.org/en/stable/usage/packages-in-pyodide.html), [Pillow JPEG options](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#jpeg) and [Squoosh codec builds](https://github.com/GoogleChromeLabs/squoosh/blob/dev/codecs/README.md). These establish mechanisms only; they do not establish application performance or iOS compatibility.

Keep this comparison to an export harness with frozen fixtures, a minimal start/cancel/retry surface and downloadable evidence. Do not build the editor, CSV interface or full ZIP-part manager twice. The ten-row timing includes a small packaging harness; inject one worker failure/retry and verify the same frozen settings survive. Share test fixtures and external oracles, not metadata writer/read-back code that would make the independence check circular.

Both prototypes must export the default titled donut, a blank solid marker and the same ten-row timed batch at 2000 pixels. Add a star and a non-ASCII glyph sample to expose rendering/font differences before committing to an implementation. Use the same licensed font, resolved timestamps, colors and quality setting. Record codec-specific subsampling/other defaults; quality 95 alone does not guarantee identical pixels or compressed bytes across encoders.

For each candidate retain a short reproduction recipe, exact asset versions/hashes and licenses, raw/served transfer bytes, three cold initialization runs, five warm single exports, three ten-row runs and errors. Capture network requests and offline reruns. Record median/range and device/browser/OS; distinguish JS heap, WASM memory and browser-process observations, and say when total peak memory is unavailable. Do not rank an unmeasured memory estimate as a measured result.

First reject routes that cannot produce valid JPEGs with all six tags, use substantive WASM, run locally without later fetches, recover from worker failure, or be packaged/licensed reproducibly. Compare maintainability and measured transfer/performance among remaining routes. Prefer the smaller maintainable route that meets the contract; record why another route lost. Neither reuse nor an assumed small download selects a winner by itself.

Record the evidence-backed implementation choice in a dated `decisions.md` entry. If physical iOS is unavailable, a desktop selection can be explicitly provisional so independent implementation continues; leave a `data:` acceptance item and do not claim iOS support or close Phase 5. Explain any performance or resource-limit revision with evidence before building against it. No change may remove required metadata, local processing, the three designs or supported browser families without revisiting the reviewed requirements.

## Implementation boundaries

### Phase 1 receipt — October 21, 2026

The [measured comparison](notes/wasm-comparison-20261021.html) establishes B,
browser drawing plus MozJPEG WASM, as the provisional desktop path. Both
prototypes pass the final engine comparison with the receipt's explicit
network-mode limitation; native Pillow independently verifies all 40 archived
JPEGs. Build the selected serial pipeline next, retaining the two-route harness
only as development evidence and shipping a single runtime. Resolve the
WebKit offline-emulation Blob-decoder failure in the pipeline's verification
strategy and test real disconnected Safari/iOS before claiming support.

Physical iOS findings remain unavailable and are a separate `data:` acceptance
item. All later editor, timezone, CSV, budgets and graduation phases remain.

Create directories only when their phase produces real content. The intended structure is `work/` for application source, runtime assets and package locks; `work/test/` for fixtures and tests; and `notes/` for dated comparison and acceptance receipts. Document the actual build/test commands alongside the first executable increment. Use locked dependencies and locally provisioned tools. Do not edit protected repository scripts or shared libraries during the sweep.

Separate these responsibilities so failures can be exercised independently:

- **Settings and time resolution:** pure validation and a frozen representation containing row ID, geometry/colors/font key, local timestamp, IANA zone, resolved instant, numeric offset and occurrence. Capture the run's current instant once. A retry keeps it; a new Generate action captures a new one.
- **Serial worker:** load pinned local runtime/font assets, accept one job at a time, draw and encode, write EXIF, and return bytes/status. Tag messages with generation and row IDs so late replies cannot replace current previews. UI state owns the snapshot across worker restart. Use transferable buffers and no SharedArrayBuffer requirement.
- **Verification:** a browser parser independent of the metadata writer reads the final bytes and checks format/dimensions plus all six timestamp/offset fields against the snapshot. Toolchain verification uses an independent image decoder and ExifTool or an equivalently independent metadata reader. Do not verify only the writer's in-memory object.
- **Editor and batch state:** show resolved values/errors and preserve settings plus verified results across row failures. Render imported strings as text. Never fetch a CSV font value as a URL or filesystem path. Export batch settings separately from binary result manifests, with locally loaded font keys and the need to reload those fonts explained.
- **Delivery:** own verified Blob URLs, unique filenames, ZIP parts and manifests. Release render buffers promptly and result URLs only on explicit discard/replacement when no retained download still needs them. Package original JPEG bytes without re-encoding.

Resolve local dates with a pinned timezone implementation or tested equivalent; do not rely on universal native Temporal availability or `Date` normalization. A font pipeline must check actual glyph coverage and font load success, including local TTF/OTF inputs. Browser text fallback is not evidence that the chosen font contains a character. Choose and test a shaping/coverage mechanism during the comparison, rather than postpone that risk until the UI is complete. Also exercise timezone resolution across the proposed 1900–2099 range before calling it supported: T3 already requires exact offsets, and an offset containing seconds cannot be silently rounded into the specification's EXIF `HH:MM` fields. Record actual library/data behavior and reconcile any affected range/zone cases with the specification before implementation claims that range.

The worker protocol must distinguish initialization, validation, drawing, encoding, metadata, verification and packaging errors. A cancelled or crashed job cannot become verified later. Termination may be necessary for a hung runtime; recreate the worker from the UI-owned snapshot, retaining completed results and retrying only the requested rows. Do not require cross-origin isolation to cancel.

## Bounds and delivery ownership

Carry the specification's provisional limits into preflight: side 256-4096, years 1900-2099, 100 data rows, CSV 1 MiB, ZIP JPEG payload target 25 MiB, and retained compressed-output budget 50 MiB. Measure physical iOS before advertising these as tested capacities. Render one full-size image at a time; draft previews do not retain one full image per row.

A row receives its immutable record ID when imported, before validation or exclusion. Number parsed data records, including blank-cell records; ignore physical empty lines outside quoted records. Multiline quoted fields do not consume extra IDs. Exclusion, edits, cancellation and retries must not renumber retained rows or change their suffixes.

A blank-date/time preview before Generate is provisional. Generate captures now once, resolves the final filenames and publishes that frozen run summary before processing begins; do not promise that an earlier preview name is already final. Retries and repeated downloads use that summary.

Count every retained copy when applying the output budget: individual verified JPEGs, ZIP buffers/Blobs and in-progress packaging. Reserve space before packaging; split or pause early enough to avoid a second ZIP copy exceeding the budget. A single JPEG above the part target gets its own deliberate download. Browser download APIs do not prove that a file was saved: require explicit user acknowledgment or discard before releasing retained output and continuing. Keep the UI honest about what is still obtainable. Reserve ZIP headers, manifest bytes and the packager's measured temporary copies as well as JPEG payload: a 25 MiB payload target is not permission to allocate a second 25 MiB buffer against an already full budget. If the next result cannot fit even with no retained outputs, fail that row with an actionable size error; do not enter a save/resume loop that cannot progress.

Cancel preserves completed results and the import. Retry uses the frozen run, even across midnight. Editing settings creates a new generation; the existing verified result stays labeled with its previous settings until replaced successfully or discarded. Never silently clear valid results because later packaging fails. Keep result status separate from availability: acknowledging a save records the user's report, not browser proof, and releasing bytes makes that result unavailable in the page. Do not advertise another individual download or repackage it after release.

Each ZIP manifest is a dated snapshot with a run ID, part number and the exact JPEG filenames/hashes present in that part. Its included files must already be verified; pending rows must not be described as successful. Later retries or exclusions cannot rewrite a ZIP already obtained. Offer a final lightweight run report listing every original record, outcome, part assignment and current availability, including failed, excluded and cancelled rows. Retain that bookkeeping after releasing binary output.

## Acceptance and graduation

The [test plan](test-plan.html) maps T1-T12 to the seven objective groups. Each milestone leaves the tested source commit, commands, fixtures and observed limitations in a dated receipt. Failed or unrun checks remain visible; no empty receipt is evidence.

At 2000 pixels the initial targets remain: draft preview within 500 ms after initialization, verified warm export within 2 seconds desktop / 5 seconds physical iOS, ten markers plus packaging within 30 seconds desktop / 60 seconds physical iOS. Record cold initialization separately and keep progress/Cancel usable. Missed targets require measured follow-up, not a claim that the browser is inherently too slow.

Before graduation, build from a clean lockfile install, serve the output from its intended nested URL, disconnect after all required static assets load, and complete one marker plus CSV/ZIP retrieval. Check that runtime paths resolve within the output or graduated shared libraries, with no dependency on `initiatives/`, a development server, remote fonts or a CDN at generation time. Include font/dependency notices, CSV/defaults and time-meaning instructions, supported/tested limits and recovery/download instructions.

Prepare production graduation only when the required evidence is complete and a person asks for it. Do not create a demo deployment or change `outputs[]` as part of this planning item. Photo-library import/order validation, extra designs, location-to-zone lookup, persistent projects, offline installation and integrations remain deferred as specified.

## Phase 2 receipt — October 21, 2026

[The verified export core](notes/verified-export-20261021.html) completes the
local pipeline increment: strict frozen settings/time, all three designs,
font/glyph/fit validation, serial WASM encoding, explicit metadata and two
independent final-file verification layers. Forty-five settings tests, two
desktop browser-engine suites and 52 independently decoded JPEGs pass.
Default-size offline export, termination/retry and local fonts pass in both
engines using retained-source module workers and byte decoding.

Build the Phase 3 single-image editor next. Its preview must consume verified
JPEG bytes and keep previous results labeled/obtainable; the pipeline does not
implement those UI or download controls yet. Physical-device, full browser,
resource/batch/CSV and graduation acceptance remain as listed above.

## Phase 3 receipt — October 22, 2026

[The single-image editor](notes/marker-editor-20261022.html) adds the three
designs, colors/fonts, effective time and repeated-hour choices, labeled drafts,
frozen generation, decoded-JPEG previews and deliberate downloads. Both desktop
engine journeys and all 16 native downloaded-file checks pass, including offline
recovery and cancellation/retry. Earlier results remain labeled and obtainable
after edits. The receipt distinguishes semantic select tests from native keyboard
acceptance and leaves the full T9 matrix open. Build Phase 4 CSV/batch and ZIP
delivery next; physical-iOS and graduation prerequisites remain unchanged.

## Phase 4 receipt — October 22, 2026

[The CSV batch receipt](notes/csv-batches-20261022.html) records local T6–T8
coverage: stable import IDs, review/overrides, frozen retries, bounded deliberate
ZIP/JPEG retrieval and immutable manifests/reports. Both desktop engines pass
the ten-marker and 100-record journeys; native Pillow checks 220 retrieved
JPEGs independently. Continue Phase 5 browser/delivery acceptance; synthetic
allocation faults and desktop engines do not close physical-iOS evidence.

## Phase 5 desktop evidence — October 22, 2026

[The desktop delivery receipt](notes/desktop-delivery-20261022.html) records
repeated installed-Chrome/WebKit timing, actual default-size 100-row parts and
space pauses, native Safari single/batch/local-font retrieval, and 306 native-
decoded files. It keeps WebKit offline-emulated file I/O distinct from HTTP
denial and native stopped-origin results. Phase 5 remains open: physical iOS,
real screen reader, the complete native keyboard/zoom matrix and total process
memory remain unrun. Do not advance to Phase 6 from this partial receipt.
