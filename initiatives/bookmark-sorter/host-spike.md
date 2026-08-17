# The host spike

`plan.md` phase 0 asks for §10's table filled in **with evidence rather than
expectation**, and a dated `decisions.md` entry naming the surface. This document
is not that. It is what a sweep could honestly produce without an account on the
candidate host: the probes written out so the spike is an afternoon rather than a
design exercise, and one desk finding that changes what the spike has to ask.

**Nothing below is spike evidence.** §2 is documentation and third-party
accounts, which is exactly the category `plan.md` phase 0 exists to replace.
Where it contradicts a presumption in `decisions.md` it is a reason to *look*,
not a finding.

## 1. Why the spike did not run

Phase 0 needs two things the repository does not have, and `plan.md` §5.2 already
named both as belonging to the user rather than to a spike:

- **A named surface.** `decisions.md` (2026-08-14) settled the shape as a web
  app "most likely hosted on an OpenAI site, using its database", and left
  *which* surface open. Every row of §10's table is a question about a specific
  product; asked of "an OpenAI site" it has no answer.
- **An account or budget on it.** The rows that decide the project — bulk data
  export, per-user rows, a server-side secret store — are answered by signing in
  and trying, not by reading. Spending or signing up on the user's behalf is not
  the sweep's to do.

So the item is recorded as blocked rather than done. What follows is the part
that can be prepared in advance, so that answering the blocker is immediately
followed by evidence rather than by planning.

## 2. What desk research changed about the question

Read as documentation, and to be confirmed rather than believed.

`decisions.md` recorded the case for an OpenAI host as: *"hosting, storage and
sign-in come with the platform, so none of it has to be built or run."* That
sentence is the load-bearing one — it is why §10's table was expected to come
back mostly green, and it is what made the web app cheap relative to a hosted
service.

**Public material about how apps in ChatGPT are actually built does not describe
that arrangement.** The Apps SDK, as documented and as described in several
independent build guides, is an app in two parts: a widget rendered in an iframe
inside ChatGPT, and **an MCP server the developer hosts**, with the database a
choice the developer makes and runs. The build guides that exist are written by
hosting and database vendors — Supabase, Koyeb, DigitalOcean, Render — which is
itself the tell: they exist because there is something to host.

Separately, **"Sign in with ChatGPT"** launched as a live beta on 2026-08-02 and
supplies an identity — name, email, profile picture — to an application that is
otherwise the developer's own.

If both hold, then "an OpenAI site with its database" is not one product but a
choice between three arrangements that answer §10's table very differently:

| Arrangement | Identity | Database | Server-side secret store | Layout density |
|---|---|---|---|---|
| **A. An app inside ChatGPT** (Apps SDK) | from the platform | **yours to run** | yours, so yes | **an iframe inside a chat** — the row most at risk |
| **B. Your own web app, "Sign in with ChatGPT"** | from the platform | yours to run | yours, so yes | full control |
| **C. Neither — an ordinary host** | build or buy | yours to run | yours, so yes | full control |

Two consequences worth stating before anyone runs a probe:

- **The bulk-export row may be answered by construction rather than by the
  platform.** If the database is the developer's in all three arrangements, O7's
  hard requirement stops being a question about OpenAI at all. That is the
  single largest thing this changes, and it is the row `plan.md` §1 says could
  invalidate the spec.
- **Layout density becomes the sharp row for arrangement A.** §10's table lists
  it last and calls triage speed the first casualty. An 8×2 grid of ~300 px cells
  (§6) inside a chat-column iframe is a different question from an 8×2 grid in a
  browser tab, and O3 is the objective the entire runtime decision was made for.

**What would change this reading:** any of it being out of date or wrong — which
is precisely why it is §2 of a probe plan and not an entry in `decisions.md`.

## 3. The probes

One per row of §10's table, in `plan.md` phase 0's order — the order in which
they can break the project. Each is deliberately small: the spike's code is a
probe and is deleted.

### 3.1 Bulk data export — *the hard requirement*

**Probe.** Create a table, write a few thousand rows, and get them out as a file
another program can read, signed in as an ordinary user, using nothing the
project would not have in production.

**Pass.** A file arrives, it parses, and the row count matches.

**Fail.** O7 fails outright and this goes back to §2. Not a degradation — the
objective is a round trip, and a store nothing can leave is not one.

**Note.** Under §2's reading this is a question about the database chosen, not
about OpenAI, and may be answered before the surface is. If so, say so in
`decisions.md`: a hard requirement that turned out to be satisfied by
construction is worth recording, because the next reader will otherwise assume it
was tested against the host.

### 3.2 Signed-in user identity

**Probe.** Sign in as two different users and read a stable per-user identifier
from the server side. Confirm it is stable across sessions and devices.

**Pass.** Two distinct, stable ids, readable where the data layer runs — not only
in the browser.

**Fail.** Sign-in becomes something to build, which §10 says is explicitly not
small. It does not stop phases 1–5: `plan.md` §2's scope rule means
`collection_id` is on every row from the first migration, and phase 6 is where
`owner_id` and a sign-in arrive.

**Watch for.** An identity that is only available client-side is not an identity
for this purpose. O8's isolation is enforced where the rows are.

### 3.3 A database with per-user rows

**Probe.** Two users, one table, a query as user B that attempts to read user A's
rows — by id, by listing, and by any escape the platform offers.

**Pass.** B gets nothing of A's by any route tried.

**Fail.** Substitute any hosted store; §5's model is portable, and this is the
row §10 already treats as replaceable.

### 3.4 Outbound HTTP to arbitrary URLs

**Probe.** From wherever server-side code runs, fetch three pages: a normal site,
one that 404s, and one that times out. Confirm no allow-list, and confirm the
timeout is controllable.

**Pass.** All three behave as the code asks, within a timeout the code sets.

**Fail.** Pass 1 metadata capture cannot run in-platform, and captures move
behind the same vendor as pass 2 at real cost — which also makes §5.3's vendor
blocker load-bearing rather than optional.

### 3.5 A server-side secret store, with a server-side place to call from

**Probe.** Store a value the browser cannot read, then make an outbound call from
a place that can read it. Then check the built client bundle for the value.

**Pass.** The call succeeds and the value is absent from the bundle.

**Fail.** Pass 2 stays switched off and nothing else changes — the state §6
designed for. Gap items keep no picture, visibly rather than wrongly.

**This is the row that decides §5.1's rule**, not the vendor question. The key
never reaching the browser is fixed either way; this says whether pass 2 can ever
ship at all.

### 3.6 Read access across owners for one collection kind

**Probe.** As user B, list collections of kind `demo-template` owned by A, and
copy one. Then confirm B still cannot read A's `personal` collection.

**Pass.** Templates are listable and copyable across owners; nothing else is.

**Fail.** `plan.md` phase 6 loses three of its five operations and a maintainer
seeds each tester by hand. The phase still happens.

### 3.7 Control over layout density

**Probe.** Render 16 cells at ~300 px in the real surface, at a widescreen
viewport, and measure what is actually visible without scrolling. Then the tablet
and phone layouts of §7.

**Pass.** 8×2 is reachable, and the three form factors of §7 are distinguishable.

**Fail.** §10 says triage speed is the first casualty, and O3 is what the runtime
decision was made for. Under §2's arrangement A this is the row most likely to
fail, so it is worth probing **early despite being last in the table** — a
throwaway page of 16 boxes answers it before anything else is built.

## 4. What the user has to supply

Two things, and the second follows from the first:

1. **Which surface**, or the instruction to probe more than one. §2's three
   arrangements are different enough that probing all seven rows against all
   three is most of a week, and probing 3.1 and 3.7 against each is an afternoon.
2. **An account or budget on it**, plus — where the surface has no identity of
   its own — whether building sign-in is in appetite at all. `plan.md` §5.2 names
   this as the user's rather than the spike's, and it is the one answer no
   probe produces.

The recommended shortest path, if the choice is open: **run 3.7 and 3.1 first,
against arrangement A only.** They are the two rows that would send this back to
§2, they are the cheapest two to run, and a failure on either makes the other
five moot for that arrangement.

## 5. What this document is not

It does not name a surface, fill in a row of §10's table, or add an entry to
`decisions.md`. Doing any of those from documentation is what `plan.md` phase 0
was written to prevent — the table has a column for what breaks if the host
cannot do a thing, and a table filled from a vendor's marketing would answer that
column with a guess while looking like a finding.
