# Restore organizer preview — September 14, 2026

Fictional local evidence for the next `build-recovery` increment. After checking
an edited export, the organizer explicitly maps historical names to history-only
or current eligible accounts and reviews the proposed new-gathering inventory.
The importer always stays in the proposed account set. No restored gathering,
assignment, member link, session, payment or sending action is created.

## Verified

- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` and the Sites app
  build pass. All 160 domain/database/HTTP/time tests pass, including 11 new
  real-Miniflare-D1 restore-preview tests.
- The new tests verify current-context account scope, no name/ID matching,
  history-only actors, many-to-one choices without merging attribution, retained
  importer access, incomplete/duplicate/foreign/malformed choices, prototype-like
  identifiers, revalidation of edited files, bounded errors, and final importer/
  target removal or rename. HTTP tests cover origin, CSRF, expected organizer,
  no-store responses and the combined 8 MiB request bound.
- Every application table remains byte-equivalent before and after successful
  and rejected previews, with expired recoverable code material present. This
  confirms that preview does not invoke opportunistic purge or persist staging.
- Six new Chromium/Firefox/WebKit journeys pass at 1280×1000 and 390×844, covering
  explicit selections, inert uploaded text, keyboard operation, late changed
  choices, cleared/replaced files, organizer switches, importer retention, phone
  containment and 200% text size. See `recovery-preview-browser-20260914.json`.
- Six existing edited-file checking journeys and six export/download journeys
  also pass. Their new receipts are
  `recovery-preview-recovery-check-regression-20260914.json` and
  `recovery-preview-recovery-export-regression-20260914.json`; earlier receipts
  are preserved.

The pinned dependency installation still reports the previously documented
development-toolchain audit findings; this increment changes no dependency.
No physical phone, screen reader or independent organizer sitting is claimed.

## Remaining T11 evidence

This is a SELECT-only preview, not an importer or signed confirmation ticket.
The next increment must bind the exact reviewed file and mappings to explicit
confirmation, revalidate current authority in the write transaction, create a
new private gathering with fresh IDs and correctly mapped relationships, keep
historical actors/outcomes distinct, and prove all-or-none rollback. Deletion,
staging cleanup if durable staging is introduced, and provider-retention evidence
remain. No production release, real data or actual send is authorized here.
