# Bookmark sorter — phases 1–6 work and test deployment

This directory holds the first six build increments for the bookmark sorter and
the full-stack ChatGPT Sites wrapper used to test them. It remains private
initiative work, not a published demo or a graduated initiative output.

The app does not have or need a source `index.html`. `src/worker.mjs` is the
application root: it returns the complete browser page for `/` and handles the
stateful `/api/*` routes. `worker/index.ts` is the thin Sites entry point that
wires that application to the hosted runtime. A static-folder deployment would
serve only a shell and cannot provide the D1-backed import, collection, triage,
selection, and export operations.

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
- `migrations/0004_selections.sql` adds the stored title key used by cheap title
  proposals and extends the action log so an additive tag sweep is undoable as
  one action without removing tags that were already present.
- `migrations/0005_identity_collections.sql` enforces one personal collection per
  owner and indexes the owner/kind and template-copy queries used by the
  collection menu. The existing foreign-key path remains item → collection →
  user; items never join directly to users.
- `src/bookmark-html.mjs` parses Netscape bookmark HTML without executing it. It
  retains title, saved URL, `ADD_DATE`, nested folder path, and the following
  `<DD>` note.
- `src/url-key.mjs` implements the deliberately narrow URL identity rule from
  `spec.md` §4.
- `src/selections.mjs` is the one selection evaluator used by UI-scoped and
  administrative calls. It parses `and`, `or`, `not`, parentheses, bare tags,
  and trailing wildcards; adds synthetic collection/site/title/folder keys; and
  computes the three cheap proposal kinds on demand.
- `src/round-trip.mjs` owns the `bookmark-sorter/v1` boundary. It exports any
  ordinary selection without captures, imports portable records through the
  same URL-keyed merge as browser HTML, and reads proposed-tag documents into
  one reviewable item set per tag. Loading or discarding a proposals file is
  read-only; acceptance calls the existing additive, one-action-undo tag path.
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
  checks read or write access in the current owner scope; the sole cross-owner
  read is a `demo-template`. It creates one personal collection per signed-in
  user, copies template items/tags/selections in one D1 batch, and leaves the
  global capture rows untouched when a copy is deleted. Imports read the
  existing collection once and write in bounded D1 batches rather than making
  tens of thousands of request-sized round trips. Queries that use an `IN`
  list reserve parameter slots for fixed values such as `collection_id`, so no
  statement exceeds D1's 100-bound-parameter limit.
- `src/site-identity.mjs` reads the stable
  `oai-authenticated-user-id` supplied by ChatGPT Sites. Email and the optional
  encoded full name are display-only; neither participates in ownership.
- `src/memory-store.mjs` is the deterministic test adapter, indexed by
  `(collection_id, url_key)` so the generated 10,000-item sizing run exercises
  the same identity rule without quadratic test behavior.
- `src/worker.mjs` exposes the upload, capture and triage API. Uploads are capped
  at 20 MB; reads are bounded; capture bytes are served only from R2; verdict
  and undo writes return the authoritative backlog and sitting totals. The same
  surface now evaluates, saves, tags and sweeps selections. Every API route
  requires Sites identity, resolves the active collection server-side, and
  rejects another owner's collection even when its id is supplied directly.
  Collection operations list templates, take or refresh a private copy, rename
  a collection, delete a copy, and allow template creation only for users whose
  D1 capability is set.
- `src/pile-page.mjs` renders the self-contained grid. It has 8×2 wide,
  4×3 or 3×3 tablet, and single-card phone layouts; only the visible cells plus
  a small buffer exist in the DOM. Dynamic values enter through DOM text nodes,
  never HTML strings. Stored derivatives appear without any request to the saved
  page. A verdict patches the affected cards in place rather than navigating or
  rebuilding the grid. A collection bar switches among the owner's personal
  pile and demo copies, and exposes template-copy operations without putting
  identity or authorization state in the page.

## D1 binding

Apply `migrations/0001_core.sql`, `migrations/0002_triage.sql`,
`migrations/0003_captures.sql`, `migrations/0004_selections.sql`, then
`migrations/0005_identity_collections.sql`. Bind that database to the Worker as
`DB` and the capture bucket as `CAPTURES`. ChatGPT Sites supplies
`oai-authenticated-user-id`; the Worker rejects an API request without it and
constructs `D1BookmarkStore` with that stable id as `ownerId`. The first request
creates the app-user row and one private personal collection. Grant template
editing by setting `app_users.can_edit_templates = 1` through an administrative
D1 change; it is never accepted from a browser request or identity header.

Template rows are readable across owners and writable only by their owner when
that owner has the capability. A copied template is a new `demo-copy` owned by
the current user, with `template_id` and `copied_at` recorded. Items, tags,
verdicts, and saved selections copy once; later template edits do not sync into
the copy. Taking a fresh copy creates another collection with a distinct name.
Deleting a copy cascades through its collection-owned rows but cannot delete a
URL-keyed capture.

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

## ChatGPT Sites test deployment

The deployment surface is this `work/` directory, not the initiative directory.
It uses the full Sites build and hosting workflow rather than the
static-folder-only `deploy-to-chatgpt-sites` skill.

- `.openai/hosting.json` declares D1 as `DB`. R2 is intentionally `null` in the
  first test deployment, so the still-open storage-cost decision is not silently
  accepted.
- `db/schema.ts` is the deployable final form of migrations 0001–0005. The
  generated `drizzle/` migration is packaged with a Site version and creates the
  same tables, constraints, and query indexes on a fresh D1 database.
- `worker/index.ts` passes `/` and `/api/*` to the existing application and
  leaves the framework-owned image and sign-in routes to Sites.
- A private Site supplies the stable `oai-authenticated-user-id` header. The app
  uses that opaque value for ownership and creates one private personal
  collection on first API use.
- With R2 absent, importing and triage work normally but pass-1 metadata capture
  and capture-gap processing are disabled. This is suitable for the blind
  baseline and selection-interaction tests. Enabling capture testing later
  requires setting `r2` to `CAPTURES` after the user accepts the Sites storage
  limits, rebuilding, and replacing the Site version.

Install and validate this project from this directory:

```bash
npm ci
npm test
npm run build
```

The root repository build remains a separate validation step for generated
initiative pages. See `END_USER_TESTING.md` for the private test procedure and
the data-handling boundary.

## Triage API and interaction

- `GET /api/items` returns one virtual window plus `total` and `backlog`.
- `GET /api/collections` returns the current user's collections, all readable
  demo templates, and the server-derived template-edit capability.
- `POST /api/collections` performs `copy-template`, `fresh-copy`, `rename`,
  `delete-copy`, or capability-gated `create-template`. The current collection
  travels in `x-bookmark-collection-id`; every data method checks it again in
  D1 rather than trusting the header.
- `POST /api/session` starts or ends a sitting. A sitting records its start,
  end, elapsed milliseconds, and number of records whose verdict changed.
- `POST /api/verdict` applies `keeper`, `junk`, `archive`, or
  `needs-more-time` to the focused record or current marked set. Sending the
  existing verdict is a no-op and does not inflate the sitting rate.
- `POST /api/undo` reverses the last still-active action in that sitting as one
  operation.
- `GET /api/selection` evaluates the expression through the ordinary UI scope,
  implicitly `collection:pile and ( … )`, and returns one virtual window plus
  both collection and selection counts.
- `GET|POST /api/selections` lists and saves named expressions. Saving parses
  the expression first; malformed input is an error, never an empty set.
- `GET /api/proposals` recomputes same-site, same-folder and near-title groups
  as ordinary pre-filled selections. Folder groups therefore change on the
  request after a folder tag changes; no proposal cache can go stale.
- `POST /api/tag` unions tags onto the marked set or current selection and logs
  only the tags it added, so one undo removes those additions and preserves
  everything that existed before the action.
- `POST /api/selection/verdict` implements mark-then-sweep. A current visible
  selection never confirms, including a tested 3,000-item sweep. An unopened
  saved selection returns `409` with its count until the caller confirms.
- `GET /api/capture-image?url_key=…` serves the already-stored derivative. A
  grid view never fetches the saved page or starts a capture.
- `POST /api/captures/gaps` is the only pass-2 driver. With the current switch
  off it reports the gap count and performs no vendor call. When a vendor is
  later authorised, the same endpoint processes a bounded batch through the
  injected server-only adapter. Both its queue and the capture statistics are
  scoped to URLs in the active collection, so one user cannot inspect or trigger
  work for another user's private pile even though completed captures are
  globally reusable.

`GET /api/items` carries capture totals, distinguishable metadata coverage, and
the duplicate-image distribution. Those values exist to record the real-pile
phase measurement in `decisions.md`; they are not a product dashboard.

Arrow keys move focus, Space toggles the current mark, `k`/`j`/`a`/`n` apply a
verdict, `u` undoes, and Enter advances. Marks now survive virtual-window
changes inside the open selection. The user can mark a few exceptions, sweep
the unmarked remainder with one gesture, and undo the whole sweep once. Saved
expressions, proposal expressions and typed expressions all enter the same
evaluator. No capture request is made by the grid.

## Run the tests

```bash
node --test initiatives/bookmark-sorter/work/test/*.test.mjs
```

The Node tests cover parsing, normalisation, tag creation, idempotent
re-import, overlap merging, D1 owner scoping and batch chunking, the upload API,
the 20 MB guard, verdicts, group undo, sitting totals, and a generated
10,000-item export. Phase 4 adds table-driven grammar and scope tests, D1 and
memory-store saved-selection/tag-undo checks, on-demand proposal checks, both
confirmation paths, and a visible 3,000-item sweep followed by one undo.
Phase 5 adds a hand-written portable export, selection-scoped export, same- and
cross-collection round trips, existing note/verdict protection, shared capture
reuse, URL-matched proposals, read-only discard, and per-tag acceptance through
the ordinary tag action. Phase 6 adds the real SQLite migrations plus two
authenticated sessions: personal collections are mutually unreachable, only
templates cross owner boundaries, template writes require the D1 capability,
copies are private snapshots, fresh copies are additive, and deletion preserves
the shared capture. Header parsing and missing-identity rejection have separate
tests so neither can quietly fall back to an email or anonymous owner.
Capture tests use a local HTTP fixture server rather than
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

Three real-pile measurements remain data work: the blind rate from a several-
hundred-bookmark sitting; metadata coverage plus the image-hash duplicate
distribution after a representative import; and one selection sitting that
counts confirmation interruptions and sweeps immediately followed by undo.
Automated fixtures verify all instruments and paths but cannot manufacture
those baselines. The duplicate threshold therefore remains the documented
starting value of 30 until the capture result is recorded in `decisions.md`.
