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
- `src/memory-store.mjs` is the deterministic test adapter. The production D1
  adapter belongs to the next increment.

## Run the tests

```bash
node --test initiatives/bookmark-sorter/work/test/*.test.mjs
```

The tests cover parsing, normalisation, tag creation, idempotent re-import, and
overlap merging. The Phase 1 file-upload/list surface, D1 adapter, and the
10,000-item sizing run remain the next increment.
