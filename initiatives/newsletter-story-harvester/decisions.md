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

## 2026-08-18 — Phase 2: which decision the model is allowed to make, in code

`spec.md` §3's option D is "the shape is declared, the model reads within it".
Building it forced that into something more specific, and the specific version
is the one worth recording: **the model returns a link *index*, never a URL and
never an anchor.**

The document owns the link positions, the heading paths and the text
(`src/html.mjs`); the model chooses which of those links are stories and writes
the blurb or the summary. Everything a record's identity depends on is therefore
computed from the bytes of the issue, which is what §3.3 requires and what a
reply carrying hrefs would have quietly broken — one mis-copied character in a
URL is a new `url_key`, a new id, and a duplicate that no test would catch.

### Three structural guards, and why they are not the model's job

Under option D the model does the reading, so on paper every one of these is a
prompt problem. They are in the harvester anyway, and the reason is
`test-plan.md` §3's: *the chrome is in every issue, so a contract that only
meets it in a hard case has the difficulty exactly backwards.*

- **Chrome is refused** — unsubscribe, preferences, `mailto:`, and any link under
  a heading matching sponsor / advertisement / *together with*. A backstop, not
  the mechanism: refusals are counted per issue, so a prompt that starts
  returning the footer shows up as a number rather than as a page of junk.
- **A link inside a heading is refused on `link-list` and accepted on
  `annotated-digest`.** The same structure means opposite things in the two
  shapes — a section heading in one, an item's own title in the other — which is
  why it is a per-contract field rather than a global rule.
- **A verbatim blurb that is not in the issue is refused, and the story is
  dropped.** This is the one place phase 2 is stricter than §3.2's "flag, never
  suppress", and the distinction is deliberate: a count anomaly means real
  stories and a suspicious number, while an unverifiable blurb means the text a
  reader would judge on was not written by the source. §3.1 forbids inventing
  text outright, the link is still recoverable from `source_doc`, and the
  refusal is named in the report. Alternative considered and rejected: keep the
  story with an `err:text` tag, which puts fabricated prose in front of the
  reader in exchange for a link the next run re-harvests anyway.

### What this leaves open

- **The chrome patterns are English and are ours.** They cost nothing and catch
  the case in bulk; a sender whose footer says something else is caught by the
  model instead. The refusal counts are what would show this failing.
- **Whether the strict reply parser is too strict.** A finding with an unknown
  field is refused outright rather than trimmed. Cheap to relax, and the
  argument for keeping it is that a model doing something the contract did not
  ask for is a finding about the prompt.

## 2026-08-18 — A long-form issue's second story needs an anchor of its own

`spec.md` §3.1 gives a long-form story the anchor `document`, and §3.2 says a
long-form source yielding more than one story is the loud case, reported first
and by name. **Implemented literally, those two cancel out.**

Every finding takes the same anchor, so every finding after the first collides
on identity and is refused as a duplicate — the yield is 1 however many came
back, the band is never exceeded, and the loud case can never fire. The
pipeline would silently swallow precisely the failure `objectives.md` calls the
sharpest test. It was found by writing the test for the loud case and watching
it not fire.

**So the extras are disambiguated**: `document` for the first story,
`document#link:<n>` for any later one that names a link, `document#<n>` for one
that does not. The stories are written, the band flags them, and the loud case
reports the source and the issue by name.

The cost, recorded rather than absorbed: an extra's identity is only as stable
as the reply's ordering when it names no link. That applies solely to a case
that is already flagged as a broken extraction — and a flagged story a person
will look at is worth more than a stable id for a story nobody will see.

`spec.md` §3.1's anchor row should say so, since read alone it specifies a
pipeline in which §3.2's loud case is unreachable.

## 2026-08-18 — Phase 2: the count bands, measured

`test-plan.md` §4.2's measured row, against the fixtures and their recorded
replies (`work/measure-bands.mjs`):

| Issue | Extracted as | Links | Findings | Stories | Refused | Band |
|---|---|---|---|---|---|---|
| `link-list-typical` | `link-list` | 46 | 45 | 40 | 5 | 10–60 |
| `link-list-headings` | `link-list` | 15 | 14 | 13 | 1 | 10–60 |
| `annotated-digest-typical` | `annotated-digest` | 9 | 8 | 8 | 0 | 3–15 |
| `long-form-citations` | `long-form` | 27 | 1 | 1 | 0 | 1 |
| `long-form-roundup` | `long-form` | 14 | 1 | 1 | 0 | 1 |
| `long-form-roundup` *(override)* | `link-list` | 14 | 12 | 12 | 0 | 10–60 |
| `empty-issue` | `link-list` | 1 | 0 | 0 | 0 | 10–60 → **under** |

**§3.1's first-cut bands are kept unchanged**, and the honest reason is that
this measurement cannot move them. The fixtures were composed rather than
derived from real issues — there is no mailbox yet — so a band fitted to them
would be a band fitted to what we imagined a newsletter looks like.
`test-plan.md` §2.2 is explicit that a fixture written by whoever wrote the
contract tests the contract against its own assumptions, and that is the state
this measurement is in. **The bands are decided by phase 6**, against real
issues, and this table is the before.

What the table does establish is the pipeline: the band is computed on stories
*kept*, not findings *returned*, so an issue whose reply was mostly chrome
counts as the small yield it really was. And the empty issue flags `under`
rather than passing quietly, which is the behaviour §5.1 wants for a message
that matched and produced nothing.

### What this leaves open

- **The eval score per contract**, which is the other half of `test-plan.md`
  §4.2's exit and needs a live model rather than a recording. Recorded as its
  own todo item (`eval-contracts`) with the rubric to score against, because a
  measured row that quietly does not happen is how §2.1's warning comes true.
- **Fixtures derived from real issues.** They arrive with the inventory, and
  until then the adversarial cases are as adversarial as we could imagine rather
  than as adversarial as a mailbox is.

## 2026-08-18 — Phase 2: the live contract eval, and the singular reply that does not parse

The live baseline used `gpt-5.6-sol` with no reasoning pass. Each call received
the exact request produced by `buildRequest()` — the contract, numbered links
and fixture text — outside the repository context. The reply then went through
the same strict parser and extractor as a harvest. No recorded response was
substituted for a live one.

### The rubric

Ten points per contract, two for each row. The same rubric applies on a later
run; changing it would make the scores incomparable.

| Criterion | 2 points | 1 point | 0 points |
|---|---|---|---|
| Wire contract | The exact reply parses | A mechanical cleanup that the parser deliberately refuses would make it parse | It cannot be recovered as the requested findings |
| Yield and selection | Exact expected count and links | One omission or extra | More than one wrong item, or the wrong unit |
| Exclusions | No chrome, heading or citation becomes a story | One excluded thing is returned | The watched failure occurs in bulk |
| Text | Verbatim shapes copy every blurb; long-form accurately states thesis, evidence and conclusion | Grounded but incomplete | Invented, misleading or missing |
| Unit and grouping | One finding per contract unit | Right material with one grouping error | The contract's watched split/merge failure occurs |

**Operational cap:** a wire-contract score below 2 caps the contract at 4/10.
Content that cannot enter the extractor is useful evidence about the prompt, but
it is not a partly working harvest.

### The scores

| Contract | Score | Live evidence |
|---|---:|---|
| `link-list` | **10/10** | `link-list-typical` produced exactly the 40 story links (3–42), no sponsor or footer; `link-list-headings` produced 13 and omitted the linked section heading; the `long-form-roundup` override produced exactly its 12 reading links. All 65 blurbs passed the verbatim check and the extractor refused none |
| `annotated-digest` | **10/10** | Eight findings became eight records; the three-paragraph item stayed one; every commentary block passed the verbatim check; no item was refused or count-flagged |
| `long-form` | **4/10 operational** *(8/10 content before the cap)* | The citation-dense column became one accurate summary with the column's own link and date, no citation became a story, and the thesis, evidence and remedies survived. But the model returned the one finding as a JSON object. `parseFindings()` requires an array (or `{findings: [...]}`), so the exact live reply failed with `reply for long-form is not a list of findings` |

The long-form diagnosis is narrower than the score makes it look. Wrapping the
unchanged live object in an array produced one unflagged record with
`text_is_summary: true`; no content or identity rule then failed. The prompt says
"Return exactly one finding, as JSON", and a singular object is a reasonable
answer to that sentence. The parser is strict by design, so the prompt must name
the wire shape it actually accepts: **"Return a JSON array containing exactly
one finding."**

### What this settles, and what it does not

- The link-list and annotated-digest contracts have a 10/10 fixture baseline.
  A later prompt change has a number to beat without moving the fixtures or the
  rubric.
- Phase 2's measured eval row has happened; a poor score is a finding, not a
  reason to leave the measurement todo open. A new actionable item records the
  long-form wire fix instead.
- The count bands are unchanged. This eval measured selection quality, not real
  newsletter volume.
- This is still a synthetic baseline. Phase 6 must repeat the eval against the
  fixture set derived from the real inventory before these scores can say how
  the contracts behave on a mailbox.

## 2026-08-18 — Phase 3: what a run keeps about a message, and where tagging enters

The phase 3 loop settled two seams the spec named but did not shape.

**A matched message becomes a small `source_doc` entry inside the run record,
not a new top-level store collection.** It carries only the document id, source
key, issue date, extracted shape, story count and count-flag state. That is the
minimum that proves `empty-issue` was fetched and yielded nothing. Keeping the
subject, From address or body would contradict §6; keeping a second durable
collection would make every future store reader learn a structure §7 never
specified.

**Harvest-time themes enter through a tagger seam after extraction and before
merge.** The tagger sees story records and a safe issue label, never the mailbox
body, and returns ordinary free-string tags. `theme:energy` has no privileged
representation or provenance bit, which is exactly §10.1's replaceability rule:
the same tag may later come from a store-wide pass or a person.

### What this settles, and what it does not

- The message-source seam is two calls: search returns envelopes, then read
  returns a body. The exact From check sits between them, so Gmail's plus-tag
  over-match is refused before content is fetched and receives no `source_doc`.
- The run record identifies the inventory by id and source keys. It does not
  copy the private matchers into the store.
- The fixture tagger proves the write path, not the quality of theme judgement.
  Phase 7 still builds the store-wide tagging skill, where enough stories exist
  for themes and clusters to mean something.
- `source_doc` remains an opaque id. How Gmail constructs one is phase 6's
  connector implementation and must not leak a message body or recipient token.

## 2026-08-18 — The first newsletter inventory

The user supplied exactly three sources, with a rolling reach and an extraction
shape for each:

| Source key | Gmail match | Lookback | Shape |
|---|---|---:|---|
| `yglesias` | `from:yglesias` | 14 days | `long-form` |
| `fix-the-news` | `from:fixthenews@substack.com` | 28 days | `annotated-digest` |
| `chopwood-carrywater-extra` | `from:chopwoodcarrywaterdailyactions subject:extra` | 28 days | `link-list` |

The third row is an intersection: both the From token and a subject containing
`extra` must match. Treating those two conditions as the inventory's ordinary
union would harvest every message from that sender and every unrelated message
whose subject contains `extra`, which is far outside the answer.

The lookbacks are source-relative defaults inside an explicit run range. For a
run ending on local date `before`, each source starts no earlier than
`before - lookback_days`; a caller may request a narrower range, never a wider
one. This keeps §5.1's repeatability rule — the resolved per-source dates are
still written to the run record — while preserving the user's different reach
for each source.

### What this settles, and what it does not

- **Settled:** these are the only sources in scope, their match conditions,
  their rolling lookbacks, and their declared extraction shapes.
- **Settled:** `newsletter-inventory` is complete. The actual inventory file
  remains private beside the store, as §4 requires; this decision is the durable
  source from which phase 6 fills it.
- **Not settled:** the redirect-unwrapping rule for each sender. Phase 6 learns
  those rules from real issues rather than guessing them from the address.
- **Not settled:** whether the declared shapes fit every issue. §3.2's per-issue
  override and count flags remain the mechanism for exceptions.

## 2026-08-18 — Gmail handoff: 22 readable messages, no writes, and no HEAD follow yet

The phase-6 adapter and private inventory handoff ran read-only over the exact
scope above, with a requested half-open range of 2026-07-22 through 2026-08-19.
The per-source lookback narrowed Yglesias to 2026-08-05; the two 28-day sources
kept the requested start.

| Source | Messages paged | Post-search matcher failures |
|---|---:|---:|
| `yglesias` | 14 | 0 |
| `fix-the-news` | 4 | 0 |
| `chopwood-carrywater-extra` | 4 | 0 |

All 22 messages had a readable inline HTML body. The connector required no next
page for these bounded windows. Its complete operation log was **3 searches, 22
reads, 0 writes** — no label, archive, mark-read, draft, send, or mailbox-state
operation exists in the adapter's connector surface.

### Redirect handling

All three live sources use the Substack redirect shape. The private inventory
therefore selects the existing `substack` rule for each. **The optional
single-HEAD follow remains off for the first extraction.** The reason is not
that it cannot work; phase 0 established why it exists. It is that following an
opaque, recipient-token link creates a real outbound click before the first
merge rate says the extra resolution is valuable. With the follow off, the
token query is removed, the opaque redirect is kept, and `err:unwrap` makes the
miss visible.

Reopen that choice after the first real harvest if the merge report shows that
unresolved redirects are preventing meaningful cross-source merges. Until
then, generating subscriber-specific clicks to improve a number not yet known
is the wrong default.

### Private handoff boundary

The inventory and a body-free handoff receipt now live under the ignored
`work/private/` directory at mode 0600. The receipt retains only dates, counts,
operation kinds and settings. No raw body, subject, recipient, message id or
connector response was written to disk or committed.

This completes the source adapter and handoff, not the whole phase-6 exit. The
next bounded item is the first real extraction into the private store; it is
what supplies count-band flags and merge rate. The manual real-story sitting
remains evidence no adapter test can manufacture.

## 2026-08-18 — How should the first review-rate baseline be measured?

The fixture review page is working, but browser automation cannot supply the
measurement that matters: how quickly a person can make real keep, drop, and
emphasise decisions. The first baseline needs a protocol that is bounded enough
to run now and specific enough that a later sitting can be compared with it.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. Finish the full 73-story unjudged backlog** | Produces a completion time for the exact fixture and includes the slow tail as attention falls | The time commitment is unknown in advance; fatigue and interruptions can dominate the UI being measured; awkward to repeat after a change |
| **B. Run a fixed 15-minute sitting after one resettable practice judgment** | Bounded, easy to repeat, long enough for startup effects to become a small part of the result, and still measures genuine per-story judgment | Samples only the beginning of the default ordering; gives a rate rather than a full-backlog completion time; requires an uninterrupted person before the phase can move |
| **C. Measure an automated click-through** *(reviewer's choice)* | Cheap, deterministic, repeatable in CI, and exercises the actual browser interaction and state-update path | Measures rendering and button clicks, not reading or judgment; its result is an interaction-throughput baseline and must not be described as human review speed |
| **D. Wait and measure only real mailbox stories** | Most representative of eventual use and avoids drawing conclusions from composed fixtures | Defers feedback on the review interaction until phase 6 and mixes UI throughput with extraction quality and unfamiliar real content |

### Recommendation — revised to option C at reviewer direction

**Recommend C: a deterministic automated click-through of the fixture page.**
The reviewer answered the proposal with: *"I prefer option C. please use C"*.
That changes the phase-4 baseline from human judgment speed to browser
interaction throughput; it does not pretend that automation read the stories.

Generate the page from the committed `store-fixture.json`, open it fresh with
Playwright, and run three measured passes. In each pass, alternate `keep`,
`drop`, and `emphasise` across every unjudged story, one verdict button at a
time, until the backlog reaches zero. Reload the fixture between passes so each
starts with the same 74-story state. Record:

- elapsed milliseconds from the first verdict click through backlog zero;
- the number of individual verdict clicks;
- verdict clicks per second;
- median and 95th-percentile click-to-state-update latency; and
- whether every pass reached zero backlog without a browser error.

Three fresh passes keep the result bounded while exposing a one-off outlier.
Alternating verdicts exercises all three controls, and refusing the
`verdict-rest` shortcut keeps this a measurement of the individual interaction
path. The browser test can produce this evidence now and repeat it after UI
changes. The original B recommendation remains the stronger way to measure
*human* judgment throughput, but the reviewer chose a mechanical baseline for
this phase.

### What would change the recommendation

- If the desired evidence becomes **human reading and judgment speed**, choose
  B; C cannot supply it no matter how many times it is run.
- If the desired number is **human time to clear this exact backlog**, choose A.
- If representative real-story judgment matters more than an early repeatable
  UI baseline, choose D.
- If review moves into the bookmark sorter's generalised grid before this is
  run, measure that surface instead with the same individual-click protocol.

### What this settles, and what it does not

- **If merged, settles:** that phase 4 uses an automated, three-pass,
  individual-click browser baseline and the fields it records. The measurement
  todo becomes actionable because it no longer waits on a person.
- **Does not settle:** human review speed. The result must be labelled browser
  interaction throughput, not stories judged per minute.
- **Does not establish a pass threshold.** As `test-plan.md` says, the first
  rate is a baseline, not a target retrofitted to one observation.
- **Does not replace the phase 6 sitting on real stories.** It isolates review
  mechanics now; the later sitting answers whether the complete harvest is
  actually faster than reading the newsletters.

## 2026-08-18 — Phase 5: what idempotent means for a verdict file

The spec already said importing the same file twice changes nothing. Phase 5
makes that the strong form: **a duplicate does not append another run record or
rewrite the store.** Each file gets a SHA-256 fingerprint over only the fields
the importer is allowed to read — store id, export time, verdicts, and tag
edits, in canonical order. Story text, additions, deletions, and every other
field are inert and therefore do not change the fingerprint or the store.

That choice keeps the run log useful. One recorded run means one sitting folded
in, rather than one invocation of a command; retries are reported as duplicates
without becoming durable activity.

Two ambiguous cases are loud rather than order-dependent:

- an id the store cannot resolve is a conflict, never a new story; and
- two different verdicts with the same `verdict_at` are a conflict, because
  §9's later-wins rule cannot choose between them honestly.

### Recorded fixture round trip

The committed valid verdict file was exported against `fixture-store-v1` and
imported through the same CLI a skill will call. The first import reported
**0 added, 3 matched, 0 merged, 0 conflicted, 3 updated**, retained all 74
stories, and wrote fingerprint
`6e2b783695bfa920a789cac5c5c284b7d6a151f52a8e207844ccb431b0a19bf2`.
The second import reported the same fingerprint with `duplicate: true`; the
store's bytes and run count did not change. A browser test also assigns a
verdict on the generated page, calls its real export function, and imports that
file against the same story id.

### What this settles, and what it does not

- **Settled:** phase 5 closes the fixture loop — harvested stories out to the
  page, verdicts and tag edits back, with the durable store as the only writer.
- **Settled:** open verdict vocabulary is preserved; the fixture's `archive`
  value is stored and added to the offered vocabulary without migration.
- **Not settled:** human review speed. The round-trip automation cannot establish
  it, and the phase 4 decision deliberately chose a browser interaction baseline
  instead. `measure-review-rate` is therefore actionable, not blocked.
- **Next:** run that automated click-through baseline; phase 6 can replace the
  fixture message source with Gmail without changing this file format or merge
  path.

## 2026-08-18 — First automated review interaction baseline

**The three-pass fixture baseline completed successfully at roughly 15 verdict
clicks per second.** This is browser interaction throughput, not human reading
or judgment speed.

The committed `newsletter-review-interaction/v1` runner opened a fresh generated
page for each pass at 1280×900, then alternated `kept`, `dropped`, and
`emphasised` one individual button click at a time across all 73 initially
unjudged fixture stories. It ran with Node v23.11.0 and Playwright Chromium
143.0.7499.4 on arm64 macOS.

| Pass | Clicks | Elapsed | Clicks/second | p50 update | p95 update | Zero backlog | Browser errors |
|---:|---:|---:|---:|---:|---:|---|---:|
| 1 | 73 | 4,829.58 ms | 15.115 | 37.53 ms | 38.96 ms | yes | 0 |
| 2 | 73 | 4,867.95 ms | 14.996 | 37.43 ms | 38.72 ms | yes | 0 |
| 3 | 73 | 4,868.29 ms | 14.995 | 37.45 ms | 38.36 ms | yes | 0 |

The median pass was 4,867.95 ms and 14.996 clicks/second. All three passes
reached zero backlog without a console error, page error, or failed request.

### What this settles, and what it does not

- **Settled:** phase 4 now has its repeatable mechanics baseline and a runner
  that can produce the same fields after a UI change.
- **No threshold is inferred.** This is the first observation, so it is a point
  of comparison rather than a pass/fail target.
- **Human throughput remains unknown by choice.** The result says how quickly
  the current browser path accepts scripted decisions; it says nothing about
  how quickly a person understands or judges a story.
- **Re-run when the review interaction changes.** A material change in click
  rate or p50/p95 latency is evidence to inspect, not automatically a regression
  until a later decision establishes a threshold.
