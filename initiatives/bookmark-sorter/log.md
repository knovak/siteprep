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
