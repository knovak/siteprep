# Bookmark sorter — phases 1–3 work

This directory holds the first three build increments for the bookmark sorter. It is
private initiative work, not a published demo.

## What exists

- `migrations/0001_core.sql` is the D1/SQLite relational model from `spec.md`
  §5. Items are unique by collection and normalised URL; captures remain global
  by URL; tags are free strings.
- `migrations/0002_triage.sql` adds per-sitting progress and an append-only
  triage-action record. A marked-set verdict is one action, so one undo restores
  the whole set. A partial index keeps the untriaged count bounded to the active
  backlog.
- `migrations/0003_captures.sql` adds searchable metadata to the global capture
  row, indexes image hashes, and creates the explicitly driven, resumable pass-2
  queue. The pending-queue index follows the only query that drives work.
- `src/bookmark-html.mjs` parses Netscape bookmark HTML without executing it. It
  retains title, saved URL, `ADD_DATE`, nested folder path, and the following
  `<DD>` note.
- `src/url-key.mjs` implements the deliberately narrow URL identity rule from
  `spec.md` §4.
- `src/ingest.mjs` applies import tags and the merge rules against a small store
  interface, then hands the unique imported URLs to capture pass 1 without
  making the item list or triage grid wait on a later view.
- `src/capture-pipeline.mjs` performs an anonymous, no-JavaScript metadata fetch
  with the `og:image` → `twitter:image` → none ladder. It records title,
  description and favicon, stores only a fixed-size derivative, hashes that
  derivative, queues missing and duplicate images, and exposes pass 2 only as
  an explicit bounded function. The screenshot-vendor switch defaults off.
- `src/capture-images.mjs` keeps derivative bytes behind a small R2 adapter. Its
  object key is content-addressed below a hash of the URL; neither the original
  bytes nor the URL itself appear in the key.
- `src/d1-store.mjs` is the production D1 adapter. Every public operation first
  checks the collection in the current owner scope; imports read the existing
  collection once and write in bounded D1 batches rather than making tens of
  thousands of request-sized round trips.
- `src/memory-store.mjs` is the deterministic test adapter, indexed by
  `(collection_id, url_key)` so the generated 10,000-item sizing run exercises
  the same identity rule without quadratic test behavior.
- `src/worker.mjs` exposes the upload, capture and triage API. Uploads are capped
  at 20 MB; reads are bounded; capture bytes are served only from R2; verdict
  and undo writes return the authoritative backlog and sitting totals.
- `src/pile-page.mjs` renders the self-contained grid. It has 8×2 wide,
  4×3 or 3×3 tablet, and single-card phone layouts; only the visible cells plus
  a small buffer exist in the DOM. Dynamic values enter through DOM text nodes,
  never HTML strings. Stored derivatives appear without any request to the saved
  page. A verdict patches the affected cards in place rather than navigating or
  rebuilding the grid.

## D1 binding

Apply `migrations/0001_core.sql`, `migrations/0002_triage.sql`, then
`migrations/0003_captures.sql`. Bind that database to the Worker as `DB` and the
capture bucket as `CAPTURES`. These increments deliberately have no sign-in:
`D1BookmarkStore` therefore defaults to
the null owner scope. A later authenticated caller supplies `ownerId`; the same
adapter then requires every collection operation to match it. The Worker creates
the single `pile` collection on first API use and does not expose captures,
saved selections, or template access yet.

The deployment assembler supplies the server-side `transformImage` function.
It must return a derivative no larger than 600×360; if it is absent or returns
an invalid result, the pipeline stores no image rather than putting an original
in R2. The Sites capability layer therefore fails closed while keeping the
image implementation replaceable. `PASS_TWO_ENABLED` defaults off. Turning it
on still requires a server-side `vendorCapture` adapter; neither a secret nor a
vendor endpoint is emitted into the page.

The list endpoint accepts `limit` and `offset`; `limit` is clamped to 500. The
response always includes the total collection count so the page does not have
to load all 10,000 records to prove the pile landed.

## Triage API and interaction

- `GET /api/items` returns one virtual window plus `total` and `backlog`.
- `POST /api/session` starts or ends a sitting. A sitting records its start,
  end, elapsed milliseconds, and number of records whose verdict changed.
- `POST /api/verdict` applies `keeper`, `junk`, `archive`, or
  `needs-more-time` to the focused record or current marked set. Sending the
  existing verdict is a no-op and does not inflate the sitting rate.
- `POST /api/undo` reverses the last still-active action in that sitting as one
  operation.
- `GET /api/capture-image?url_key=…` serves the already-stored derivative. A
  grid view never fetches the saved page or starts a capture.
- `POST /api/captures/gaps` is the only pass-2 driver. With the current switch
  off it reports the gap count and performs no vendor call. When a vendor is
  later authorised, the same endpoint processes a bounded batch through the
  injected server-only adapter.

`GET /api/items` carries capture totals, distinguishable metadata coverage, and
the duplicate-image distribution. Those values exist to record the real-pile
phase measurement in `decisions.md`; they are not a product dashboard.

Arrow keys move focus, Space toggles the current mark, `k`/`j`/`a`/`n` apply a
verdict, `u` undoes, and Enter advances. The phase 2 marked set is deliberately
bounded to the current rendered window and clears after a verdict or when the
window changes; phase 4 introduces collection-wide saved selections and sweeps.
No capture request is made by the grid.

## Run the tests

```bash
node --test initiatives/bookmark-sorter/work/test/*.test.mjs
```

The 21 Node tests cover parsing, normalisation, tag creation, idempotent
re-import, overlap merging, D1 owner scoping and batch chunking, the upload API,
the 20 MB guard, verdicts, group undo, sitting totals, and a generated
10,000-item export. Capture tests use a local HTTP fixture server rather than
mocking pass 1: they cover metadata precedence, anonymous requests, the
no-JavaScript rule, derivative-only storage, 404/timeout/TLS/parked failures,
collection-local error tags, duplicate queuing, the vendor-off switch, stored
image delivery, and absence of vendor configuration from the page. The sizing
export is generated rather than committed as a large fixture.

Run the focused browser checks with the installed workspace Playwright binary:

```bash
./node_modules/.bin/playwright test \
  --config initiatives/bookmark-sorter/work/test/grid.playwright.config.mjs
```

Those three checks prove the DOM remains bounded at all four layout variants,
that keyboard verdicts, marked groups, undo, backlog, and rate work without a
navigation or full grid replacement, and that stored captures render while the
pass-2 queue remains inert until its button is pressed.

Two real-pile measurements remain data work: the blind rate from a several-
hundred-bookmark sitting, and metadata coverage plus the image-hash duplicate
distribution after a representative import. Automated fixtures verify both
instruments but cannot manufacture either baseline. The duplicate threshold
therefore remains the documented starting value of 30 until the latter result
is recorded in `decisions.md`.
