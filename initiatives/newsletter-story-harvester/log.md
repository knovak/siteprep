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

## 2026-08-15 — Draft spec.md, including alternatives considered for the runtime and for how each newsletter shape is turned into stories

Drafted spec.md: the harvest is a skill, the store is a JSON file the skill alone writes, the review page is generated and disposable, and verdicts come back as a small exported file.

Both alternatives sections the item asked for are in it. The runtime one condenses the settled decision. The second is the initiative's own hard problem and was not settled anywhere: how each newsletter shape becomes stories. Chose to declare the shape per source in the inventory and let the model extract under that shape's contract - so the model does the reading but not the deciding, which is the split the objectives implied without naming. The alternatives it beats are a universal every-link-is-a-story rule, a parser per newsletter, and an unguided model; all three either make the unit decision in the wrong place or make the long-form failure invisible.

The long-form failure is now observable rather than merely predicted: a contract carries an expected story count, a long-form source yielding more than one story is reported by name, and the declared shape may be overridden per issue for the author who writes a roundup some weeks.

O1's repeatability is met at the level of identity rather than of text, since a model does not produce the same words twice: identity is structural, first write wins, and re-extraction is an explicit action.

Also settles what the store is and where it lives (a JSON file outside this repository, since it holds a person's mailbox material), that harvests run on demand because a schedule would need the credential the runtime decision exists to avoid, what closely related means for objective 6 (a cluster is a tag, erring toward proposing because nothing is destroyed), and the three questions story-record.md left open. Records that the bookmark sorter shares data conventions with this and no code.

## 2026-08-15 — Review round on the spec: a diagram, a tagging skill, store import, tag alignment

Four review comments, and three of them pull in one direction: the store is the
interchange point, so specify what else can arrive at it.

Added a diagram of the chosen scheme (§1.1) - mailbox, inventory, harvesting
skill, store, review page, published page, verdict file. Two things it is drawn
to make obvious: every arrow into the store starts at a skill, and the mailbox
appears once with nothing flowing back to it.

Anticipated the tagging skill as §10.3 - a later pass that reads the whole
store and proposes themes and clusters with a model's judgement. Named
separately from the harvest because it has different information: a harvester
sees one issue, a pass over the store sees everything, which is the only
position from which "these nine stories are one category" is a judgement rather
than a guess. The first version owes it a readable store, open tags, and tags
that carry no origin - all of which were already there for other reasons.

Specified store export and import as §7.1. Export is a copy, and the operation
exists only to take a subset. Import is the harder half and the answer is that
it is not a new mechanism: it is the harvest merge with records as input
instead of emails, so the story-record identity rules do the work. Import never
deletes, and reports what it merged.

Aligned the tag format with the bookmark sorter deliberately (§13.1), as a
binding table rather than a sentiment, since adopting its boolean selection
language later is expected. The consequence worth having: this page's filter
must be a subset of that expression language, so adding and/or/not later is
reach rather than migration.
