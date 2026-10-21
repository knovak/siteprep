# Single-image editor — October 22, 2026

Phase 3 adds the single-image editor to the verified export pipeline. It remains
under `work/pipeline/`; there is no deployment entry or graduation. Source/build
hashes are in `work/pipeline/evidence/editor/tested-source.json` and
`work/pipeline/build-inputs.json`. The [editor techdoc](../EDITOR_TECHDOC.html)
describes ownership and reproduction commands.

## What changed

- Donut, Star and Solid controls preserve unused colors. Paired color pickers,
  named/hex values, optional title, advanced size/outline and local fonts feed
  the strict resolver. Timezone suggestions, effective time and both repeated-
  hour offsets/instants are visible. Editing date/time/zone clears that choice.
- The shared renderer supplies a labeled draft. Generate freezes settings and
  now, publishes the filename/time, verifies the actual JPEG and offers a
  deliberate download. The authoritative preview samples the decoded final
  JPEG. Previous results remain labeled and obtainable after edits/failure.
- Cancel and Retry preserve the frozen job; delayed completion cannot relabel
  old bytes as current settings. Missing assets expose Retry; errors provide a
  correction control. Explicit discard revokes the download URL.

## Evidence

Locked root and pipeline installs succeeded. All 45 settings tests and both
core browser suites pass. Native Pillow independently rechecks all 52 core
JPEGs after the preview extension. The editor suite records 12 scenario groups
per engine in `work/pipeline/evidence/editor/browser.json`: deliberate download;
old-result preservation, hidden colors and error correction; repeated/skipped
times; midnight capture and repeated downloads; cancellation/frozen retry/late
completion; invalid/valid local fonts; offline work without HTTP attempts;
overflow/axe checks at each of 1280, 430 and 320 pixels; discard; and missing-
asset recovery. No page exceptions or detected axe violations remain.

The 16 files actually obtained through download events are retained with their
expected local time, offset, filename and hashes. Native Pillow decodes them,
checks all six timestamp/offset fields and dimensions, and compares preview
samples against its decoder (up to two channel levels for rounding differences).
`independent-files.json` records the oracle version/results. Local-font tests
use the bundled font as a local file fixture. No remote runtime/font request
is needed after preparation.

The initial WebKit offline run exposed a broken Blob-image preview despite a
successful export/download. A canvas now receives bounded preview pixels from
the JPEG decoder, and both offline runs pass. Headless macOS select-key events
also failed to commit a value in the initial harness; the corrected test uses
semantic select actions. Tab focus, typing and Generate use keyboard input.

## Limits and next work

These are Playwright Chromium and WebKit desktop results, not branded-browser
or physical-iOS acceptance. Real screen readers, the complete native keyboard
journey, 200%/400% and text-only zoom, iOS Files retrieval, device memory and the
final performance matrix remain Phase 5 work. Local T5 scenarios and applicable
automated T9 checks do not close the complete accessibility matrix. The default
2000-pixel editor is tested; the core has separate 256/4096 checks.

Phase 4 is CSV review/inheritance, frozen batches, cancellation/retry, ZIP
parts, manifests and retained-output accounting. Physical iOS remains the
existing `data:` item. Release/graduation remains the user's decision.
