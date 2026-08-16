# Objectives

What "done" would mean, derived from the wish. Outcomes, not implementation —
how any of this is built belongs in `spec.md`.

## The point

**Turn a bookmark pile that is too big to face into a pile worth keeping.**

The wish names the priority explicitly: *"Most important is to pick keepers vs
junk vs archive vs needs-more-time."* Everything else — ingestion, tags,
clusters, snapshots — earns its place only by making that decision faster. An
objective that does not serve triage throughput is not an objective for this
initiative.

That framing matters because the obvious failure mode is building a bookmark
*manager*: a tidy, tagged, searchable library that is still never read. The
measure of success is how much of the pile gets resolved, not how well it is
organised.

## Done means

Numbering is stable: the objectives added by the wish's amendment are appended
rather than inserted, because `decisions.md` argues about several of these by
number and quietly renumbering them would invalidate that record.

1. **A pile can be brought in without loss.** Bookmarks are ingested with title,
   link, and date intact, and every item carries tags recording where it came
   from and when it arrived — so a later import can never be confused with an
   earlier one. **Structure the user already made is part of what must not be
   lost**: a browser export's folder path arrives as a tag, so the shelves
   somebody spent years building become selectable by exactly the same mechanism
   as everything else, rather than a hierarchy the tool has to model separately.

2. **Every item can be given a verdict, and the verdict is the unit of
   progress.** Each item ends up as *keeper*, *junk*, *archive*, or
   *needs-more-time*. Items with no verdict yet are the backlog, and the system
   can always say how large it is.

3. **Triage is fast enough to do in a sitting.** A screenful of items can be
   judged without leaving the keyboard or scrolling away, and a full screen is
   presented at a time — roughly 8×2 on a wide display, fewer on a tablet, a
   carousel on a phone.

4. **Seeing an item does not require remembering it.** Each item shows enough —
   a page snapshot, its title, its tags — to be judged on sight. This is what
   makes 3 possible; a list of URLs is not triageable at speed.

5. **Related items can be judged together.** Items can be gathered into clusters
   automatically, or by the user selecting on tags — a boolean expression, or a
   pattern match. Judging fifty near-identical links as one group is the
   difference between an afternoon and a month.

6. **Tagging is part of triage, not a separate chore.** Tags can be added during
   a pass, at the same speed as the verdicts, and items can be tagged by topic,
   by site, or by kind of page.

7. **The results are the user's, and portable.** Verdicts and tags persist in a
   store suited to wherever this runs, and can be backed up and exported in a
   form another system could read. Nothing is trapped. Concretely, an export is
   JSON carrying items with their tags and verdicts, a subset can be chosen by
   tag rather than all-or-nothing, and an export file can be **imported back**
   into a collection — so the round trip, not just the download, is what makes
   the data portable. It carries no page captures; those are a rebuildable
   convenience, and the judgement is what must not be trapped.

8. **Items live in a collection, and a collection has an owner.** More than one
   person may use this, so the work is always happening *in* a named collection
   that can be chosen, imported into, and exported from. A collection is private
   to its owner, and a tester who needs something to look at receives their own
   copy of a demo collection rather than sharing anyone's. Everything above is
   scoped by this: a verdict, a tag, and a backlog count all belong to one
   collection.

## Explicitly not the first version

Three capabilities are real, expected, and deliberately later. The wish marks
the first two as extensions:

- **Harvesting open tabs from other devices** — Safari on iPhone, Chrome on
  iPad, and so on.
- **Pushing subsets back out** — creating browser tab groups, or a folder of
  fresh bookmarks, from a tag-selected subset.

Both are worth doing and both are what makes the tool feel finished. Neither
makes triage faster, so neither belongs in the first version. The wish also
notes they may arrive *"initially or exclusively through an LLM agent"*, which
is a real option and should be weighed in `spec.md` rather than assumed away.

The third comes from a decision rather than the wish:

- **A general sharing scheme** — owners, explicit readers, and revocation, so a
  collection can be shown to a named person. Deferred on 2026-08-14 in favour of
  seeding demo collections as per-user copies, with the user's *"plan to have a
  general sharing scheme for a later revision."*

The distinction matters more here than for the other two. Sharing is **planned,
not merely possible**, and building it later is only cheap if the first version
does not make it expensive. That puts one live constraint on the spec: *do not
let "owner" become the only way an item is reachable* — a collection's identity
should be separable from the single user attached to it, so a reader list can be
added without rewriting every query. That costs nothing now, and it is the
difference between adding sharing and retrofitting it.

## How we will know

- A real backlog of several hundred bookmarks can be taken from untriaged to
  fully triaged, and the time it took is known.
- The rate is fast enough to be worth it — a target to be set in `spec.md`, once
  there is a measured baseline to argue from. Setting it now would be a guess
  dressed as a requirement.
- After a full pass, the keepers can be exported and opened somewhere else.
- **A collection survives a round trip.** Exported and re-imported, it comes back
  with the same items, tags and verdicts — this is the test objective 7 actually
  makes, and the one a download-only export would pass without meaning anything.
- **A tester can be handed something to use.** They sign in, receive a seeded
  demo collection of their own, and triage it without touching anybody else's.

## Decisions this raised, and where they landed

Drafting these surfaced five questions the wish does not settle. All five are
now answered, in `decisions.md` — the reasoning lives there, and this list is
only a map to it. Nothing here is still waiting on the user.

1. **How big is the real pile?** 5,000–10,000 items. Big enough that clustering
   (objective 5) is the mechanism rather than a convenience, and that anything
   slow and per-item is an afternoon of work, not a detail.
2. **Where does this run?** A web app, most likely hosted on an OpenAI site with
   its database. Chosen for objectives 3 and 4 — the screen-filling grid across
   three form factors — at the known cost of being the weakest option for the
   two extensions above.
3. **Where do page snapshots come from?** Captured at ingestion: Open Graph
   metadata for the majority, a paid screenshot API for the items where that
   produces nothing or a shared site banner. Anonymous, downscaled, cached by
   URL, never refreshed on view.
4. **How are collections identified and protected?** Signed-in accounts, with
   collections owned and private by default.
5. **What makes a collection non-personal?** Nothing does, for now — demo
   collections are seeded per-user copies, and general sharing is held back as
   above.

What remains is a constraint rather than a question, and it belongs to the spec:
whether the OpenAI surface chosen can actually supply the identity objective 8
assumes, and let the data back out for objective 7. Both were settled *on the
presumption* of that host, so both follow it if it changes.
