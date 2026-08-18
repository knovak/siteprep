# Bookmark sorter — phase 1 work

This directory holds the first build increment for the bookmark sorter. It is
private initiative work, not a published demo.

## What exists

- `migrations/0001_core.sql` is the D1/SQLite relational model from `spec.md`
  §5. Items are unique by collection and normalised URL; captures remain global
  by URL; tags are free strings.
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
- `src/worker.mjs` exposes the phase 1 surface: `GET /` for the upload/list page,
  `POST /api/import` for a Netscape HTML file, and `GET /api/items` for the item
  count and a bounded page of records. Uploads are capped at 20 MB.
- `src/pile-page.mjs` renders the self-contained responsive upload and list UI.
  Dynamic values enter the page through DOM text nodes, never HTML strings.

## D1 binding

Apply `migrations/0001_core.sql` and bind that database to the Worker as `DB`.
Phase 1 deliberately has no sign-in: `D1BookmarkStore` therefore defaults to
the null owner scope. A later authenticated caller supplies `ownerId`; the same
adapter then requires every collection operation to match it. The Worker creates
the single `pile` collection on first API use and does not expose captures,
verdicts, selections, or template access yet.

The list endpoint accepts `limit` and `offset`; `limit` is clamped to 500. The
response always includes the total collection count so the page does not have
to load all 10,000 records to prove the pile landed.

## Run the tests

```bash
node --test initiatives/bookmark-sorter/work/test/*.test.mjs
```

The 11 tests cover parsing, normalisation, tag creation, idempotent re-import,
overlap merging, D1 owner scoping and batch chunking, the upload/list API, the
20 MB guard, and a generated 10,000-item export. That sizing export lands 10,000
distinct items with the exact expected count and is not committed as a large
fixture. Phase 1 is complete; the blind virtualised grid is the next increment.
