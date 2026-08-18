# Plan

How the Newsletter Story Harvester gets built, in order. `spec.md` says what is
made; this says what is made *first*, and why that order rather than another.
`test-plan.md` is its other half — every phase below ends at a named test there,
which is what stops "phase complete" from being a judgement call.

Numbered references to **O1–O8** are the objectives; **§n** is a section of
`spec.md` unless it says `story-record.md`.

## 1. What decides the order

Three rules, applied in this priority, produce the sequence in §3:

1. **What is blocked on the user goes as late as it can.**
   `newsletter-inventory` was a `data:` blocker — which senders count is a fact
   about a mailbox, and §4 is explicit that a source not in the inventory is not
   harvested. The 2026-08-18 answer arrived after the fixture contracts and run
   loop existed, validating the ordering: no earlier phase waited for mailbox
   data, and phase 6 now has concrete input rather than a guess.
2. **Then the durable thing before the disposable ones.** §1 divides the design
   by lifetime — the store outlives every run, the page is regenerated whenever
   it is wanted, and the skill is one harvester among any number. Building in
   lifetime order means nothing durable is ever shaped by something temporary,
   and identity (`story-record.md` §3) is the one part where a wrong decision
   cannot be corrected later, because every record already written carries it.
3. **Then, in each remaining phase, the thing another phase would have to be
   rewritten without.** The merge path (`story-record.md` §3) is used by the
   harvest, by import, and by the verdict round trip, so it is built once in
   phase 1 rather than extracted from whichever needed it first.

**What the order is deliberately *not* sorted by.** Not by what the initiative is
*about* — extraction is the interesting problem and the hard one, and it is phase
2, behind a phase of plumbing that has to exist for its output to land anywhere.
And not by what demonstrates progress; the review page is the visible artefact
and it comes fourth, because a page rendering a store nobody trusts demonstrates
nothing.

## 2. Three constraints that hold across every phase

All three come from `spec.md` rather than from this plan, and each is cheap now
and expensive to retrofit — which is why they are stated here as build rules
rather than left as properties to remember.

**The mailbox is behind a seam from phase 3, and the fixtures are the first
implementation of it.** Everything above the seam — the run loop, extraction,
merging, reporting — takes *issues*, not Gmail. The fixture source reads the
committed issues of `test-plan.md` §3; the Gmail source arrives in phase 6 and
nothing above it changes. This is what makes rule 1 possible rather than
aspirational: the mailbox is a late dependency because it was designed as one,
not because the tests were postponed.

**Every arrow into the store starts at a skill** (§1.1). The page renderer is a
pure function from a store to a file, with no write path in it at all, from the
moment it exists in phase 4. Its only output is the verdict file of §9. A
renderer that could write is a renderer that eventually does, and the store is
the one durable thing in the design.

**Nothing of the message survives extraction.** §6 keeps no HTML, no
attachments, no images; the record is the only thing that crosses out of the
extractor. Built in from phase 2, because a pipeline that retains the mail while
it is convenient and stops later is one that has already leaked it into a log, a
cache, or a fixture — and §12's published page is safe only because there is
nothing to leak.

## 3. The phases

Each phase names what it produces, what it explicitly leaves out, and the exit
test in `test-plan.md` that ends it. A phase is over when that test passes and
`log.md` records what was learned — not when the code is written.

### Phase 0 — Prove the mailbox reaches

**Produces:** §14's first row, answered with evidence rather than expectation,
and a dated entry in `decisions.md`.

One question, in the form §5.1 actually needs it: can a read-only connector
search by **from-address, by label, and by date range**, take the **union** of
several matchers as §4's `match` field requires, and return a message body the
extractor can read? Sender and date are the ordinary case; the union and the
label are where a connector is most likely to disappoint.

**No inventory needed.** The probe searches for any newsletter the mailbox
happens to hold — one sender, one label, one fortnight. It is asking what the
connector can do, not what is in scope, and conflating those is what would make
this phase wait on the user.

**Deliberately throwaway,** and it is the only phase whose output is a decision
rather than software.

**What a failure here means.** §14 says it plainly: everything, there is no other
input. A connector that cannot filter by date makes §5.1's explicit range a
client-side filter over the whole mailbox, which is slow but survivable. A
connector that cannot search by sender or label at all sends this back to §2 —
the runtime decision presumed a mailbox that could be searched, and it is better
to learn that in an afternoon than in phase 6.

**Exit:** `test-plan.md` §4.0.

### Phase 1 — The store, and what makes two stories the same one

**Produces:** the store file of §7 with atomic write and one kept generation; the
record of `story-record.md` §1; `url_key` construction — the redirector unwrap
table, the optional single HEAD follow, and normalisation (`story-record.md` §4);
identity for both cases of §3; the case 2 cross-source merge with `merged_from`;
and the §7.1 import path, which is the same merge with records as input.

**Leaves out:** every email, every model call, the page, and verdicts.

The whole phase is judged on properties rather than features, and they are the
ones O3 is made of: **the same records go in twice and nothing duplicates**, and
**two sources carrying one article arrive as one record with both sources kept.**
It is the one phase where the test is more interesting than the code.

It is also the phase where a mistake is permanent. A change to identity after
records exist does not migrate — every stored `id` was derived from the old rule,
and `story-record.md` §1 chose derived ids over random ones precisely so a
re-harvest lands on the same one. That is the argument for building it first and
against building it alongside the extractor that will be pressuring it.

**Exit:** `test-plan.md` §4.1.

### Phase 2 — The three contracts, against fixtures

**Produces:** the fixture issues of `test-plan.md` §3; the §3.1 contract for each
of the three shapes — what is asked for, what `text` and `url` mean, what
`source_anchor` is, and the expected count band; the §3.2 machinery for a shape
that turns out wrong, including the per-issue override, `err:count` tagging and
the named `long-form` report; and the recorded-response harness that makes all of
this testable without a model in the loop.

**Leaves out:** the mailbox, the store's harvest entry point, and the page.
Extraction here reads a fixture document and returns records.

This is the initiative's hard problem, and the reason it is one phase rather than
three is that the three contracts differ in what they ask for, not in how they
work. Building them together is what keeps §3.2's override cheap: a source
declared `long-form` that this week is a link list runs the other contract, and
that is only a one-line decision if both contracts are the same kind of object.

**Two numbers come out of this phase**, and both feed decisions rather than
dashboards: the count band each contract actually needs — §3.1's 10–60, 3–15 and
1 are a first cut — and the rate at which the adversarial fixtures defeat the
prompt. The second is the one to watch. A contract that gets the typical fixture
right and the citation-dense column wrong is the exact silent failure
`objectives.md` names, and it is better to find it against a fixture than in a
month of real issues.

**Exit:** `test-plan.md` §4.2, including a recorded eval score per contract.

### Phase 3 — A whole run, over a fixture mailbox

**Produces:** the §5.2 run loop end to end — resolve inventory and range, search,
extract under each source's shape, unwrap and compute identity, merge into the
store, propose tags including themes (§10.1), and report; the `source_doc` record
for every matched message including the ones that yielded nothing (§5.1); and the
run record written into the store.

**Leaves out:** Gmail. The message source is the fixture implementation of the
§2 seam, and the inventory is a fixture inventory naming fixture sources.

At the end of this phase **the harvester works**. What it does not have is a
mailbox, and that is the whole of the distance between here and a real pile —
which is worth stating because it is easy to read the inventory blocker as
holding up the build rather than the last mile of it.

**Exit:** `test-plan.md` §4.3.

### Phase 4 — The review page

**Produces:** the §8 generator — a pure function from a store to a self-contained
file — with `expand`/`collapse`, `sort`, `filter`, `verdict`, `verdict-rest`,
`undo`, the always-visible backlog count, and `export()` producing the §9 verdict
file. Rendered from a fixture store, opened from the filesystem, no network at
open time.

**Leaves out:** the import half of the round trip, publishing, and any write path
to the store.

This is O7, which is the objective the whole runtime decision was made for, and
it is where the design's central bet is first testable: that a page beats a
conversation for a few hundred keep-or-drop calls. Phase 3's fixture store is
enough to render, so this does not wait on the mailbox — and building it now
rather than after the first real harvest means the first real harvest has
somewhere to be judged the day it lands.

`verdict-rest` is the single most important function on the page (§8), and it is
also the one a first implementation is most likely to get subtly wrong: it
applies to everything *visible and unjudged*, so what the current filter is doing
is part of its meaning.

**Exit:** `test-plan.md` §4.4, including the first measured review rate.

### Phase 5 — Verdicts back into the store

**Produces:** the §9 importer — idempotent, verdicts and tags only, later
`verdict_at` wins, unrecognised verdicts stored as given, mismatched `store_id`
refused with both ids shown — and the run record it writes like any other pass.

**Leaves out:** §9's option B, the direct browser write. It is an enhancement and
it writes the same file, so it changes nothing structural and can arrive whenever
it is wanted.

**Small, and that is the payoff for the order.** `decisions.md` called the
verdict round trip the fiddly part of the chosen option; by the time it is built,
the merge rules, the run record and the store's write path all exist, and what is
left is one file format and five rules about it.

At the end of this phase the loop closes without a mailbox: fixture issues in,
page out, verdicts back. **Everything except the real material is finished.**

**Exit:** `test-plan.md` §4.5.

### Phase 6 — The real mailbox, and the real inventory

**Produces:** the Gmail implementation of the §2 seam, the private inventory
file in §4's form filled from the 2026-08-18 decision, the unwrap rules for the
senders it names (§15), and the first real harvest over a real date range.

**The user-data blocker is settled.** The answer also sharpened the inventory
form: each source has its own rolling lookback, and one source requires sender
**and** subject conditions rather than a union. Phase 3's fixture loop pins both
rules before the Gmail implementation uses them.

**What the first real harvest is for.** Not volume. It is the first contact
between the phase 2 contracts and prose nobody wrote for a test, and the numbers
to take from it are the count-band flags and the merge rate — how often two
sources really did carry the same article, which is the number that says whether
`story-record.md` §4's unwrapping is earning its keep.

**Exit:** `test-plan.md` §4.6.

### Phase 7 — The tagging skill

**Produces:** the §10.3 pass over the store — reads it, reads the content,
proposes `theme:` and `about:` tags — plus the cluster paraphrase of §10.2 and
the page's rendering of a cluster as one entry with its members underneath.

**Why here and not sooner.** §15 says "eventually" is the wrong answer, and the
right one is *immediately after the first real harvest*. The skill's whole
advantage over harvest-time theming is that a pass over the store sees
everything, and against phase 3's dozen synthetic issues "these nine stories are
one category" is not a judgement — there is nothing for it to be right about.
Real volume is its first honest input, and it is what turns a judgeable pile into
a themed one, which is O4 and O6.

**Tags land directly, not as proposals** (§15's other half). §10.3's own
reasoning is that a tag is cheap to remove, and this store has no boolean
selection language over thousands of items to be poisoned by a bad one. What
makes that safe rather than merely cheap is the run record: **a pass names the
tags it added, so a bad pass is undoable as a set** rather than one tag at a
time. Without that the stricter line would be right.

**Exit:** `test-plan.md` §4.7.

### Phase 8 — Publishing

**Produces:** §12's page — the phase 4 renderer with the verdict controls removed
and the selection narrowed to kept and emphasised, `source_doc` and
`source_anchor` withheld.

**Not a development phase**, in the sense that it is the same generator with two
arguments changed. It is a phase rather than a footnote because the thing it must
not do — carry provenance that names a message in someone's mailbox — is a
property to be tested rather than an option to be set.

**Exit:** `test-plan.md` §4.8.

## 4. What each phase leaves behind

Every phase ends with three things, and the third is the one that is easy to skip:

- the exit test passing;
- a `log.md` entry saying what happened;
- **a `decisions.md` entry for anything the phase settled that the spec had left
  open** — the connector's real search surface, the count bands, the merge rate.
  A number learned from data and then buried in a constant is a decision nobody
  can revisit, and the next person to read `10–60` in a contract has no idea
  whether it was measured or guessed.

## 5. The questions §15 left for this plan

Seven were open. Six are answered here by reasoning; one is answered by evidence
that does not exist yet, and this plan says who produces it and when rather than
guessing.

### 5.1 The unwrap rules for the actual senders — *phase 6, on the inventory*

The only one that genuinely waits. A redirector rule is a fact about a sender,
and §4's `unwrap` field is per-entry, so these arrive with the inventory.

What does **not** wait is the mechanism: the unwrap table, the single HEAD follow
and the normalisation are phase 1, tested against `redirectors.json` — synthetic
wrapped URLs in the shapes the named senders use. Adding a real sender is a table
entry, not a change to the pipeline, which is the point of building it that way
round.

### 5.2 The prompt and its evaluation per contract — *phase 2, and it is the phase*

`test-plan.md` §2 carries the design; the plan's part is to say what phase 2 owes
and to be honest about which half is a test.

The long-form summary is the one place the model's output *is* the deliverable
rather than an intermediate, and it cannot be asserted against an expected
string. What can be asserted is everything around it — that exactly one story
came back, that `text_is_summary` is `true`, that no citation became a story, and
that identity is what it should be. **On the two verbatim shapes the text itself
is checkable**, because §3.1 says the blurb is copied rather than paraphrased: a
harvested `text` must appear in the source document. That turns "extraction never
invents text" from a principle into an assertion, and it is the strongest test in
the suite.

The summary's quality is scored rather than asserted, in the eval layer, against
a rubric recorded with the score. A rubric that drifts is a real risk and the
mitigation is that the fixture set does not: the same column is scored every
time, so a falling score is a change in the prompt rather than in the material.

### 5.3 The fixture set — *phase 2, and three adversarial cases rather than two*

§15 names two — a long-form column dense with citations, and a link list whose
section headings look like items. Both are in `test-plan.md` §3. A third belongs
beside them: **a link list with a sponsor block and an unsubscribe footer.**
Every real newsletter has one, the links in it are structurally
indistinguishable from stories, and a contract that harvests "Update your
preferences" as a story fails in exactly the way §3.2 is about — plausibly, and
in bulk.

### 5.4 How a cluster's paraphrase is produced — *at tagging time, in a store block of its own*

§15 offers two answers and one of them is ruled out by a rule elsewhere in the
spec. **§10.2 suggests "the cluster's tag metadata"; §13.1's binding list forbids
per-tag metadata outright** — "any other structure — objects, weights, per-tag
metadata — is a different evaluator". A paraphrase hung off a tag would break the
one thing §13.1 exists to protect.

So neither of §15's options as written. The third, which costs nothing and keeps
both rules:

> The store gains a **`clusters` block** beside `stories`, `runs` and
> `vocabularies` — keyed by the `about:<slug>` tag, holding the paraphrase and
> the pass that wrote it. The tag stays a bare free string, membership stays a
> tag on each story, and a reader that ignores the block loses a paragraph and
> nothing else.

Written by the phase 7 pass, because the page cannot call a model (§8) and the
paraphrase has to be in the store before the page is generated. This is worth
raising with the spec rather than only recording here: §10.2's sentence should
say `clusters` rather than tag metadata.

### 5.5 Whether `--refresh` is worth building — *no, because it already exists*

§3.3 defines `--refresh` as replacing `text` and `title` on matched records while
never touching `verdict`. That is not a new mechanism; it is a composition of two
things phase 5 already has:

1. Harvest the range into an **empty** store. Fresh text, no verdicts.
2. **Import the old store** into it. §7.1's rules do the rest — verdicts arrive
   because a null verdict never displaces a real one, tags union, and first-write
   -wins leaves the new text in place.

So the first version ships without the flag and the plan records the two-step, on
the grounds that a flag which is a shorthand for two supported operations is
worth having only once someone has wanted it more than once.

**What would change this:** re-extraction becoming routine — a prompt that
improves often enough that the two-step is run monthly. Then it is a convenience
worth the code, and nothing about it is harder to add later.

### 5.6 Where the tagging skill sits — *phase 7, immediately after the first real harvest*

Argued in phase 7 above. Restated here because §15 asks it directly: after,
because it needs real volume to be a judgement rather than a guess; and
immediately after, because it is the piece that turns a judgeable pile into a
themed one and O4 and O6 are unmet until it exists.

### 5.7 Which subset selectors `store export` needs — *none, on day one*

§7.1 says export is a copy and that the subset operation exists only to take
less. Backup is the whole-file copy, which needs no selectors at all. Every
subset use is a *handoff* — to the D fallback, to another machine, to a tool that
does not exist — and none of those is in the first version.

So `store export` ships as the copy, and the import path (phase 1) is built to
accept a subset from the start, since that is the half that has to be right
before anyone produces one. **What would change this:** the user taking the D
fallback, which is the first real handoff and would want a date range and a
source selector on the same day.

## 6. What this plan does not decide

- **The count bands of §3.1.** 10–60, 3–15 and 1 are a first cut; phase 2
  measures them against fixtures and phase 6 against real issues, and the
  replacement is a `decisions.md` entry rather than a constant quietly edited.
- **Whether the single HEAD follow (`story-record.md` §4, step 2) is on by
  default.** It costs a request per link and tells the sender's tracker the link
  was resolved. Phase 6's merge rate is the number that decides it: if unwrapping
  by table already catches the twins, the follow buys nothing.
- **Anything held out of the first version** — publication as an OpenAI site, and
  writing back to the mailbox in any form.

And one thing this plan cannot decide but should not leave unsaid, because it
belongs to the spec:

- **§10.2 and §13.1 disagree about tag metadata**, as §5.4 above sets out. The
  plan proposes a `clusters` block; the spec should say which of its two rules
  gives way if that is not the answer.

## 7. The risks worth naming

- **Phase 0 comes back badly.** The mitigation is that it comes back *first*, and
  costs an afternoon. The bad case is not "no connector" but a connector that
  searches by sender and not by label, which quietly makes §4's `match` union
  half a feature.
- **A contract is right on the typical fixture and wrong on the adversarial
  one.** This is the initiative's defining failure and the reason the adversarial
  fixtures exist from the first day of phase 2 rather than being added when
  something goes wrong. If it happens, it is a finding about the prompt, not a
  reason to widen the count band until the flag stops firing — which is the
  tempting fix and the one that would make §3.2 decorative.
- **The eval layer is flaky enough to be ignored.** A scored test that fails
  sometimes gets muted, and then extraction quality is unmeasured. `test-plan.md`
  §2 keeps it out of the gating suite for exactly this reason; the risk is that
  keeping it separate becomes forgetting it, which is why phase 2's exit is a
  *recorded score* rather than a passing run.
- **Phase 6 finds that real newsletters are messier than the fixtures.** Near
  certain, and mostly fine — the fixtures are for the pipeline, and the first
  real harvest is the calibration. It stops being fine if it turns out a source's
  shape changes weekly rather than occasionally, which would make §3.2's override
  the common path instead of the exception and is worth noticing early.
- **The inventory never arrives.** Then phases 0–5 and 8 are still a working
  harvester over any material anyone points it at, and the cost is that the
  material is not the user's mailbox. That is a much better failure than a build
  that stopped on day one, and it is the whole reason for rule 1.
