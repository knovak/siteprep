# Decisions

Questions this initiative was waiting on, and how they were settled. Newest at
the bottom. Written so a later reader — including a later version of us — does
not re-argue something already decided.

## 2026-08-15 — Does this run as agent skills, or as a website? *(proposed)*

**This is a proposal, not a decision.** The sweep wrote it because the question
had been sitting open and judging an argument is cheaper than composing one.
Merging the pull request is what makes it an answer; naming a different option
in a comment is enough to send it elsewhere.

The question, as `objectives.md` recorded it, comes from the wish itself: *"This
entire process might run through codex skills rather than a freestanding
website. That would allow the skills to do some of the harvesting and
paraphrasing."*

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. Agent skills, end to end** — a skill reads the mailbox, extracts stories, groups and paraphrases them, and writes out a page; verdicts are given by talking to the skill | Nothing to host, nothing to authorise beyond a mailbox connector that already exists. The two genuinely hard parts — deciding what one story is in three different newsletter shapes, and paraphrasing several stories into one — are model work, which is what a skill is. Runs today | Objective 7 is the weak spot: dropping, keeping and emphasising a few hundred stories by *conversation* is slower than reading the newsletters would have been, which is the one thing the objectives say must not happen. No place for a backlog count to live between runs |
| **B. A website with its own store** — a server holds Gmail credentials, ingests on a schedule, keeps stories in a database, and serves the review UI | The strongest answer to objectives 5 and 7: a real UI for expand/collapse, reordering, and one-keystroke verdicts, with state that survives the tab. Publishing (objective 8) is a page it already knows how to render. Reachable from a phone | Everything the wish did not ask for: hosting, sign-in, and a stored Gmail refresh token for a personal mailbox — the heaviest liability in the whole design, held permanently so that it can read mail that a human could have handed over. The extraction and paraphrase work still needs a model, so the server ends up calling one anyway; the website adds a second system rather than replacing the first |
| **C. Skills harvest, a generated page reviews** *(recommended)* | Splits the problem where its two halves actually differ. The mailbox and the model work stay in a skill, so no server ever holds mail credentials. Review is a self-contained HTML page — expand/collapse, sort, and verdict buttons are ordinary DOM, and objective 5 is met by a page rather than by a conversation. Verdicts come back as a file the skill folds into the store, so re-running a harvest sees what was already judged | Two artefacts to keep agreeing with each other, and the verdict round-trip is the fiddly part: a page that exports and a skill that imports is more moving parts than a database write. Not multi-device — the page and its store live wherever the skill ran |
| **D. Skills harvest, the bookmark sorter's web app reviews** | Objectives 5 and 7 here are close cousins of that initiative's grid and verdicts; one triage surface for both piles means building it once and getting the phone case for free | That app does not exist yet. It couples two initiatives before either has run, and it inherits an ingestion and collection model built for bookmarks — items that arrive discrete, which is precisely what a harvested story is not |

### The recommendation, and why

**C — skills over the mailbox, with a generated page for review.**

The reasoning is that this initiative is two problems wearing one name, and they
want opposite things:

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

**C should be built as a staging post to D, not as a dead end.** If the bookmark
sorter's web app lands and its triage machinery generalises, moving review there
should be a change of surface, not a rewrite. That means the store is the
durable thing and the page is disposable: stories, themes and verdicts live in a
plain, portable file that something else could read.

### What would change this

Named so that disagreement is one line rather than an argument:

- **Triage has to happen on a phone, or away from the machine that harvested.**
  Then C's single-machine store is the wrong shape and B or D wins outright.
- **Verdicts must be shared with anyone else**, now or later. C assumes a single
  reviewer.
- **The bookmark sorter's web app ships first and its grid generalises.** Then D
  is cheaper than C, and C's generated page is work that need not have happened.
- **Reading a month of newsletters from a skill turns out to be unreliable** —
  rate limits, attachment-heavy issues, or a connector that cannot search well
  enough to make a harvest repeatable (objective 1). That failure argues for B,
  which can ingest slowly in the background and retry.
- **The volume is smaller than assumed.** If a week's harvest is tens of stories
  rather than hundreds, A is enough and the generated page is over-building.

### What this would settle, and what it would not

- **Would settle**: no server holds Gmail credentials; harvesting, extraction
  and paraphrase are skill work; review is a generated page rather than a
  conversation.
- **Would not settle**: what the store actually is — a file, SQLite, or
  something else — and where it lives. That is a spec question, and this
  proposal only constrains it to being plain and portable enough for another
  surface to read later.
- **Would not settle**: where published HTML is hosted. `objectives.md` already
  holds "publication as an OpenAI site" out of the first version, and this
  answer does not disturb that.
- **Unaffected**: `newsletter-inventory` stays blocked on the user either way —
  which senders count and how far back a harvest reaches is a fact about the
  mailbox, not a consequence of the runtime.
- **Unblocks**: `draft-spec`, which was waiting on this to write its alternatives
  section. Most of the table above is the raw material.

### Questions this raises, deliberately not answered here

- **How do verdicts get back into the store?** An exported file the skill reads,
  or the page writing directly to a local store. The fiddly part of C, and a
  spec question rather than a decision.
- **Does the harvest run on demand, or on a schedule?** C makes on-demand the
  natural answer; nothing in the wish requires a schedule, but it has not been
  ruled out.
