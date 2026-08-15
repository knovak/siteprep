# Log

## 2026-08-15 — Draft objectives.md - what "done" would mean

Drafted objectives.md from the wish: eight outcomes, all subordinate to getting to a short list of keepers faster than reading the newsletters would.

The finding that shapes the rest: the three newsletter densities the wish names are three different extraction problems, not three sizes of one. A link list and an annotated digest both yield a story per link; a long-form Substack column does not, and the naive rule turns one column into thirty footnote-sized junk items. So the unit of harvest is a per-newsletter decision, and 'the long-form shape produces one story' is recorded as the sharpest test that extraction works.

Two questions the wish does not settle are recorded as blocked items rather than answered: whether this runs as agent skills or as a website (the wish raises it and it decides nearly everything downstream), and which newsletters are in scope with how their emails are recognised (a fact only the mailbox has).

Two more are left to the spec rather than raised as blockers: how much triage machinery is shared with the bookmark sorter, whose grid and verdicts are close cousins of objectives 5 and 7, and what 'closely related' has to mean for the paraphrase-merging in objective 6.

## 2026-08-15 — Proposed an answer: does this run as agent skills, or as a website?

Proposed, not decided: skills over the mailbox for the harvest, a generated page
for the review. Recorded in decisions.md with the four options and what would
make a different one correct.

The argument is that this is two problems wearing one name. Harvesting is
judgement - a long-form column has to yield one story rather than thirty
footnotes - which is model work and belongs in a skill. Reviewing is throughput,
and a few hundred keep-or-drop calls made by conversation is slower than reading
the newsletters would have been, which is the failure objective 7 exists to
prevent. A website answers the second well and pays for the first twice, plus a
stored Gmail credential nothing in the wish asks for.

Unblocks draft-spec if merged. Leaves the store's actual form to the spec, and
leaves newsletter-inventory blocked on the user either way.

## 2026-08-15 — Review round on the proposal: C, with D as a standing fallback

The user answered on the pull request: C, with a note that D can be adopted if
the bookmark sorter's web app ships first and its grid generalises. Rewrote the
decisions.md entry from a proposal into the decision it now is, in their words,
and made the fallback a section of its own rather than a line in a list of
things that would change the answer - it is a route to take, not a risk to
watch.

The fallback carries one constraint into the spec: the store is the durable
thing and the generated page is disposable, so moving review into the bookmark
sorter later is a change of surface rather than a rewrite.

## 2026-08-15 — Draft the story record - the fields a harvested story must carry, and what makes two stories the same one

Drafted story-record.md: the fields a story carries, why the extraction shape is stored rather than inferred, the three separate senses of 'the same story' and which two are decidable, and the link unwrapping that identity depends on.

## 2026-08-15 — Review round on the story record: tags, open vocabularies, many harvesters

Five review comments, all revisions, and they pull in one direction: fewer fixed
schemas.

Themes became tags. There is no theme field and no theme table - a theme is a tag
by the convention theme:<name>, in the same set as anything else worth selecting
on. Grouping and correcting are then the same operation, and whatever writes tags
can group stories. It also matches the bookmark sorter's flat free-string tags,
which matters because that app is the standing fallback for review.

Verdicts became an open vocabulary, so archive or to-be-shared can be added as
configuration rather than a migration. Two rules keep it honest: a story still
has exactly one verdict or none, which is what makes the backlog count mean
something, and a reader that does not recognise a verdict must round-trip it
rather than blank it.

The larger change is that the store has many producers. Any number of skills may
harvest into it, so the record carries harvester alongside source, shape is open
for a harvester that meets material the three shapes do not describe, and how a
long-form column becomes one story is the harvesting skill's business rather than
something this document prescribes. Identity is what makes that safe: url_key is
the cross-source key, so the same article arriving through two different skills
still merges. One rule added - a harvester never writes a verdict, because a
record that arrives pre-judged shrinks the backlog objective 7 counts.

Cross-newsletter merging is settled as happening at harvest: the reader never
spends a decision on duplicates, and merged_from keeps it inspectable.
