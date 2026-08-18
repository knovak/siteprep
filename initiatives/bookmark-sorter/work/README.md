# Bookmark sorter — phases 1–2 work

This directory holds the first two build increments for the bookmark sorter. It is
private initiative work, not a published demo.

## What exists

- `migrations/0001_core.sql` is the D1/SQLite relational model from `spec.md`
  §5. Items are unique by collection and normalised URL; captures remain global
  by URL; tags are free strings.
- `migrations/0002_triage.sql` adds per-sitting progress and an append-only
  triage-action record. A marked-set verdict is one action, so one undo restores
  the whole set. A partial index keeps the untriaged count bounded to the active
  backlog.
- `src/bookmark-html.mjs` parses Netscape bookmark HTML without executing it. It
  retains title, saved URL, `ADD_DATE`, nested folder path, and the following
  `<DD>` note.
- `src/url-key.mjs` implements the deliberately narrow URL identity rule from
  `spec.md` §4.
- `src/ingest.mjs` applies import tags and the merge rules against a small store
  interface.
- `src/d1-store.mjs` is the production D1 adapter. Every public operation first
  checks the collection in the current owner scope; imports read the existing
  collection once and write in bounded D1 batches rather than making tens of
  thousands of request-sized round trips.
- `src/memory-store.mjs` is the deterministic test adapter, indexed by
  `(collection_id, url_key)` so the generated 10,000-item sizing run exercises
  the same identity rule without quadratic test behavior.
- `src/worker.mjs` exposes the upload and blind-triage API. Uploads are capped at
  20 MB; reads are bounded; verdict and undo writes return the authoritative
  backlog and sitting totals.
- `src/pile-page.mjs` renders the self-contained blind grid. It has 8×2 wide,
  4×3 or 3×3 tablet, and single-card phone layouts; only the visible cells plus
  a small buffer exist in the DOM. Dynamic values enter through DOM text nodes,
  never HTML strings. A verdict patches the affected cards in place rather than
  navigating or rebuilding the grid.

## D1 binding

Apply `migrations/0001_core.sql` followed by `migrations/0002_triage.sql`, and
bind that database to the Worker as `DB`. These increments deliberately have no
sign-in: `D1BookmarkStore` therefore defaults to
the null owner scope. A later authenticated caller supplies `ownerId`; the same
adapter then requires every collection operation to match it. The Worker creates
the single `pile` collection on first API use and does not expose captures,
saved selections, or template access yet.

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

Arrow keys move focus, Space toggles the current mark, `k`/`j`/`a`/`n` apply a
verdict, `u` undoes, and Enter advances. The phase 2 marked set is deliberately
bounded to the current rendered window and clears after a verdict or when the
window changes; phase 4 introduces collection-wide saved selections and sweeps.
No capture request is made by the grid.

## Run the tests

```bash
node --test initiatives/bookmark-sorter/work/test/*.test.mjs
```

The 14 Node tests cover parsing, normalisation, tag creation, idempotent
re-import, overlap merging, D1 owner scoping and batch chunking, the upload API,
the 20 MB guard, verdicts, group undo, sitting totals, and a generated
10,000-item export. That sizing export is generated rather than committed as a
large fixture.

Run the focused browser checks with the installed workspace Playwright binary:

```bash
./node_modules/.bin/playwright test \
  --config initiatives/bookmark-sorter/work/test/grid.playwright.config.mjs
```

Those checks prove the DOM remains bounded at all four layout variants and that
keyboard verdicts, marked groups, undo, backlog, and rate work without a
navigation or full grid replacement. The blind rate from a real several-hundred
bookmark sitting remains a separate data measurement; automated fixtures can
verify the instrument but cannot manufacture that baseline.
