# The host spike

`plan.md` phase 0 asks for §10's table filled in **with evidence rather than
expectation**, and a dated `decisions.md` entry naming the surface. This document
is not that. It is what could honestly be prepared without an account: the probes
written out so the spike is an afternoon rather than a design exercise, and what
the documentation says so the probes go after the right things.

**Nothing below is spike evidence.** §2 is documentation, which is exactly the
category phase 0 exists to replace. It is good enough to narrow the probes and
not good enough to fill in a row.

## 1. Why the spike did not run

Phase 0 needs an account on a named surface, and `plan.md` §5.2 assigned both to
the user rather than to a spike. The rows that decide the project — bulk data
export, per-user rows, a server-side secret store — are answered by signing in
and trying.

**The surface now has a strong candidate.** §2 was rewritten on 2026-08-17 after
the user pointed at **ChatGPT Sites**, which is a much better fit than the
arrangement first researched here and answers most of §10's table on paper. What
remains is confirming access and running the two probes documentation cannot
settle.

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

- **Drive the queue from requests** — each request processes a bounded batch of
  pending captures. Simple, and it means captures progress whenever the app is
  used, which for a personal tool is most of when it matters.
- **Drive it from the open tab** — the client polls a "process next batch"
  endpoint while a triage session is running. Faster during a sitting, and it
  stops when the tab closes, which is honest rather than a bug.
- **Drive it by hand** — an explicit "capture the gaps" action.

The first is the natural default and the second is a small addition to it. What
matters for now is that this is a **finding for phase 0 to confirm and phase 3 to
absorb**, not a reason to revisit §2 — and that pass 1's ingestion-time capture,
which is not deferred, is unaffected either way.

## 3. The probes

One per row of §10's table. Re-ordered on 2026-08-17: what §2 answers on paper is
now cheap confirmation, and two rows carry nearly all the remaining risk.

**Run 3.1 and 3.4 first.** They are the two the documentation does not answer,
one of them fails the project outright, and the other decides whether captures
can happen in-platform at all. Everything else is confirmation.

### 3.1 Bulk data export — *the hard requirement, and still open*

**Probe.** Create a D1 table, write a few thousand rows, and get them out as a
file another program can read — signed in as an ordinary user, using nothing the
project would not have in production. Try the platform's own export first; if
there is none, an application endpoint that streams the table as JSON counts,
provided nothing rate-limits it into uselessness at 10,000 rows.

**Pass.** A file arrives, it parses, and the row count matches.

**Fail.** O7 fails outright and this goes back to §2.

**Note.** If the answer is "no platform export, but the app can stream its own",
say so explicitly in `decisions.md` rather than ticking the row — it means O7 is
satisfied by code this project must write and keep working, not by the host, and
that is a different fact with a different maintenance cost.

### 3.2 Signed-in user identity — *confirm, and look for an opaque id*

**Probe.** Sign in as two users and read the identity headers server-side.
Confirm they are stable across sessions and devices, and **look for a stable
opaque identifier alongside the email**.

**Pass.** Two distinct stable identities, readable where the data layer runs.

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

Smaller than it was:

1. **Confirmation that Sites is available** on the plan, region and workspace in
   question. It is in public beta and gated, so this is a fact rather than a
   preference.
2. **Whether the metered limits of 3.8 are acceptable**, once known — the one
   part of the spike that is the user's money rather than an observation.

The appetite question `plan.md` §5.2 raised — whether building sign-in is worth
it if the host has none — appears to be moot: Sites supplies identity.

## 5. What this document is not

It does not name the surface in `decisions.md`, fill in a row of §10's table, or
close phase 0. §2 makes the spike cheap and well-aimed; it does not make it
unnecessary, and a table filled in from documentation would answer §10's
"what breaks if it cannot" column with a guess while looking like a finding.
