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
- `migrations/0006_private_collections.sql` extends the collection kind check for
  additional empty private collections while preserving the one automatic
  personal pile per owner.
- `migrations/0007_authorized_users_history.sql` creates the `authorized_user`
  list and per-owner recent selection history. The two supplied example users
  are seeded. A signed-in email must have type `admin` for the Admin menu and
  its user-management, capture, and end-sitting operations to be available.
- `src/bookmark-html.mjs` parses Netscape bookmark HTML without executing it. It
  retains title, saved URL, `ADD_DATE`, nested folder path, and the following
  `<DD>` note.
- `src/url-key.mjs` implements the deliberately narrow URL identity rule from
  `spec.md` §4 and unwraps Google `/url` references before storing a bookmark.
- `src/selections.mjs` is the one selection evaluator used by UI-scoped and
  administrative calls. It parses `and`, `or`, `not`, parentheses, bare tags,
  and trailing wildcards; adds synthetic collection/site/title/folder/image and
  exact-tag keys; and computes grouped source, tag, folder, site, image, and
  near-title proposals on demand.
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
  `oai-authenticated-user-id` supplied by ChatGPT Sites. That id remains the
  sole collection-ownership key. The normalized email is consulted only for
  the separate `authorized_user` admin role; the optional encoded full name is
  display-only.
- `src/memory-store.mjs` is the deterministic test adapter, indexed by
  `(collection_id, url_key)` so the generated 10,000-item sizing run exercises
  the same identity rule without quadratic test behavior.
- `src/worker.mjs` exposes the upload, capture and triage API. Uploads are capped
  at 20 MB; reads are bounded; capture bytes are served only from R2; verdict
  and undo writes return the authoritative backlog and sitting totals. The same
  surface now evaluates, saves, tags and sweeps selections. Every API route
  requires Sites identity, resolves the active collection server-side, and
  rejects another owner's collection even when its id is supplied directly.
  Collection operations list templates, create an empty private collection,
  take or refresh a private copy, rename or erase a collection, delete a copy,
  and allow template creation only for users whose D1 capability is set. The
  same API records each signed-in user's distinct selection expressions by
  most-recent use. Admin-only routes expose the authorized-user list editor;
  hiding the menu is backed by the same server-side role check.
- `src/pile-page.mjs` renders the self-contained grid. Its Page layout selector
  offers 3×3, 2×6, 2×8 (the default), and 3×12 wide layouts and redraws the
  window as soon as the choice changes. It keeps automatic 4×3 or 3×3 tablet
  and single-card phone layouts. Three-row grids cap captures at 30% of the
  card height and reserve two title lines so tags and verdicts retain readable
  space. Only the visible cells plus
  a small buffer exist in the DOM. Dynamic values enter through DOM text nodes,
  never HTML strings. Bookmark titles show up to five lines and link to the
  saved URL in a new tab; each card also has a keyboard-accessible URL-copy
  control. Truncated tag chips expose the item's complete tag list through a
  hover-persistent popover with selectable text and a larger readable font.
  Help documents the controls and selection grammar in the
  page. The collection bar creates and renames through an inline form rather
  than a browser prompt, so it works in the Sites browser environment. Stored derivatives
  appear without any request to the saved page. A
  verdict patches the affected cards in place rather than navigating or
  rebuilding the grid. The visible-page sweep changes only untriaged cards and
  advances to the next page; Previous and Next page without writing. A
  collection bar switches among the owner's personal pile and demo copies.
  Import, Select, and Export share one equal-width collapsed row; opening one
  gives it the available width and closes the other two. Import contains both
  file loading and demo-template copying. Select contains expression, proposal,
  saved-selection, tagging, and per-user recent-query controls.
  Export downloads the whole collection or open selection and can erase the
  current collection after confirmation while preserving the collection and
  shared captures. End sitting and both capture actions live under the Admin
  menu alongside add, remove, and display functions for `authorized_user`, and
  that menu is rendered only for an admin email. Its fixed panel is positioned
  below the Admin summary so the summary remains available to collapse it.
  The verdict selector and split Sweep control remain visible beside the
  triage actions: its default sweeps untriaged cards on the visible page, while
  `Sweep all selected` confirms and applies to the entire open selection.
  Previous/Next remain beside them. The portable JSON carries URLs, notes,
  tags, and verdicts, but no captures.

## D1 binding

Apply `migrations/0001_core.sql`, `migrations/0002_triage.sql`,
`migrations/0003_captures.sql`, `migrations/0004_selections.sql`, then
`migrations/0005_identity_collections.sql`, `migrations/0006_private_collections.sql`,
and `migrations/0007_authorized_users_history.sql`.
Bind that database to the Worker as
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
in R2. Sites currently exposes only the declared D1 and R2 bindings, so the
worker transforms an external image through Cloudflare's `cf.image` fetch
options and uses the raw-byte Images binding only when the runtime supplies it.
Failures are logged without the bookmark or image URL and remain fail-closed.
`PASS_TWO_ENABLED` defaults off. Turning it on still requires a server-side
`vendorCapture` adapter; neither a secret nor a vendor endpoint is emitted into
the page.

The list endpoint accepts `limit` and `offset`; `limit` is clamped to 500. The
response always includes the total collection count so the page does not have
to load all 10,000 records to prove the pile landed.

## ChatGPT Sites test deployment

The deployment surface is this `work/` directory, not the initiative directory.
It uses the full Sites build and hosting workflow rather than the
static-folder-only `deploy-to-chatgpt-sites` skill.

- `.openai/hosting.json` declares D1 as `DB` and R2 as `CAPTURES`. The first
  test deployment intentionally left R2 `null`; the user approved the storage
  limits on 2026-08-20, so later versions keep the capture binding declared.
- `db/schema.ts` is the deployable final form of migrations 0001–0006. The
  generated `drizzle/` migration is packaged with a Site version and creates the
  same tables, constraints, and query indexes on a fresh D1 database.
- `worker/index.ts` passes `/` and `/api/*` to the existing application and
  leaves the framework-owned image and sign-in routes to Sites.
- A private Site supplies the stable `oai-authenticated-user-id` header. The app
  uses that opaque value for ownership and creates one private personal
  collection on first API use.
- With R2 absent, importing and triage work normally but pass-1 metadata capture
  and capture-gap processing are disabled. That was the first deployment. The
  user accepted the Sites storage limits and authorised the bucket on 2026-08-20
  (`decisions.md`), so later deployments bind it as `CAPTURES`. The worker
  switches pass 1 on when that binding is present; pass 2 and its paid vendor
  stay switched off regardless.

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
- `POST /api/collections` performs empty `create`, `copy-template`, `fresh-copy`,
  `rename`, confirmed `erase`, `delete-copy`, or capability-gated `create-template`. The current collection
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
  both collection and selection counts. In addition to ordinary and synthetic
  tags, `verdict:keep`, `verdict:junk`, `verdict:archive`,
  `verdict:needs-time`, and `verdict:untriaged` select by the current verdict;
  `image:none`, `image:failed`, and `image:present` select by stored picture state.
- `GET|POST /api/selections` lists and saves named expressions. Saving parses
  the expression first; malformed input is an error, never an empty set.
- `GET|POST /api/selection-history` lists the signed-in user's distinct query
  strings by most-recent use and records a successfully opened expression.
  History is user-scoped rather than collection-scoped and persists in D1.
- `GET|POST /api/authorized-users` displays, adds, updates, or removes rows in
  `authorized_user`. Both routes require the current signed-in email to have
  type `admin`; the same check gates Admin rendering, capture operations, and
  ending a sitting.
- `GET /api/proposals` recomputes source, exact-tag, folder, site, image,
  verdict, and near-title groups as ordinary pre-filled selections. The five
  verdict expressions are always present, including zero-count values. The
  interface groups source, tag, folder, site, image, and verdict in that order,
  with title last for the retained near-title feature, and alphabetizes each
  group. Folder and tag groups therefore change on the request after tags
  change; no proposal cache can go stale. The page explicitly reloads proposals
  after a collection change and after an import, and ignores an older response
  if the user has already switched collections again. Card-window requests use
  the same collection guard, so a slower response cannot replace the newly
  selected collection's grid.
- `POST /api/tag` unions tags onto the marked set or current selection and logs
  only the tags it added, so one undo removes those additions and preserves
  everything that existed before the action.
- `POST /api/selection/verdict` implements mark-then-sweep. A current visible
  selection never confirms, including a tested 3,000-item sweep. An
  entire-selection request returns `409` with its count until the caller
  confirms; the split Sweep control uses that path for the current open
  expression.
- `GET /api/capture-image?url_key=…` serves the already-stored derivative. A
  grid view never fetches the saved page or starts a capture.
- `GET /api/export` streams the active collection or its `expression` subset as
  an importable `bookmark-sorter/v1` JSON text file. The page exposes both
  scopes in its Export section; the neighboring Import section recognizes that
  JSON as well as browser bookmark HTML.
- `POST /api/captures/pass-one?limit=20` processes one bounded batch of items
  that do not yet have a capture record. It exists for the one-time migration
  of collections imported before R2 was enabled; ordinary HTML imports still
  start pass 1 automatically. Repeating the request is safe and returns zero
  processed items when the active collection has caught up. The **Capture
  metadata** action runs those bounded batches until the active collection is
  current, while keeping each individual request small. It then makes one final
  retry for metadata-image candidates left by the earlier binding failure; a
  final failure is marked so the action cannot loop forever. The final status
  reports coverage and duplicate-image group sizes for the real collection.
  The action stays available afterward; rerunning it is an idempotent status
  refresh that processes zero items unless a later import needs catching up.
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
verdict, `u` undoes, and Enter advances. Marks survive virtual-window changes
inside the open selection. The user can judge a marked set together or sweep
only the still-untriaged cards on the visible page before advancing. Saved
expressions, proposal expressions and typed expressions all enter the same
evaluator. The capture-gap button remains disabled while the test deployment
has no image storage, and no capture request is made by the grid.

## Run the tests

```bash
node --test initiatives/bookmark-sorter/work/test/*.test.mjs
```

The Node tests cover parsing, Google redirect simplification, normalisation,
tag creation, idempotent
re-import, overlap merging, D1 owner scoping and batch chunking, the upload API,
the 20 MB guard, verdicts, group undo, sitting totals, and a generated
10,000-item export. Phase 4 adds table-driven grammar and scope tests, image
attributes, D1 and memory-store saved-selection/tag-undo checks, grouped
on-demand proposal checks, both
confirmation paths, and a visible 3,000-item sweep followed by one undo.
Phase 5 adds a hand-written portable export, selection-scoped export, same- and
cross-collection round trips, existing note/verdict protection, shared capture
reuse, URL-matched proposals, read-only discard, and per-tag acceptance through
the ordinary tag action. Phase 6 adds the real SQLite migrations plus two
authenticated sessions: personal collections are mutually unreachable, only
templates cross owner boundaries, template writes require the D1 capability,
empty named collections and copies are private, fresh copies are additive, and deletion preserves
the shared capture. Header parsing and missing-identity rejection have separate
tests so neither can quietly fall back to an email or anonymous owner.
Capture tests use a local HTTP fixture server rather than
mocking pass 1: they cover metadata precedence, anonymous requests, the
no-JavaScript rule, derivative-only storage, 404/timeout/TLS/parked failures,
collection-local error tags, duplicate queuing, the vendor-off switch, stored
image delivery, and absence of vendor configuration from the page. The sizing
export is generated rather than committed as a large fixture.

The Sites assembly passes the capture pipeline's `maxWidth` and `maxHeight` to
the platform image transformer. This boundary is named explicitly because the
pipeline fails closed when the assembler supplies no valid derivative, and a
field-name mismatch would otherwise look like ordinary metadata gaps.

Run the focused browser checks with the installed workspace Playwright binary:

```bash
./node_modules/.bin/playwright test \
  --config initiatives/bookmark-sorter/work/test/grid.playwright.config.mjs
```

Those three checks prove the DOM remains bounded at all four layout variants,
that keyboard verdicts, marked groups, undo, backlog, and rate work without a
navigation or full grid replacement, and that stored captures render while the
pass-2 queue remains inert until its button is pressed.

The blind rate and selection-sitting observations are optional and accrue from
ordinary use. Metadata coverage and the image-hash duplicate distribution are
read after pass 1 catches up on the real collection. Automated fixtures verify
all instruments and paths but cannot manufacture those baselines. The duplicate
threshold therefore remains the documented
starting value of 30 until the capture result is recorded in `decisions.md`.
