# Knowledge Pipeline Phase 1 Site

This is the login-gated collection shell from `plan.md` Phase 1. It is a
Vinext/Cloudflare Workers application intended for a public-access ChatGPT Site:
the sign-in surface is public, while collection, administration, backup, API,
and blob access require both ChatGPT authentication and a server-side
application allowlist.

## Run and verify

```bash
npm ci
npm test
npm run db:generate
npm run build
```

Local development uses `npm run dev`. The public route remains useful without a
database because anonymous entry returns the sign-in surface before reading D1
or R2. For an authorized local session, copy `.env.example` to an ignored local
environment file and set the administrator email supplied by the local Sites
sign-in fixture.

## Trust boundaries

- `app/chatgpt-auth.ts` is the generated dispatch-owned Sign in with ChatGPT
  adapter. Browser pages use top-level navigation to the dispatcher-owned
  sign-in route. API routes return 401 without complete platform identity.
- `lib/site-repository.ts` performs the second boundary. A normalized deployment
  seed creates exactly one administrator allowlist row. The first matching
  request links one Site-stable user id; another id cannot claim it. A linked id
  remains authoritative if the contact email later changes.
- Every user query includes the internal actor and owned collection. Admin-only
  cross-collection previews name every collection they would affect. Client
  collection ids, hidden controls, raw object keys, and lookalike test headers
  provide no authority.
- `.openai/hosting.json` declares logical `DB` and private `FILES` bindings only.
  Runtime administrator email and trusted Site origin live in Sites environment
  variables, not source or hosting metadata.

## Storage and operations

`db/schema.ts` defines the D1 tables and indexes for allowlisted identities,
actors, private collections, selected-collection revisions, activities,
receipts, backups, asset references, and import previews. Generated Drizzle SQL
lives under `drizzle/` and is packaged with the Site.

Collection create and selection use D1 batches. Switching increments a
selection revision and invalidates pending import previews. Names are trimmed
NFC strings, 1–80 characters, and unique per owner after case folding; names
are never ids.

`lib/domain.mjs` supplies portable rules shared by the Worker and Node tests.
Current-collection backup creates a deterministic `knowledge-pipeline/v1`
manifest, stores it in a bounded ZIP under a private R2 key, then writes the D1
backup/activity/receipt batch. A failed D1 commit removes the staged object.
Download and restore first prove collection ownership and checksum; restore of
the empty shell is idempotent by operation id.

Erase is a named two-phase request. Its preview pins actor, collection,
selection revision, collection revision, counts, schedules, backups, and asset
references. Confirmation can create a final private backup, tombstones the
collection, invalidates pending work, removes collection references, and then
finishes bounded request-driven deletion. Shared blobs remain until their final
authorized reference disappears.

## Adapter evidence

`lib/local-adapters.mjs` is the local SQLite/filesystem recovery adapter.
`test/adapter-contract.test.mjs` runs identity linking, collection isolation,
case-folded uniqueness, injected transaction rollback, private blob reads, and
reference-aware erasure against it. The same domain rules drive D1/R2 routes;
deployment smoke tests prove anonymous 401, signed-in allowlist behavior, and
the hosted migration/binding boundary before Phase 1 is recorded complete.

The Site does not yet ingest source material or automate a pipeline stage.
Those belong to Phase 2.
