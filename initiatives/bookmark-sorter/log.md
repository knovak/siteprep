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
