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

1. **A pile can be brought in without loss.** Bookmarks are ingested with title,
   link, and date intact, and every item carries tags recording where it came
   from and when it arrived — so a later import can never be confused with an
   earlier one.

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
   form another system could read. Nothing is trapped.

## Explicitly not the first version

The wish marks two capabilities as extensions, and they stay out until the core
above works:

- **Harvesting open tabs from other devices** — Safari on iPhone, Chrome on
  iPad, and so on.
- **Pushing subsets back out** — creating browser tab groups, or a folder of
  fresh bookmarks, from a tag-selected subset.

Both are worth doing and both are what makes the tool feel finished. Neither
makes triage faster, so neither belongs in the first version. The wish also
notes they may arrive *"initially or exclusively through an LLM agent"*, which
is a real option and should be weighed in `spec.md` rather than assumed away.

## How we will know

- A real backlog of several hundred bookmarks can be taken from untriaged to
  fully triaged, and the time it took is known.
- The rate is fast enough to be worth it — a target to be set in `spec.md`, once
  there is a measured baseline to argue from. Setting it now would be a guess
  dressed as a requirement.
- After a full pass, the keepers can be exported and opened somewhere else.

## Decisions this raises

Drafting these surfaced questions the wish does not settle, and that should not
be settled by whoever writes the spec:

1. **Where does this run?** A local script, a web app, a browser extension, or
   something hosted. This decides nearly everything downstream — how bookmarks
   are read, what "a database appropriate to the platform" means, and whether
   harvesting other devices is even possible later.
2. **Where do page snapshots come from?** Live-fetching and rendering hundreds
   of pages is a different project from using whatever thumbnail or favicon is
   already available, or from capturing snapshots at ingestion time. Objective 4
   depends on this, and it is the largest unknown here.
3. **How big is the real pile?** Hundreds and tens of thousands are different
   problems for clustering and for storage.

These are recorded as blocked items in `initiative.json` rather than answered
here.
