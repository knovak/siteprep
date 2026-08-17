# Plan

How the Interactive Bookmark Sorter gets built, in order. `spec.md` says what is
made; this says what is made *first*, and why that order rather than another.
`test-plan.md` is its other half — every phase below ends at a named test there,
which is what stops "phase complete" from being a judgement call.

Numbered references to **O1–O8** are the objectives; **§n** is a section of
`spec.md`.

## 1. What decides the order

Three rules, applied in this priority, produce the sequence in §3:

1. **The thing that could invalidate the spec goes first.** §10's table of what
   the host must supply has a column for what breaks if it cannot, and one row —
   bulk data export — fails O7 outright. Anything built before that row is
   answered is built on a presumption. So phase 0 is a spike, and it is the only
   phase whose output is a decision rather than software.
2. **Then the thing that makes the pile faceable at all.** O2 calls the verdict
   the unit of progress and `objectives.md` calls everything else earning its
   place by making that decision faster. Ingestion and the grid therefore precede
   captures, selections, sharing and polish — a title-only grid is already
   triage, and no other phase is.
3. **Then, in each remaining phase, the thing another phase would have to be
   rewritten without.** Selections (§8) are used by export, tagging, sweeping and
   demo seeding, so they come before all four rather than being extracted from
   the first one that needed them.

**What the order is deliberately *not* sorted by.** Not by risk of the
implementation — the virtualised grid is the hardest single piece and it is
phase 2, because difficulty is not the same as uncertainty. And not by what makes
a demo look finished; captures are the most demo-visible feature in the app and
they come after the grid that has to survive without them.

## 2. Two constraints that hold across every phase

Both come from `spec.md` rather than from this plan, and both are cheap now and
expensive to retrofit — which is why they are stated here as build rules rather
than left as properties to remember.

**Every row is scoped by `collection_id` from phase 1, even while there is only
one collection and nobody to own it.** Identity arrives in phase 6, and that is
late for something everything is scoped by. What makes it safe is that the
*scope* is not what arrives late: `collection_id` is on the item, the selection
and the capture join from the first migration, and §8.1's wrapping is applied
from phase 4. Phase 6 supplies an `owner_id` on the collection and a sign-in in
front of it. That is the difference between adding identity and retrofitting
scope, and it is the same argument §5 makes for keeping a collection's identity
separable from its owner.

**The grid never waits on a capture, and no triage action costs a page load**
(§12). Phase 2 builds the grid before any capture exists, so this is structural
rather than a rule to be observed later — a grid that was born blind cannot
acquire a synchronous dependency on a picture in phase 3 without the change being
obvious.

## 3. The phases

Each phase names what it produces, what it explicitly leaves out, and the exit
test in `test-plan.md` that ends it. A phase is over when that test passes and
`log.md` records what was learned — not when the code is written.

### Phase 0 — Prove the host, or change §2

**Produces:** §10's table, filled in with evidence rather than expectation, and a
dated entry in `decisions.md` naming the surface that was chosen and the readings
that decided it.

Seven rows to answer, in the order they can break the project: bulk data export
(O7 fails outright without it), signed-in user identity, a database with per-user
rows, outbound HTTP to arbitrary URLs, a server-side secret store with a
server-side place to call from, cross-owner read for one collection kind, and
control over layout density.

**Deliberately throwaway.** The spike's code is a probe, not the first increment
— it proves a row and is deleted. Anything that survives contact with phase 1 was
not a spike.

**What a failure here means.** A failed row is a reason to revisit §2 *before*
building, which is what §10's last line says. Concretely: no bulk export sends
this back to the runtime decision; no secret store leaves pass 2 switched off and
changes nothing else; no cross-owner read costs the demo template and a
maintainer seeds each tester by hand.

**Exit:** `test-plan.md` §4.0.

### Phase 1 — The pile lands

**Produces:** the §5 data model, the Netscape bookmark HTML parser, `url_key`
normalisation, the merge rules of §4, and the ingestion tags — `src:`, `in:`,
`folder:` — plus `note` read from the `<DD>` element. A file upload, an item
count, and a list. No grid.

**Leaves out:** captures, verdicts, selections, sign-in.

The whole phase is judged on a property rather than a feature: **a real export
goes in and nothing is lost, and the same export goes in twice with nothing
duplicated.** That is O1 and the half of O7 that import carries, and it is the
one phase where the test is more interesting than the code.

**Exit:** `test-plan.md` §4.1.

### Phase 2 — The grid, blind

**Produces:** the virtualised grid at the three layouts of §7, the four verdicts,
`undo`, the marked set, focus movement, the untriaged count, and the session
instrument of §12 — items judged and elapsed time, recorded per sitting.

**Leaves out:** every picture. Cells show title, site, tags and `note`.

This is the phase that makes the initiative real: at the end of it a person can
sit down with a five-figure pile and reduce it, which is the whole of O2 and
most of O3. It is also where §12's first measured baseline comes from — a rate
taken on a few hundred real items, blind, which is the *floor* every later phase
should improve on. Taking the baseline before captures exist is deliberate: it
is the only moment when the number is not flattered by them.

**Exit:** `test-plan.md` §4.2, including the first recorded rate.

### Phase 3 — Captures, pass 1, with pass 2 built and switched off

**Produces:** the anonymous metadata fetch, the `og:image` → `twitter:image` →
none ladder, downscaling, the image hash, `err:` tagging, and the whole of pass 2
— the queue, the gap rules, the duplicate-image rule, the storage — against a
**stubbed vendor call** behind the switch §6 describes.

**Leaves out:** any real vendor call, and therefore any spend.

Two numbers come out of this phase and both feed decisions rather than dashboards:
**coverage** (what fraction of a real pile got a distinguishable picture from
metadata alone) and **the duplicate-image distribution**. §6's threshold of 30
items sharing one image hash is explicitly a starting value; this is the phase
that replaces it with a measured one, and the replacement is a `decisions.md`
entry, not a constant quietly edited.

**Exit:** `test-plan.md` §4.3.

### Phase 4 — Selections, and judging a group as one

**Produces:** the §8 expression evaluator as a single function — `and`, `or`,
`not`, parentheses, bare tags, trailing `*` — the UI wrapping of §8.1, saved
selections, `tag-apply` over a selection, §8.3's confirmation above a threshold,
and §7.1's mark-then-sweep with `verdict-rest` and a single-action `undo`.

**Leaves out:** cross-collection administrative use beyond what the tests need,
and every route to automatic tags except applying one by hand.

This is the phase that turns O5 from "clusters" into something built, and §7.1 is
the part that makes a five-figure pile finishable rather than merely triageable.
It comes before export because export takes a selection (§9), and before demo
seeding because seeding is an export of one (§9.1). Building it after either
would mean extracting it from them.

**Exit:** `test-plan.md` §4.4.

### Phase 5 — The round trip

**Produces:** export as a function of a selection, emitting the `bookmark-sorter/v1`
document of §9 with the expression recorded in it, and import as the phase 1
merge with records as input instead of an HTML export.

**Leaves out:** nothing much — this phase is small precisely because §4's merge
and §8's selection already exist. That it is small is the payoff for the order.

**Exit:** `test-plan.md` §4.5 — the round trip, which is the test that makes O7
mean something.

### Phase 6 — Identity, collections, and demo copies

**Produces:** sign-in from the host, `owner_id`, the three collection kinds,
`can_edit_templates`, and the five operations of §10.1 — create or edit a
template, list templates, take a copy, take a *fresh* copy, delete a copy — plus
the collection menu the wish's amendment asks for.

**Leaves out:** every part of the general sharing scheme. No reader lists, no
ACLs, no revocation (§10.2).

**Exit:** `test-plan.md` §4.6, whose central case is two users: a tester takes a
copy, triages it, and can reach nothing of anyone else's.

### Phase 7 — Turning pass 2 on

**Not a development phase.** The code shipped in phase 3; this is a configuration
change plus one contract test against the real vendor, gated on two answers that
are not the plan's to give: where the key lives (phase 0's secret-store row) and
which vendor at what price (§5 below).

If either answer never comes, the app is finished without it and gap items keep
no picture — visibly missing rather than confidently wrong, which is the state
§3 chose the metadata path for.

## 4. What each phase leaves behind

Every phase ends with three things, and the third is the one that is easy to skip:

- the exit test passing;
- a `log.md` entry saying what happened;
- **a `decisions.md` entry for anything the phase settled that the spec had left
  open** — the host, the duplicate threshold, the vendor. A number learned from
  data and then buried in a constant is a decision nobody can revisit, and the
  next person to see 30 in the source has no idea whether it was measured or
  guessed.

## 5. The questions §13 left for this plan

Seven were open. Five are answered here by reasoning; two are answered by
evidence that does not exist yet, and this plan says who produces it and when
rather than guessing.

### 5.1 Where the screenshot API key lives — *phase 0, with the answer pre-committed*

The custody question is a hosting fact, so phase 0 answers it. What does not wait
on phase 0 is the **rule**, which §6 already fixes and this plan makes the gate
on phase 7: the key never reaches the browser, and if the only way to call the
vendor is from the client, pass 2 does not ship at all. The pipeline is built and
tested against the stub in phase 3 either way, so this question can only ever
cost the *feature*, never the schedule.

### 5.2 Which OpenAI surface — *phase 0, on evidence*

Judged against §10's table, not chosen here. Naming a surface now would be a
guess given the standing of a spec section, and it would be the second time the
same presumption was recorded as if it were a finding. What is fixed now is the
**decision rule**: the surface that satisfies bulk export and per-user rows wins;
among surfaces that satisfy both, the one with a server-side secret store wins,
because it is the difference between pass 2 shipping and not.

Two things could change this, and both belong to the user rather than to a spike:
an account or budget on the candidate host, and the appetite to build sign-in if
the host has no identity of its own. The spike will say what the host can do; it
cannot say what the user is willing to pay for or run.

### 5.3 Which screenshot vendor, and its retention terms — *left to the user, deliberately*

The criteria are settled: **no retention of captured images beats a lower price**,
since §6 records the disclosure as an accepted cost and retention is what makes
it more than a fetch; per-thousand pricing beats a subscription at this volume,
because pass 2 runs on the minority of items and then stops; and an API that
takes a URL and returns an image needs nothing else.

Picking one spends the user's money on the user's terms, so it is recorded as a
`cost:` blocker on a todo item of its own rather than settled here. Nothing waits
on it: phase 3 ships against the stub, and phase 7 is the only phase that needs
an answer.

### 5.4 May a user hold several collections? — *yes, and the question is already settled by construction*

The wish's "one per user" implies not, but §10.1 makes it moot: **a demo copy is a
second collection owned by that user**, so the moment anyone takes a copy the
one-per-user reading is false. Building a restriction that the demo flow
immediately violates would mean two kinds of user or a special case for copies —
strictly more machinery than allowing many.

So: many, listed in the collection menu, one of them current. The cost is a menu
that must show a list rather than a name, which §10 already requires it to render
either way.

**What would change this:** nothing observed so far. If the menu becomes crowded
enough to slow the choice down, that is an argument for ordering or hiding, not
for the restriction.

### 5.5 What seeds the demo collection — *a selection from the user's own pile, exported and checked in*

§9.1 already specifies the mechanism; the open part was the content and where it
lives. Both resolve the same way:

- **Content:** a few hundred items selected out of the personal collection, wide
  enough to include the cases a tester should meet — a folder path, a dead link
  carrying `err:404`, a group of near-identical links from one site that
  mark-then-sweep is for, and some items with no capture at all.
- **Where it lives:** the export file is committed under this initiative's own
  directory, so the template can be rebuilt from source rather than being a
  hand-curated collection that exists only in a database. That also makes the
  seed reviewable, which a database row is not.
- **Verdicts are stripped before it is committed.** §9.1 says the file carries
  them and the person seeding chooses; for a demo the choice is easy, because a
  pre-judged pile has nothing left to triage and triage is the entire thing being
  demonstrated. A handful are kept deliberately, as worked examples of what a
  verdict looks like.

**One rule the seed inherits:** the personal collection is the user's own
bookmarks, so the selection is theirs to approve before anything is committed.
The plan does not choose the items.

### 5.6 Cheap cluster proposals: at ingestion or on demand? — *split, along the line of what they depend on*

§8.2's in-app proposals are three different computations wearing one name, and
they answer differently:

| Proposal | Depends on | When |
|---|---|---|
| Same site | the item's host, immutable | On demand — a group-by over an indexed column, milliseconds at 10,000 items |
| Same folder path | a `folder:` tag, which the user may change | On demand — precomputing it would be stale the moment a tag is edited |
| Near-identical titles | the item's title, immutable | **At ingestion**, as a stored normalised-title key; grouped on demand |

The line is not cost, it is **what the answer is a function of**. Anything derived
from the item alone can be computed once at ingestion and never invalidated;
anything derived from the current tag state must be computed when asked, or it
needs an invalidation scheme — which is a cache, and a cache is a great deal more
machinery than a `group by` at this size.

So only the expensive one is precomputed, and it is precomputed as a *key* rather
than as a cluster, so the grouping still happens on demand and no proposal is
ever stale.

### 5.7 What a skill hands back in §8.2 — *a proposals file shaped like an export, accepted per tag*

**The file.** Same shape as a §9 export, with two differences: each item carries
`proposed_tags` rather than `tags`, and the document carries a `proposal` block
naming what produced it and when. Items are identified **by URL, not by internal
id** — that is the identity §4 already uses across the boundary, and it is the
only one that survives the file crossing into a different collection (§9.1), where
internal ids mean nothing.

```json
{
  "format": "bookmark-sorter/v1",
  "proposal": { "by": "cluster-skill", "at": "2026-08-15T00:00:00Z" },
  "items": [
    { "url": "https://example.com/page", "proposed_tags": ["topic:rust"] }
  ]
}
```

**Acceptance is per tag, over the set of items proposed for it — not per item.** A
tag proposal is a claim about a group ("these nine are one topic"), so judging it
one item at a time is exactly the per-item work §7.1 exists to avoid. Each
proposed tag becomes a selection the user can look at as a screenful and then
accept or discard in one action; accepting calls `tag-apply` on that selection,
which is the function phase 4 already built.

**Nothing is written until it is accepted.** The file is not the store, and a
skill cannot write a tag — which keeps §8.2's "proposals, not writes" true in the
mechanism rather than in the prose. Once accepted, the tag is an ordinary tag with
nothing marking its origin, as §5 requires.

## 6. What this plan does not decide

- **The rate target of §12.** It stays unset until phase 2 produces a baseline, on
  `objectives.md`'s grounds that a number set now is a guess dressed as a
  requirement.
- **The duplicate-image threshold.** Phase 3 measures it; 30 is a starting value.
- **Anything held out of the first version** — tab harvesting, pushing subsets
  back into a browser, general sharing. §11 says the export format is what makes
  the first two cheap later, and phase 5 is where that becomes true.

## 7. The risks worth naming

- **Phase 0 comes back badly.** The mitigation is that it comes back *first*; the
  cost of a failed row is a revisit of §2, not a rewrite.
- **The blind baseline in phase 2 is disappointing.** If triage is slow without
  pictures, that is a finding about O4 rather than a failure — it says captures
  are load-bearing, and it says so before any money is spent on them.
- **Metadata coverage is worse than expected.** Then pass 2's queue is larger than
  planned, which is a cost question and lands on §5.3's blocker rather than on the
  build.
- **Identity in phase 6 turns out to need more than the host gives.** §10's table
  says sign-in becomes something to build, and it is explicitly not small. The
  scope rule in §2 above is what keeps that a phase rather than a migration.
