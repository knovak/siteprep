# The host spike

`plan.md` phase 0 asks for §10's table filled in **with evidence rather than
expectation**, and a dated `decisions.md` entry naming the surface. This document
now contains both the probes and their 2026-08-18 run. §2 remains documentation;
§6 is the evidence that closes the executable part of phase 0.

## 1. How the spike ran

The user confirmed that ChatGPT Sites is available on their plan and in this
workspace, then approved signing the owner-only probe Site into their ChatGPT
account. The throwaway probe was deployed twice: version 1 exposed a bad timeout
target in the probe itself, and version 2 corrected that target before the
results were recorded. One transient Sites publish failure was retried; the same
saved version then deployed successfully.

## 2. What the documentation says

Read as documentation, and to be confirmed rather than believed.

### 2.1 The earlier reading was about the wrong product

The first version of this document researched **the Apps SDK** — apps that run
*inside* a ChatGPT conversation — and concluded that hosting and storage were the
developer's own, and that layout density was the row most likely to fail because
an 8×2 grid of ~300 px cells inside a chat-column iframe is a different question
from one in a browser tab.

That reading stands for the Apps SDK and **does not apply to Sites**, which is a
different product. The layout warning in particular is withdrawn: Sites renders
as a full page, not in a chat column.

### 2.2 ChatGPT Sites

Sites is a hosted full-stack surface: a Cloudflare Workers edge runtime for
server-side code, **D1** (SQLite) for structured data, and **R2** for object
storage, provisioned and deployed by the platform. Identity comes from *Sign in
with ChatGPT*, and the platform forwards the visitor to server-side code through
request headers — documented ones being `oai-authenticated-user-email` and
`oai-authenticated-user-full-name`. Site settings hold **environment variables
and secrets**. It is in public beta, availability depends on plan, region and
workspace, and **usage is metered** — reaching a limit can prevent adding
storage or keeping a high-usage Site public.

Against §10's table, on paper:

| §10 row | What Sites appears to give | Confidence |
|---|---|---|
| Bulk data export | **Undocumented.** D1 is SQLite, so a dump is conceptually easy; whether an ordinary user can take one is not stated | **The row that still decides the project** |
| Signed-in user identity | Sign in with ChatGPT, forwarded server-side in headers | High, with a caveat — see below |
| A database with per-user rows | D1. Isolation is the app's own logic over the forwarded identity, which is what §5 already assumes | High |
| Outbound HTTP to arbitrary URLs | **Undocumented.** The Workers runtime ordinarily permits `fetch`, but Sites does not say so | **The second row to probe** |
| Server-side secret store, and a place to call from | Hosted environment variables and secrets, plus server-side code | High — this is the row that decides whether pass 2 can ever ship |
| Cross-owner read for one collection kind | Answered by construction rather than by the platform: site-level access control is coarse, and a `demo-template` readable by every signed-in user is ordinary app logic over D1 | High |
| Control over layout density | Full page, not a chat column | High — **the earlier warning is withdrawn** |

**The identity caveat.** What is documented as arriving is an *email* and a full
name. §5 wants an `owner_id`, and an email is a poor primary key: people change
them, and it puts a personal identifier in every row. Probe 3.2 therefore asks
whether a stable, opaque id is also available, and §5's `owner_id` should be that
if one exists.

### 2.3 The limitation the spec did not anticipate

Sites documents that "some frameworks, private networks, databases, **background
services**, and hosting patterns aren't supported" — no persistent process, no
scheduled workers, no cron.

**§6's pass 2 is specified as "deferred and resumable" — a queue.** A queue with
nothing to run it is not a queue. This does not break the design, but it does
decide the shape of the capture pipeline, and nothing in `spec.md` or `plan.md`
currently accounts for it. The options, none of which needs a background worker:

- **Drive it by hand** — an explicit "capture the gaps" action. ***Chosen***
  (`decisions.md`, 2026-08-17).
- **Drive the queue from requests** — each request processes a bounded batch.
  Deferred.
- **Drive it from the open tab** — the client polls while a sitting runs.
  Deferred.

**The reason for choosing the simplest is measurement, not effort.** The user's
words: *"this will allow me to test the value of the function carefully before we
automate it"*. Automating first would hide whether pass 2 is worth having, which
is the one thing §12 says should be measured rather than assumed. The other two
stay live and are cheap later, because all three call the same processor — the
choice is a caller, not a redesign.

Pass 1's ingestion-time capture is unaffected: it is not deferred, it is part of
landing the pile.

## 3. The probes

One per row of §10's table. Re-ordered on 2026-08-17: what §2 answers on paper is
now cheap confirmation, and two rows carry nearly all the remaining risk.

**Run 3.4 first, then 3.1.** That order changed on 2026-08-17: 3.1 used to lead
as the row that fails O7 outright, and the decision to stream our own export
dissolved it. **3.4 is now the only row that can change the design** — without
arbitrary outbound `fetch`, pass 1's metadata capture cannot run in-platform and
every capture moves behind the paid vendor. Everything else degrades or is
confirmation.

The drafted site that used to live in `probe/` was the starting point. The live
probe was corrected until it worked, its results are in §6, and the repository
copy is deleted as phase 0 requires. The owner-only live deployment is retained
temporarily as a reproducible receipt; it is not initiative output or phase 1
source.

### 3.1 Streaming the whole pile out — *no longer able to fail the project*

**Settled on 2026-08-17**: the app streams its own `bookmark-sorter/v1` export
(§9) rather than relying on any platform dump, to stay platform-independent
(`decisions.md`). That dissolves the row this probe used to carry. It was *"can
the platform let the data out?"*, whose failure failed O7 outright; it is now
*"how much can one response carry?"*, whose failure is chunking.

**Probe.** Seed 10,000 rows into D1, then stream them out through the app's own
endpoint as one JSON document. Parse what comes back and count the items.

**Pass.** 10,000 items arrive and the document parses.

**Fail.** Not a wall. Record **where it cut off** — that number is the finding,
and it says whether export and import need chunking on day one. The user
accepted this cost explicitly: *"this means we'll probably need to do more work
on import — that's ok"*.

**Note.** Import is the half that inherits the difficulty, since a 10,000-item
document goes through the same §4 merge path as a small one. That is a phase 1
and phase 5 concern rather than a phase 0 one, but the ceiling measured here is
what sizes it.

### 3.2 Signed-in user identity — *confirm, and look for an opaque id*

**Probe.** Sign in as two users and read the identity headers server-side.
Confirm they are stable across sessions and devices, and **look for a stable
opaque identifier alongside the email**.

**Pass.** Two distinct stable identities, readable where the data layer runs.
The probe page deliberately reports a single observation as `UNKNOWN`; compare
results across sessions and devices before changing that verdict to `PASS`.

**If only an email is available**, `owner_id` is an email and §5 should say so
deliberately — including what happens when one changes.

### 3.3 A database with per-user rows

**Probe.** Two users, one D1 table, a query as user B that attempts to read user
A's rows by id, by listing, and by any escape the surface offers.

**Pass.** B gets nothing of A's by any route tried.

**Note.** Isolation here is the app's, not the platform's. That is expected —
§5's model assumes exactly this — but it means the O8 test in `test-plan.md`
§4.6 is testing our own code rather than a platform guarantee, which is worth
knowing when it passes.

### 3.4 Outbound HTTP to arbitrary URLs — *the second open row*

**Probe.** From server-side code, fetch three pages: a normal site, one that
404s, and one that times out. Confirm there is no allow-list and that the timeout
is controllable.

**Pass.** All three behave as the code asks, within a timeout the code sets.

**Fail.** Pass 1 metadata capture cannot run in-platform. Captures then move
behind the same vendor as pass 2 at real cost, which also promotes §5.3's vendor
question from optional to load-bearing.

**Also probe here:** how a bounded batch of captures behaves inside one request,
since §2.3 makes request-driven work the likely shape of the queue. What is
worth knowing is the ceiling — how many fetches fit in a request before
something cuts it off.

### 3.5 A server-side secret store, with a server-side place to call from

**Probe.** Put a value in Site settings, read it from server-side code, make an
outbound call with it, then search the built client bundle for it.

**Pass.** The call succeeds and the value is absent from the bundle.

Documented as available, so this is confirmation — but it is the row that decides
whether pass 2 ships at all, so it is confirmed rather than assumed.

### 3.6 Read across owners for one collection kind

**Probe.** Nothing platform-level. Confirm that site-level access control does
not *prevent* the app from serving one user rows owned by another when its own
logic says to.

**Pass.** The app decides, and the platform does not override it.

### 3.7 Layout density — *downgraded to confirmation*

**Probe.** Render 16 cells at ~300 px at a widescreen viewport, then the tablet
and phone layouts of §7.

**Pass.** 8×2 is reachable and the three form factors of §7 are distinguishable.

Sites renders full page, so this is expected to pass. It is kept because O3 is
the objective the runtime decision was made for and it costs ten minutes.

### 3.8 Metering, which is new

**Probe.** Find the plan's storage and usage limits and compare them against the
real thing: 10,000 items, plus a few hundred megabytes of downscaled captures in
R2 (§6).

**Pass.** The pile fits with room to grow.

**Why this is a probe rather than a footnote.** Beta metering can prevent adding
storage or keeping a high-usage Site public. A limit that binds at 10,000 items
is not a degradation, it is a different host — and it is a *cost* question, so
the answer belongs to the user.

## 4. What the user has to supply

The first requested fact has been supplied:

1. **Supplied on 2026-08-18:** Sites is available on the plan and in this
   workspace.
2. **Still needed after the probe:** whether the metered limits of 3.8 are
   acceptable — the one part of the spike that is the user's money rather than
   an observation.

The appetite question `plan.md` §5.2 raised — whether building sign-in is worth
it if the host has none — appears to be moot: Sites supplies identity.

## 5. What remains open

The spike cannot approve metered cost. The deployed runtime accepted the target
10,000-item dataset, but exact plan quotas are not exposed to the app and the
few-hundred-megabyte R2 estimate has not been compared with the workspace's
Sites limits. That is recorded as a `cost:` blocker. It does not block phase 1's
D1 data model and ingestion work; it gates accepting this host for the later
capture store.

Two product-level tests also remain where they belong in the plan: a second
signed-in account attempting hostile cross-user reads in phase 6, and the tablet
and phone layouts in phase 2. The spike established the host capabilities those
tests need; it did not pretend to complete the product tests early.

## 6. Results — 2026-08-18

The final run used Sites version 2, owner-only access, a 2,600×1,200 viewport for
the wide-layout check, and one signed-in ChatGPT account. Identity values and
the secret value were deliberately never returned to the browser.

| Probe | Verdict | Evidence |
|---|---|---|
| 3.4 Outbound HTTP | **Pass** | 200 and 404 responses behaved normally; a 100 ms abort timed out; ten concurrent requests completed in 151 ms |
| 3.1 Whole-pile export | **Pass** | 10,000 items; 1,525,841-byte `bookmark-sorter/v1` document; complete parse after a 1,786 ms response |
| 3.2 Identity | **Pass for host capability** | Stable opaque id, email and full-name headers all reached server code. Cross-session and two-account stability remain phase 6 tests |
| 3.3 Per-user rows | **Pass for host capability** | Owner-scoped insert/read succeeded; 10,001 caller rows were visible while 10,003 rows existed in the shared table. Isolation is app logic, not a D1 policy |
| 3.5 Secret store | **Pass** | Server read a 43-character secret and made an outbound call; only presence and length were returned |
| 3.6 Template read | **Pass** | Two synthetic template-owner rows were readable only when app logic used the cross-owner query; the host imposed no row-level barrier |
| 3.7 Layout | **Pass on the deciding wide layout** | Sixteen 300 px cells rendered as 8×2 at 2,600×1,200 with no horizontal page scroll |
| 3.8 Metering | **Open cost decision** | 10,003 D1 rows and about 1,616,053 bytes of item payload succeeded. Exact plan limits and acceptance of a few hundred MB in R2 remain the user's authority |

The chosen surface is therefore **ChatGPT Sites**. No executable probe row
requires revisiting the web-app design. Metering remains explicit rather than
being smuggled into that conclusion as an assumed approval.
