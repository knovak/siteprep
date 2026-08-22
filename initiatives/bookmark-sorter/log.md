# Log

## 2026-08-14 — wish → shaped

Drafted `objectives.md` from the wish: seven outcomes, all subordinate to triage
throughput, with the two extensions named in the wish held out of the first
version.

Three questions surfaced that the wish does not settle — the runtime, the source
of page snapshots, and the size of the real pile. The first two are recorded as
blocked items rather than answered, because they shape the spec rather than
follow from it.

## 2026-08-14 — Establish how large the real bookmark pile is

Answered: 5,000-10,000 items. Recorded in decisions.md, along with what that size rules out.

## 2026-08-14 — Where should this run?

Answered: a web app, most likely on an OpenAI site with its database. Recorded
in decisions.md with the alternatives and the trade being made - the web app is
the weakest of the four options for the two capabilities the wish lists as
extensions, and the strongest for the triage experience the wish calls the
point.

Unblocks drafting the spec. Leaves the snapshot question open, and narrower: a
web page cannot capture a third-party page client-side, and at 5,000-10,000
items live fetching per item is impractical.

## 2026-08-14 — Decide where page snapshots come from

Capture at ingestion: metadata first (Open Graph, as iMessage/WhatsApp/Google Chat do), anonymous headless render as the fallback for items with no image or a shared one. Recorded in decisions.md.

The mechanism was chosen rather than asked back, on the user's instruction to
compare how iMessage, WhatsApp, Google Chat and browser tab thumbnails do it.
The finding that decided it: none of the three messaging apps screenshots
anything — they all build a card from Open Graph metadata — and the browsers
only have pixels because they had already rendered the page for their own
reasons.

## 2026-08-14 — Wish amended: collections, import and export

The user added a second block to `wish.md`: the site may be used by more than one
person, so items live in **collections** — one per user, plus non-personal ones
such as a demo. Four operations follow, wanted in the UI as a menu: choose a
collection, import bookmarks into it from a browser export, export a collection
as JSON with tags and some selection by tag, and import from an export file.
Imported bookmarks should keep their folder path, probably as a tag.

This widens the scope past what `objectives.md` describes, so drafting the spec
is now blocked on revising it — a spec written today would be missing a third of
the requirement. The question the amendment raises but does not answer, whether
collections are protected by sign-in, by unguessable links, or not at all, is
recorded as a blocker rather than assumed.

## 2026-08-14 — Review round on the snapshot decision

Three review comments, all settling things the entry had deliberately left open:
the render pass uses a **paid screenshot API** rather than a browser fleet we
run; the duplicate-image threshold **starts at 30**; and an export carries **no
captures** — items, URLs, tags and verdicts only.

The last came with a follow-on worth more than the answer: keep a capture cache
so a re-imported collection reuses it instead of reprocessing. Recorded as
keying the capture store **by URL rather than by item**, which also makes
overlapping collections and the demo collection nearly free. It sharpens the
open `collection-access` question rather than settling it — a URL-keyed store
shared across collections leaks the existence of a URL between them, so if
collections are meant to be private the cache has to be per-collection.

## 2026-08-14 — Decide how collections are identified and who may open one

Signed-in accounts, presuming an OpenAI surface supplies user IDs. Collections have owners and are private by default. The URL-keyed capture cache stays shared across collections - the deferred capture pipeline already closes the timing channel the earlier entry worried about. Recorded in decisions.md.

The presumption is the user's and is kept as one: the model is settled, the
mechanism leans on the still-open question of which OpenAI surface this runs on.
If that host changes, sign-in stops being inherited and becomes work.

Note that this **reverses** the rule the previous round wrote down — that
private collections would force a per-collection cache. That rule was written
before the answer existed, and the deferred capture pipeline had already closed
the channel it was defending against. Corrected in `decisions.md` rather than
followed.

Raises one new blocker: private-by-default is exactly what a demo collection is
not, so what makes a collection non-personal is now `collection-sharing`.

## 2026-08-14 — Decide what makes a collection non-personal, so a demo collection can exist

Special-case demo collections as seeded per-user copies for now; no sharing machinery in the first version. A general sharing scheme is planned for a later revision and goes into objectives.md under 'Explicitly not the first version'. Recorded in decisions.md.

"Seeded" is recorded as meaning a **per-user copy**, because the other reading —
one system-owned demo that many people read — is sharing, and would need the
model this defers. Read that way it is also better for the purpose: each tester's
verdicts are their own, rather than testers overwriting each other's calls.

Last round's URL-keyed capture store is what makes the copies nearly free —
twenty testers with the same seeded demo cost one capture between them. Two
decisions lining up by luck, and a reason not to partition that cache later
without checking here first.

The `revise-objectives` item grows to cover general sharing as a held-back
capability, alongside the two the wish already holds back.

**No decisions are now waiting on the user.** Every question this initiative
raised has an answer; what remains is work.

## 2026-08-15 — Revise objectives.md for collections, import/export, imported folder paths as tags, and general sharing as a later revision

Revised objectives.md for the wish amendment and the two decisions that followed it.

Objective 1 now says that structure the user already made is part of what must not be lost: a browser export's folder path arrives as a tag, so years of shelving becomes selectable by the same mechanism as everything else rather than a hierarchy the tool models separately.

Objective 7 grows from 'exportable' to a round trip - JSON with tags and verdicts, a subset chosen by tag, and an export file that can be imported back - carrying no captures, per the decision that the judgement is what must not be trapped. Objective 8 is new: items live in a collection, a collection has an owner and is private, and a tester receives their own seeded copy of a demo.

New objectives are appended rather than inserted, deliberately: decisions.md argues about several of these by number, and renumbering would have invalidated that record without touching it.

A general sharing scheme joins 'Explicitly not the first version' as a third held-back capability - planned rather than merely possible, which is why it carries a live constraint on the spec: do not let 'owner' become the only way an item is reachable.

'Decisions this raises' listed three open questions and said they were recorded as blockers. All five questions this initiative raised are now answered, so the section is now a map into decisions.md, with what is left stated as what it is - a constraint on the spec, not a question for the user.

## 2026-08-15 — Draft spec.md, including alternatives considered for the runtime and the snapshot source

Drafted spec.md: ingestion and the folder-path tag, the URL-keyed data model, the two-pass capture pipeline, the virtualised grid and its keys, tag-expression and automatic clusters, the JSON round trip, and what the host must supply. Carries condensed alternatives for the runtime and the snapshot source, with decisions.md holding the full argument.

The stage moves to specified, and the todo list gains the next step it implies -
drafting plan.md and test-plan.md together, which is the gate the lifecycle puts
at this stage. Without it the initiative reads as finished rather than merely
specified, which is the distinction the validator's "nothing actionable" warning
exists to catch.

## 2026-08-15 — Review round on the spec: selection as the reusable function

Ten review comments, all revisions. The largest is a renaming that turned out to
be a restructuring: what the spec called a cluster is a *selection*, and it is
pulled out as one function that viewing, exporting, tagging, sweeping a verdict
and seeding a demo all call. A cluster is now just a named selection. The
evaluator can cross collections for administrative use; the ordinary UI wraps
every expression as "collection:<current> and (...)" so a user's selection cannot
reach another collection by construction.

Automatic clustering stopped being a mechanism of its own and became tag
production, with three routes that all end in the same place: apply a tag to a
selection in the app, round-trip a selection through a file that a program or
skill tags, or hand a selection to a skill that proposes tags. The app therefore
needs no clustering intelligence of its own to satisfy objective 5.

Two interaction findings. Keys are demoted to a first-cut binding of named
abstract functions, since the interaction is certain to be refined toward the
mouse - the functions are the stable part. And a new flow gets a function of its
own: display a whole selection, mark the few exceptions with one click each, then
apply a verdict to everything that was not marked. The asymmetry is why it
matters - naming four keepers out of fifty is quick, judging fifty is not.

Also: the tag schema is explicitly not fixed, so a bare 'boring' or
'response-required' is an ordinary tag; export takes a selection and is a
function rather than a menu action; exporting from one collection into another is
specified as the way a demo is seeded, which needs no cross-collection access
because everything crosses as a file; and the screenshot API key gets a section -
pass 2 ships switched off until key custody is resolved, with the pipeline built
and testable behind the stub.

Demo collections gained the detail the review asked for: a template a maintainer
edits, copies that testers own, a fresh copy rather than a repair for a dirtied
one, and delete. That needs exactly one capability on the user and two fields on
the collection. It adds one real cross-user read - a template is readable by all
signed-in users, or nobody could copy it - which is recorded against the deferred
sharing decision rather than quietly widening it.

## 2026-08-15 — Review round: the note field

Added `note` to the item - free text, distinct from the title, either carried in
on import or typed by the user. Section 5.1 records why it is neither a tag nor a
title: tags are for selecting and a note is prose that will never be matched with
and/or, and the title is what the page calls itself while the note is what the
user or the sender said about it - a distinction that matters most for the badly
titled pages where a note earns its place.

Two findings while specifying it. Netscape bookmark HTML already carries a
description in its DD element, so ingestion can read notes the user wrote years
ago rather than discarding them. And an import must never overwrite an existing
note, on the same principle as a verdict: it is the user's own writing.

## 2026-08-15 — Draft plan.md and test-plan.md, resolving the questions spec.md left open for the plan

Drafted plan.md and test-plan.md together. Eight phases, ordered by what could invalidate the spec first (the host spike), then by what makes the pile faceable (ingestion, then a grid built blind), then by what other phases would have to be rewritten without (selections before export, tagging and demo seeding). Five of the seven questions spec.md left open are answered by reasoning; the other two are answered by evidence phase 0 produces, or are the user's money to spend.

## 2026-08-17 — Critique plan.md and test-plan.md, and improve them before building starts

Critiqued plan.md and test-plan.md against objectives.md and spec.md, and applied the fixes.

Three holes were work that had been specified but never scheduled. §8.2's cheap in-app proposals - same site, same folder path, near-identical titles - were answered in detail by plan §5.6 while no phase built them, so O5's 'gathered into clusters automatically' was delivered by nothing; they are now part of phase 4, where a proposal is just a pre-filled selection. The proposals file of §5.7 had a committed fixture, proposals.json, that no test used and no phase produced; it is now part of phase 5, with the five tests that decide whether it is safe. And phase 7 had no exit test at all, in a plan whose opening sentence says every phase ends at one.

One finding is a correctness bug rather than an omission. The capture store is keyed by url_key globally, and §6 says a failed fetch writes an err: tag on every item sharing that url_key - which as written tags items in other people's collections and fails O8. The rule that keeps both sentences true is now a build rule in plan §2, tested in phase 3 against a second collection created for the test alone, and pinned in the drift table. It is invisible until two collections exist, which is phase 6, three phases after the code that would have got it wrong.

Two dependencies were unnamed. Three phase exits need the user and a real pile, which is the plan's largest scheduling dependency and not a technical one - so 'code complete' and 'phase complete' are now separate states. And the demo seed needs the user's approval of their own bookmarks, with no todo item behind it; it becomes one when phase 5 completes rather than sitting in the digest for five phases.

One tension is surfaced for the spec rather than settled: §8.3 confirms above 25 items while §7.1 describes sweeping fifty as the common case, so the single gesture asks a question nearly every time and undo already provides the recovery. The recommendation is to confirm on the unbounded action rather than the large one, with phase 4 measuring how often the threshold actually fires.

## 2026-08-17 — The host spike could not be run, and is now blocked with its probes written out

Phase 0 asks for spec.md §10's table filled in with evidence rather than expectation. That needs two things the sweep does not have and plan.md §5.2 already assigned to the user: a named surface, since every row of the table is a question about a specific product, and an account or budget on it, since the rows that decide the project are answered by signing in and trying. The item is recorded as blocked rather than done.

What was produced instead is host-spike.md: one probe per row, with its pass condition and the cost of failing it, so that answering the blocker is followed by evidence rather than by planning.

One desk finding changes what the spike has to ask, and is labelled as documentation rather than evidence throughout. The hosting decision of 2026-08-14 rested on "hosting, storage and sign-in come with the platform, so none of it has to be built or run". Public material on how apps in ChatGPT are actually built does not describe that arrangement: the app is a widget in an iframe plus an MCP server the developer hosts, with the database the developer's own choice; and "Sign in with ChatGPT" is a separate identity product for an application that is otherwise your own. If that holds, "an OpenAI site with its database" is not one product but three arrangements that answer the table very differently - and two rows move. Bulk export, the hard requirement, may be satisfied by construction rather than by the platform. Layout density, listed last, becomes the row most likely to fail, because an 8x2 grid of 300px cells inside a chat-column iframe is a different question from one in a browser tab. So the recommended shortest path is to probe those two first, against the in-ChatGPT arrangement only.

## 2026-08-17 — Review round on the critique: the confirmation rule accepted, and applied to spec.md

Both review comments were agreements, and one carried an instruction to update whatever needed updating including spec.md.

§8.3's confirmation threshold is settled: confirm on the unbounded action, not the large one. The discriminator is visibility rather than cardinality - a verdict swept across the selection on screen asks nothing at any size, because its count is already in front of the user and undo reverses it as one action, while a verdict applied to a set the user is not looking at confirms and shows the count. spec.md §8.3 is rewritten, decisions.md carries the argument and the three options, plan.md's phase 4 and §6 follow it, and test-plan.md §4.4 now has a row for each side of the rule plus a drift pin against somebody adding a count-based confirmation back "for safety".

The second comment agreed the user-availability risk and its mitigations. One of those - a phase's code merging on its automated tests while the phase stays open on its measurement - contradicted §3's opening rule that a phase is over when its exit test passes. §3 now says both, since the two sentences would otherwise read as forbidding the thing that was just agreed.

test-plan.md §4.4 also gains a second measured row: how often a sweep is followed immediately by undo. That is the evidence that would reopen §8.3, so it is worth collecting from the first real sitting rather than re-arguing later.

## 2026-08-17 — The host spike has a candidate surface: ChatGPT Sites

The user pointed at the ChatGPT Sites documentation on review of the spike's blocker. It is a different product from the Apps SDK this document first researched, and a much better fit, so host-spike.md §2 is rewritten and the earlier reading is explicitly withdrawn rather than left standing.

Sites is a hosted full-stack surface: a Cloudflare Workers runtime for server-side code, D1 (SQLite) for structured data, R2 for object storage, Sign in with ChatGPT for identity forwarded to the server in request headers, and environment variables and secrets in site settings. It renders as a full page rather than inside a chat column.

That answers five of the seven rows of spec.md §10 on paper. Two remain genuinely open, and they are now the whole of the spike: bulk data export, which is undocumented and is the row that fails O7 outright, and outbound HTTP to arbitrary URLs, which is undocumented and decides whether pass 1 metadata capture can run in-platform at all. The layout-density warning from the earlier reading is withdrawn - that concern was about an iframe in a chat column and does not apply here.

Two things the documentation surfaced that the spec had not anticipated. Identity arrives as an email address and a full name, which is a poor primary key for §5's owner_id, so the spike now also looks for a stable opaque id. And Sites supports no background services - no persistent process, no scheduled workers, no cron - while §6 specifies pass 2 as a deferred, resumable queue. A queue with nothing to run it is not a queue. Three shapes that need no background worker are recorded, request-driven batching being the natural default; this is a finding for phase 3 to absorb rather than a reason to revisit §2, and pass 1's capture at ingestion is unaffected either way.

A new probe was added for metering. Sites is in public beta with plan-specific usage limits that can prevent adding storage or keeping a site public, and a limit that binds at 10,000 items plus a few hundred megabytes of captures is not a degradation but a different host. It is a cost question, so the answer is the user's.

The blocker is narrowed to match: the surface has a name, and what is needed is confirmation that Sites is available on the user's plan.

## 2026-08-17 — Two decisions on the spike, and a drafted probe site

The app streams its own export rather than relying on a platform SQLite dump, to stay platform-independent, with the extra import work accepted. This is the largest single change the plan has had: spec.md §10's bulk-export row was "the hard requirement", the one row whose failure fails O7 outright and sends the whole thing back to §2, and any host that can run the app can run the endpoint. So the biggest risk in phase 0 was not mitigated, it was dissolved - by a choice rather than by a finding, which is worth recording as such. What remains is a milder question about how much one response can carry, and its failure is chunking rather than a wall.

The capture queue is driven by hand for now - an explicit "capture the gaps" action - with the per-request and open-tab drivers deferred. The reason is measurement rather than effort: automating first would hide whether pass 2 is worth having, which is the one thing §12 says should be measured rather than assumed. All three drivers call the same processor, so adopting another later is a caller change. Pass 1 is unaffected, being part of landing the pile rather than deferred work.

Both are recorded in decisions.md with their alternatives, and applied to spec.md §6, §9 and §10, to plan.md phase 0 and phase 3, and to host-spike.md. Phase 0's probe order changed with them: outbound HTTP now leads, being the only remaining row that can change the design, and the export probe follows it.

probe/ holds a drafted site implementing the probes - one HTML page with the layout probe as real DOM, and one server module for the rows that must run server-side. It was written from documentation and never run; it is meant to be handed to ChatGPT and corrected until it works. Both files parse. It prints a results table to paste back, and it is throwaway by construction, as phase 0 requires.

## 2026-08-17 — test-plan.md caught up with the two decisions

Both of the day's decisions landed in spec.md, plan.md and host-spike.md but not in test-plan.md, which still described §4.0's export row as getting rows "out of the host" and failing O7 outright - the exact framing the export decision removed. Three changes close it: §4.0 now leads with outbound HTTP and states the export row as a ceiling to be measured rather than a capability to be found, §4.3 gains a test that nothing drains the capture queue without being asked, and §5 pins both decisions against the changes most likely to undo them - a platform export that looks free, and an automatic driver added because the button is tedious.

Worth noting how this was found: two sessions worked this review round concurrently and produced the same conclusions, and the gap was in the one file neither had reached.

## 2026-08-18 — Choose the screenshot vendor for capture pass 2

No vendor is acceptable at present; pass 2 remains switched off. ScreenshotOne is the first candidate for a later bounded trial, subject to renewed approval and acceptance of target-URL logging.

## 2026-08-18 — ChatGPT Sites availability confirmed

The user confirmed that ChatGPT Sites is available on their plan and in this workspace. The permission blocker is removed from the host spike; the item is now actionable, while every capability and metering row still awaits the probe evidence in host-spike.md.

## 2026-08-18 — Run the phase 0 host spike and fill in spec.md's host table with evidence

Ran the owner-only ChatGPT Sites probe. Outbound HTTP, a 10,000-item export, identity headers, D1 owner scoping, secret custody, template cross-owner reads and the wide layout passed; recorded metering as a cost decision, deleted the throwaway probe, and made phase 1 ingestion actionable.

## 2026-08-18 — Build the first phase 1 increment: the data model and idempotent bookmark ingestion

Built the first phase 1 increment: a D1/SQLite schema, Netscape bookmark parser, narrow URL normaliser, idempotent merge pipeline, deterministic store adapter, fixtures, and six passing tests. Left the D1 adapter, upload/list surface, and 10,000-item sizing run as the next actionable increment.

## 2026-08-18 — Finish phase 1 with the D1 adapter, file upload and list surface, and 10,000-item sizing test

Finished phase 1 with an owner-scoped, bounded-batch D1 adapter; a 20 MB Netscape HTML upload endpoint; a responsive item-count/list surface; and an indexed generated sizing test that lands exactly 10,000 items. All 11 initiative tests pass. Added the blind virtualised grid as the next actionable phase.

## 2026-08-18 — Phase 2 - build the virtualised blind grid, verdict functions, undo, marked sets, and session-rate instrument

Built the responsive virtualised blind grid and session instrument. Fourteen Node tests and two browser tests pass across a generated 10,000-item pile; group verdicts undo atomically and verdicts patch cards without navigation. The several-hundred-item real blind baseline remains a separate data blocker, while metadata capture work is now actionable.

## 2026-08-18 — Phase 3 - build metadata captures, the stubbed pass-2 queue, and capture-gap controls

Built anonymous metadata capture, derivative-only R2 storage, hash-based duplicate detection, the explicit resumable pass-2 queue and capture-gap control. Twenty-one Node tests and three browser tests pass; the real-pile coverage and duplicate distribution remain a data measurement, and pass 2 remains switched off.

## 2026-08-19 — Phase 4 - build selection expressions, saved selections, proposals, mark-then-sweep, and atomic undo

Built the shared selection evaluator, saved selections, additive tag sweeps, same-site/folder/title proposals, visible mark-then-sweep, unopened-set confirmation, and one-action undo. All 29 Node tests and three browser tests pass, including a visible 3,000-item sweep.

## 2026-08-19 — Phase 5 - build selection export/import and the proposed-tags file round trip

Built the bookmark-sorter/v1 selection export and URL-keyed import for memory and D1 stores, plus read-only proposed-tag review grouped per tag and acceptance through the existing additive undo action; added hand-written fixtures and API/integration coverage.

## 2026-08-19 — Phase 6 - build identity, owner-scoped collections, and per-user demo copies

Added ChatGPT Sites identity, server-enforced owner scoping, one personal collection per user, cross-owner read-only demo templates, private copy/fresh-copy/rename/delete operations, capability-gated template editing, a collection menu, and collection-scoped capture statistics and gap processing. Added D1 indexes, two-user isolation tests, API coverage, and responsive browser checks.

## 2026-08-19 — Confirm that the workspace's Sites limits and cost are acceptable for the pile and capture store

Recorded approval of Sites costs and plan-specific limits for 10,000 D1 items and up to a few hundred MB of R2 captures.

## 2026-08-19 — Critique the six-phase local build and prepare its graduation or dormancy decision

Wrote critique.md: applied test-plan.md 4's own gate and found phases 2, 3 and 4 are code-complete but not exited, all three for the same reason - the three data blockers. Found the derivative-only image path has no implementation and neither of its two guards is exercised by any test; the app has never run on ChatGPT Sites, so identity is tested against a header we supply; pass 2 being permanently off makes an unmeasured fraction of blank cards a product fact; and O3's rate criterion is undefined rather than unmet, by design. Prepared the graduation-or-dormancy decision as four options with a recommendation and what would change it. 42 Node tests and 3 browser tests pass.

## 2026-08-19 — Assemble and deploy the private D1-only end-user test

Added the full-stack ChatGPT Sites wrapper, generated the final phase 1–6 D1
migration, and documented the first real-pile and selection sittings. Deployed
version 1 owner-only at [Bookmark Sorter Test](https://bookmark-sorter-end-user-test.ken-novak.chatgpt.site).

The first test Site deliberately provisions D1 without R2. Bookmark import,
private collections, verdicts, selections, undo, sitting rate and JSON export
are live; metadata images and the capture-gap pipeline remain off. This makes
the blind and selection measurements runnable without treating the open Sites
storage-cost question as accepted.

## 2026-08-20 — Repair collection rename and add verdict selectors

Replaced the unsupported browser prompt behind Rename with an inline form that
supports Save, Cancel and Escape. Added selection clauses for the five visible
verdict states: keep, junk, archive, needs time and untriaged. The in-page Help,
technical documentation, evaluator tests, API tests and browser coverage now
describe and exercise both changes.

## 2026-08-20 — Measure the blind triage baseline on several hundred real bookmarks

Withdrawn, not performed. Reclassified as an optional observation in notes.md (decisions.md, 2026-08-20): the throughput numbers are already instrumented in triage_sessions and accrue from ordinary sittings, so this never needed a staged blind sitting and was not blocking anything. The spec.md throughput target stays unset until someone reads them.

## 2026-08-20 — Measure confirmation interruptions and immediately undone sweeps in one real selection sitting

Withdrawn, not performed. Reclassified as an optional observation in notes.md (decisions.md, 2026-08-20). Sweeps applied and immediately undone are already recorded via triage_actions.undone_at; selections opened and confirmations shown are not persisted and would need two counters, to be added only if the undo signal is ambiguous without them.

## 2026-08-20 — Measure metadata coverage and the duplicate-image distribution on a representative real pile

Superseded by enable-captures-and-measure, not performed. The blocker was misdiagnosed as data: the code already computes these numbers and GET /api/items already returns them; what was missing was the R2 bucket the capture pipeline needs. The user granted that on 2026-08-20 (decisions.md), so this is ordinary work rather than a question.

## 2026-08-20 — Provision the R2 capture bucket, turn on pass 1, and record the coverage and duplicate-image numbers

Provisioned R2, enabled repeatable pass-1 catch-up, deployed Site version 15, and measured 698 distinguishable metadata images across 1,201 bookmarks (58.1%). The largest duplicate-image group was 11, so the threshold remains 30 and pass 2 remains off.

## 2026-08-21 — Choose whether to graduate the live Bookmark Sorter or make the initiative dormant

Proposed graduating the live owner-only Bookmark Sorter to refining, recording the external Site and leaving pass 2 off; merging this PR would enact the recommendation.

## 2026-08-21 — Write a user-facing README covering how to use it and how to deploy it

Added a user-facing README with private-data cautions, import and triage guidance, selection grammar, backup steps, and the full-stack Sites deployment path.

## 2026-08-21 — Add collection and selection export controls

Added an Export section beside Import. It downloads either the active
collection or the open selection as `bookmark-sorter/v1` JSON with tags and
verdicts. Import now accepts that JSON text file directly as well as browser
bookmark HTML, closing the already-tested portable round trip in the visible
interface.

## 2026-08-21 — Add selectable page layouts

Added a Page layout selector for 3 × 3, 2 × 6, 2 × 8 (the default), and 3 × 12
wide grids. Changing the selection redraws the current page immediately while
preserving the compact tablet and phone layouts.
