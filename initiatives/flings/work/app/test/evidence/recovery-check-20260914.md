# Edited gathering backup checks — September 14, 2026

Fictional local data only. This is the second `build-recovery` increment, not
T11/Phase 5 completion, successful restore, deletion or pilot acceptance.

- `npm ci`: exact lockfiles installed in the app and repository.
- `npm run typecheck` and `npm run lint`: pass.
- `npm test`: 149 pass, including 31 new edited-file checks and the complete
  22-collection D1 export checked against the new validator.
- `npm audit --omit=dev`: zero vulnerabilities. The full install still reports
  the existing ten development-toolchain findings (six moderate, four high).
- `node test/recovery-check-browser.mjs`: six journeys pass, Chromium/Firefox/
  WebKit at desktop 1280×1000 and phone 390×844. Covers edited copies, malformed
  JSON, parent errors, keyboard submission, clearing, upload-size limit,
  invalidation of in-flight results, organizer switching and no horizontal
  overflow. The result summary contains no uploaded record values.
- `node test/recovery-export-browser.mjs`: six download/identity regression
  journeys pass. Saved separately as `recovery-check-export-regression-20260914.json`.
- `node test/message-retries-browser.mjs`: six adjacent messaging journeys pass.
  Saved separately as `recovery-check-retries-regression-20260914.json`.

The new D1 tests compare every application table before/after a valid and an
invalid check, with expired code ciphertext present. Neither case changes those
tables. A final authorization read rejects a result if assignment is removed
between the two reads. HTTP checks cover same-origin, CSRF and expected identity,
no-store responses, the 8 MiB streamed upload limit and the unchanged 16 KiB limit
for ordinary forms. Schema/semantic errors include duplicate IDs and relations,
missing parents, cross-gathering fields, unsafe integers, real calendar dates,
zones, roles, polls/votes, currency/payment histories, manifests and attempts.

Private screenshot cookies and selected-file state stay in ignored `.wrangler/qa`;
receipts contain test descriptions only. The checked file is never persisted on
the server. Same-millisecond payment entries have no stored total order and are
checked as a group; atomic restore must validate again and prove its own mapping,
rollback and credentials/handoff exclusions. No restore or deletion endpoint is
present in this increment.
