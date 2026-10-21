# Public startup interruption and retry — October 21, 2026

## Scope and initial finding

Anonymous browser contexts opened the existing public `flings-test` organizer
entry at version 19, access revision 2. Sites metadata confirmed that state.
The probe injects four browser-local failures into the native status GET:
network denial, HTTP 503, malformed JSON and an invalid status-object shape.
Each runs at 1280 × 800 and 390 × 844 in Playwright Chromium and WebKit.
These are controlled client interruption cases, not an actual provider outage.

The initial receipt `hosted-public-retry-20261021.json` has **14/16 passes**.
Both WebKit malformed-JSON cases displayed **The string did not match the
expected pattern.** instead of identifying the unavailable sign-in status.
The test stops at that failure, so those two initial cases do not claim a
successful retry. Other cases hide unverified identity, retain an enabled
Reload workspace button, and recover via keyboard Enter to the actual
signed-out denial/sign-in link without horizontal document overflow.

`components/organizer-page.tsx` now converts status-body parsing failure into
**Sign-in status is unavailable.** explicitly. WebKit can throw a DOMException
whose type is not caught by the old TypeError/SyntaxError check. Existing
identity/data clearing and retry authority checks are retained. This is an
error-message correction, not a new sign-in or authorization path.

## Reproduction and local regression

After repository `npm ci` and its provisioned browsers, from the repository root:

```sh
node initiatives/flings/notes/verify-public-retry-20261021.mjs
```

This probes the current hosted Test site; use `FLINGS_EVIDENCE` to choose a
different receipt filename (relative to this script) and
`FLINGS_SITE_VERSION` to label the independently confirmed version. The labels
are provenance supplied by the operator, not version detection by the page.
Rerunning without an alternate filename overwrites the default initial receipt.

From `work/app`, `npm ci`, `npm run typecheck` and all **177 application tests**
pass. With the local fictional server running, the strengthened
`node --experimental-strip-types test/native-resilience-browser.mts` suite
passes six desktop/phone journeys in Chromium, Firefox and WebKit, including
the exact actionable message for JSON/HTTP/shape failures, stale-state clearing,
retry, account switching and assignment isolation. `FLINGS_EVIDENCE` writes the
new `test/evidence/native-resilience-browser-20261021.json` without replacing
the historical receipt. Local D1 uses fictional data; no hosted rows are read
or written by those local tests. The existing dependency/toolchain advisories
remain outside this focused correction.

## Hosted verification boundaries

The probe blocks every non-GET/HEAD request. The platform's background
Cloudflare challenge POSTs were blocked and recorded with their opaque path
redacted; no `/api/flings/` mutation was attempted. No sign-in link is followed,
no account identity is shared, and no business form or sending action is used.
Recovery reaches the live signed-out status/authorization response rather than
substituting a successful identity. These clean contexts do not prove
authenticated stale-record recovery, independent organizers, real screen-reader
use, Worker restart, managed backup recovery or the wider Phase 6 matrix.

## Saved build and publication hold

The supported Sites source workflow built and pushed source commit
`e40d9af5f99d8b0cf098cf17361bf6303e6cdbba`; the corresponding Siteprep app
commit is `87e3e64d085476306ee36c3240ac53770500804e`. The archive contains 107
files / 2,867,200 bytes and has SHA-256
`ab4ad039c1a1b4a3c3f24b9ed7bbcf42f32ef1b4bfd3ec56604f56aba82359f5`.
Saved Site version **20** has ID
`appgprj_6aa6c7b8bc1081918c15432f472711b9~appgver_42606cd4e4dc81918c7f262f423df2f3`.

**Version 20 is saved, not deployed.** Automatic approval review rejected the
native `deploy_site_version` operation because the tool describes itself as
production deployment. A read-only recheck confirmed this exact project is
the repository's existing Test target, slug `flings-test`, public access
revision 2, with no declared production environment. Review still rejected the
same operation after that evidence. No alternate publishing path was used.
The deployment record remains at the previously deployed version 19, and no
post-deployment pass is claimed. Publishing saved version 20 requires explicit
user approval for that operation, then a fresh hosted receipt.

The parent `verify-hosted-test` item remains actionable. No real message,
restore, deletion or audience change occurred; the wider Phase 6 matrix is open.
