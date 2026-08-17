# Decisions

Questions this initiative was waiting on, and how they were settled. Newest at
the bottom. Written so a later reader — including a later version of us — does
not re-argue something already decided.

## 2026-08-15 — Does this run as agent skills, or as a website?

**Agent skills over the mailbox for the harvest, a generated page for the
review** — option C below.

The user's words, answering the sweep's proposal on review: *"Decision: C, with
simple note that if the bookmark sorter's web app ships first and its grid
generalises then D can be adopted"*. The fallback is theirs and is kept as a
standing one, not a hypothetical — see below.

The question, as `objectives.md` recorded it, comes from the wish itself: *"This
entire process might run through codex skills rather than a freestanding
website. That would allow the skills to do some of the harvesting and
paraphrasing."*

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. Agent skills, end to end** — a skill reads the mailbox, extracts stories, groups and paraphrases them, and writes out a page; verdicts are given by talking to the skill | Nothing to host, nothing to authorise beyond a mailbox connector that already exists. The two genuinely hard parts — deciding what one story is in three different newsletter shapes, and paraphrasing several stories into one — are model work, which is what a skill is. Runs today | Objective 7 is the weak spot: dropping, keeping and emphasising a few hundred stories by *conversation* is slower than reading the newsletters would have been, which is the one thing the objectives say must not happen. No place for a backlog count to live between runs |
| **B. A website with its own store** — a server holds Gmail credentials, ingests on a schedule, keeps stories in a database, and serves the review UI | The strongest answer to objectives 5 and 7: a real UI for expand/collapse, reordering, and one-keystroke verdicts, with state that survives the tab. Publishing (objective 8) is a page it already knows how to render. Reachable from a phone | Everything the wish did not ask for: hosting, sign-in, and a stored Gmail refresh token for a personal mailbox — the heaviest liability in the whole design, held permanently so that it can read mail that a human could have handed over. The extraction and paraphrase work still needs a model, so the server ends up calling one anyway; the website adds a second system rather than replacing the first |
| **C. Skills harvest, a generated page reviews** *(chosen)* | Splits the problem where its two halves actually differ. The mailbox and the model work stay in a skill, so no server ever holds mail credentials. Review is a self-contained HTML page — expand/collapse, sort, and verdict buttons are ordinary DOM, and objective 5 is met by a page rather than by a conversation. Verdicts come back as a file the skill folds into the store, so re-running a harvest sees what was already judged | Two artefacts to keep agreeing with each other, and the verdict round-trip is the fiddly part: a page that exports and a skill that imports is more moving parts than a database write. Not multi-device — the page and its store live wherever the skill ran |
| **D. Skills harvest, the bookmark sorter's web app reviews** *(the standing fallback)* | Objectives 5 and 7 here are close cousins of that initiative's grid and verdicts; one triage surface for both piles means building it once and getting the phone case for free | That app does not exist yet. It couples two initiatives before either has run, and it inherits an ingestion and collection model built for bookmarks — items that arrive discrete, which is precisely what a harvested story is not |

### Why C

This initiative is two problems wearing one name, and they want opposite things:

- **Harvesting is judgement.** `objectives.md` puts the hard case first: a
  long-form Substack column has to yield one story, not thirty footnotes, and
  the unit of harvest is a per-newsletter decision. That is model work, and a
  skill is the cheapest possible place to put it.
- **Reviewing is throughput.** Objective 7 asks that every story end up dropped,
  kept, or emphasised, *fast enough to keep up with reading*. Conversation is a
  poor instrument for a few hundred small identical decisions; a page with
  buttons is a good one.

Option A is strong on the first and fails the second. Option B is strong on the
second and pays for the first twice — a server that still has to call a model,
plus hosting and a stored mail credential nobody asked for. C takes each half
from the option that is good at it.

The credential point is worth stating on its own, because it is the part that is
hard to reverse. A website with its own store needs long-lived OAuth access to a
personal Gmail account, sitting on a server, so that it can re-read mail on a
schedule. A skill reads the mailbox while a human is present and keeps nothing.
Since `objectives.md` already rules out writing back to the mailbox, the whole
mail relationship can stay read-only and session-bound — and that is worth more
here than scheduled ingestion, which nothing in the wish asks for.

### The standing fallback: D, if the bookmark sorter's grid generalises

**If the bookmark sorter's web app ships first and its grid generalises, adopt
D** — move review into that app rather than building a second review surface.

So C is a staging post, not a dead end, and that puts one constraint on the spec:
**the store is the durable thing and the page is disposable.** Stories, themes
and verdicts live in a plain, portable form that another surface could read, so
moving review into the bookmark sorter is a change of surface rather than a
rewrite. Nothing in the first version should assume the generated page is the
only thing that will ever read the store.

Note that this is a fallback the user can take at any time, not a condition to
be waited on: harvesting stays in a skill under both C and D, so the work done
now is not what gets thrown away.

### What would reopen this

- **Triage has to happen on a phone, or away from the machine that harvested.**
  C's single-machine store is then the wrong shape, and B or D is required
  rather than optional.
- **Verdicts must be shared with anyone else.** C assumes a single reviewer.
- **Reading a month of newsletters from a skill turns out to be unreliable** —
  rate limits, attachment-heavy issues, or a connector that cannot search well
  enough to make a harvest repeatable (objective 1). That failure argues for B,
  which can ingest slowly in the background and retry, and is the one route that
  D does not cover.
- **The volume is smaller than assumed.** If a week's harvest is tens of stories
  rather than hundreds, A is enough and the generated page is over-building.

### What this settles, and what it does not

- **Settled**: no server holds Gmail credentials; harvesting, extraction and
  paraphrase are skill work; review is a generated page rather than a
  conversation, and moves into the bookmark sorter's app if that ships first.
- **Not settled**: what the store actually is — a file, SQLite, or something
  else — and where it lives. A spec question, constrained only to being plain
  and portable enough for another surface to read.
- **Not settled**: where published HTML is hosted. `objectives.md` already holds
  "publication as an OpenAI site" out of the first version, and this answer does
  not disturb that.
- **Unaffected**: `newsletter-inventory` stays blocked on the user either way —
  which senders count and how far back a harvest reaches is a fact about the
  mailbox, not a consequence of the runtime.
- **Unblocks** `draft-spec`, which was waiting on this to write its alternatives
  section. Most of the table above is the raw material.

### Questions this raises, deliberately not answered here

- **How do verdicts get back into the store?** An exported file the skill reads,
  or the page writing directly to a local store. The fiddly part of C, and a
  spec question rather than a decision.
- **Does the harvest run on demand, or on a schedule?** C makes on-demand the
  natural answer; nothing in the wish requires a schedule, but it has not been
  ruled out.

## 2026-08-17 — Phase 0: what the mailbox connector can actually do

**It reaches.** The Gmail connector available to a skill searches by
from-address, by Gmail label and by date range, takes several matchers as a
union in one query, and returns a message body the extractor can read. §14's
first row is answered with observation rather than expectation, and `plan.md`
§3's phase 0 exits.

This is a findings entry rather than a choice between options. The question was
never *which* connector — there is one — but whether the shape §5.1 assumed is
the shape it has. Two of the four observations came back better than expected
and two brought conditions the later phases have to carry.

### What was asked, and what was observed

`test-plan.md` §4.0 names four observations. All four were run read-only against
the user's own mailbox — search and read, nothing written, nothing labelled,
nothing kept beyond the notes below.

| Observation | Result | What was run |
|---|---|---|
| Search by **from-address** over a date range | **Works.** Five issues of one daily newsletter, every one inside the range and from that sender | `from:<sender> after:2026/08/01 before:2026/08/09` |
| The **message body** comes back readably | **Works.** Plain text, links inline, no HTML needed | `get_thread(messageFormat: PLAIN_TEXT)` |
| Search by **Gmail label** | **Works, by display name** | `label:<display-name>` |
| **Several matchers union** | **Works, in one query.** Two senders and a label, nine messages, the date range applied to the union rather than to one arm | `{from:a from:b label:c} after:… before:…` |

The union is the one §4's `match` field depends on and the one most likely to
have disappointed. It did not: Gmail's `{…}` groups the arms and the range
outside the braces applies to all of them, so an inventory entry with a sender
*and* a label costs one search, not two searches and a merge. `plan.md` §3's
"what a failure here means" paragraph — the client-side date filter, the fall
back to §2 — is not needed.

### The four conditions that came with it

Each of these is a fact about the connector that a later phase would otherwise
discover the expensive way.

1. **`from:` ignores the plus-tag, so a sender matcher over-matches.** Searching
   `from:name@substack.com` returns mail from `name+section@substack.com` as
   well — on Substack these are *different publications* with different shapes.
   §4's `key` is "written to `source` on every record", so an over-matching
   matcher silently files two newsletters under one source and the identity of
   `(source, issue_date, url_key)` inherits the error. **Phase 3 must verify the
   actual From address against the matcher after the search**, and treat the
   search as a pre-filter rather than as the answer. Cheap now; a re-harvest
   away from a migration once records exist.

2. **The date range is half-open, in local dates.** `after:D before:D` returns
   nothing; a single day D is `after:D before:D+1`. §5.1 requires an explicit
   range, so this is a documentation fact rather than a hazard, but "the range
   the user typed" and "the range the connector applied" differ by a day at the
   top end and the run record should write the resolved one.

3. **Every link in a Substack issue is wrapped, and the wrapper carries a
   recipient token.** Links arrive as
   `https://substack.com/redirect/<uuid>?j=<token>`, where the token is a signed
   blob identifying the subscriber, and the publisher URL is **not recoverable
   from the string** — the uuid is opaque. Two consequences, and the second is
   the sharper one:
   - This shape needs `story-record.md` §4's *optional single HEAD follow*, not
     the unwrap table, which settles nothing about whether the follow is on by
     default but does say that for at least one major sender the table alone
     cannot unwrap. `plan.md` §6 leaves that open on the phase 6 merge rate;
     this is a second input to it.
   - **The token must never be stored.** It identifies the recipient, it would
     travel into `url_key` and therefore into §12's published page, and it is
     exactly the class of thing §6 says the design keeps nothing of. Phase 1's
     normalisation should drop the whole query string of an unwrappable
     redirector rather than only the `utm_*` family, and mark it unwrapped.

4. **Result counts are not to be trusted, and paging is the only honest count.**
   `resultCountEstimate` was exact on small result sets and returned a flat
   `201` on every large one. §5.2's run record reports issues per source, so it
   must count what it paged rather than what the search claimed. Page size is
   capped at 50.

Two smaller notes, recorded because they cost nothing here and an afternoon
later: an empty result comes back as an empty object with no `threads` key at
all, and archived mail is searched by default, which is what the harvest wants
since a newsletter read a year ago is not in the inbox.

### What this settles, and what it does not

- **Settled**: the §2 seam's Gmail implementation is a thin one. Search takes a
  Gmail query string built from an inventory entry's matchers; read takes a
  message id and returns plain text. Nothing in phases 1–5 has to bend around a
  connector limitation, which is what `plan.md` §1's rule 1 was betting on.
- **Settled**: label matchers are usable, so §4's `match` union is a real
  feature rather than half of one.
- **Not settled**: whether the HEAD follow is on by default. Phase 6's merge
  rate still decides it (`plan.md` §6); condition 3 only establishes that the
  table cannot carry Substack on its own.
- **Not settled**: anything about *which* senders are in scope.
  `newsletter-inventory` is untouched by this and stays a `data:` blocker — the
  probe deliberately asked what the connector can do, not what is in the
  mailbox.
- **Changes phase 1**: normalisation drops the full query string on an
  unwrappable redirector (condition 3), which is a `redirectors.json` case to
  fixture rather than a new mechanism.
- **Changes phase 3**: the From address is verified after the search
  (condition 1), and the run record writes the resolved date range
  (condition 2) and a paged count (condition 4).

**No mailbox content is recorded here or anywhere in this repository** — no
sender addresses, no subjects, no message ids, no body text. §4 already keeps
the inventory out of the repo on the same grounds: it names a person's mailbox.
The probes are reproducible from the query shapes in the table above against any
mailbox that receives a newsletter.

## 2026-08-17 — Phase 1: four things the store had to settle that the spec left open

`plan.md` §4 asks each phase to record what it settled rather than bury it in a
constant. Phase 1 settled four, and the first two are the kind that cannot be
revisited once records exist.

**Ids carry the rule that made them** — `u1-` for `(source, issue_date,
url_key)`, `a1-` for `(source_doc, source_anchor)`, then a truncated SHA-256 of
those inputs. `plan.md` §3 already said a change to identity does not migrate;
the prefix is what makes such a change visible in the data instead of something
a later reader infers from a pile of duplicates. Four characters, once.

**An id is assigned at first write and never re-derived.** After a case 2 merge
the surviving record's `source` and `issue_date` move to the earlier issue's, so
re-deriving would silently invalidate every reference to the old id — a verdict
file, a `merged_from` entry elsewhere. Instead the absorbed id stays in
`merged_from` and the store's index resolves it to the survivor. Both sides'
derived ids therefore land on the same record, which is what makes a merge
idempotent rather than a source of duplicates on the next run, and it is the
reading of `test-plan.md` §4.1's "every merge is recoverable from `merged_from`
alone" that the code implements: a hash is not invertible, so what recoverable
can usefully mean is that the absorbed identity still resolves.

**The sources a merge keeps are kept as `source:` tags**, not as a new field.
`story-record.md` §1.1 already names the source as a thing tags are for, and a
second source field would be one more thing every reader of the store has to be
taught — including, under the standing fallback, the bookmark sorter's importer.

**An unwrappable redirector loses its whole query string.** Stricter than
`story-record.md` §4's "kept as-is", and the reason is phase 0's condition 3:
those query strings hold a recipient identifier, and §6 is what makes §12's
published page safe. The cost is that such a link may not resolve when clicked,
which is a further input to `plan.md` §6's open question about the HEAD follow —
it is no longer only about the merge rate, because for these senders it is also
the difference between a working link and a marked one.

### What this leaves open

- **Whether case 2 should be strictly cross-source.** The code merges on
  `url_key` whatever the source, so one newsletter linking an article in two
  issues also merges. Same reader question, same single answer — but
  `story-record.md` §3 says "from two sources", so this is a reading rather than
  the letter. A one-line change if the letter was meant.
- **The HEAD follow's default**, still `plan.md` §6's, still decided by evidence
  that does not exist until phase 6.
