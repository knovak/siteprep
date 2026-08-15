# The story record

What a harvested story carries, and what makes two of them the same one.

Written ahead of `spec.md` because it is the piece the rest is built on: the
record is what the store holds, what the review page renders, and what a second
harvest has to recognise. Objective 3 — *harvesting twice does not produce two
copies* — is a statement about this document and nothing else.

It follows the runtime decision of 2026-08-15 (skills harvest, a generated page
reviews, with the bookmark sorter's app as a standing fallback), and the
constraint that came with it: **the store is the durable thing and the page is
disposable**, so the record below is specified as plain data that any surface
could read.

## 1. The fields

| Field | Type | Why it is here |
|---|---|---|
| `id` | string | Stable identity, derived per §3. Not a random UUID — a re-harvest must arrive at the same one |
| `url` | string, nullable | The story's target, after unwrapping (§4). Null for a long-form column that *is* the story |
| `url_key` | string, nullable | Normalised form of `url`, used for matching. Never shown |
| `title` | string | What the story is called. From the link text, the heading, or the subject for a whole-issue story |
| `text` | string | The blurb **as written**, or a summary where the source is long-form. Objective 2 asks for the story's own text, not a pointer to it |
| `text_is_summary` | boolean | Whether `text` was written by a harvester or by the source. A reader judging a story deserves to know which |
| `source` | string | Which newsletter — or other source (§6) — it came from, by stable key rather than display name |
| `harvester` | string | Which skill produced this record (§6). Provenance for the extraction itself, not just the material |
| `issue_date` | date | The date of the issue it arrived in |
| `story_date` | date, nullable | The story's own date where it differs from the issue's. The wish asks for this directly: it is the difference between *"this was in last week's issue"* and *"this happened last week"* |
| `shape` | string | `link-list`, `annotated-digest`, `long-form` to begin with — **an open vocabulary**, since a new harvester may find a shape these three do not describe (§2, §6) |
| `source_doc` | string | The message or document it was extracted from. How a bad extraction is traced back |
| `source_anchor` | string, nullable | Where in that document — a heading path or the nth link. What makes §3's fallback identity work |
| `tags` | string[] | **A set of free-string tags.** Themes are tags by convention (`theme:energy`), and so is anything else worth selecting on — see §1.1 |
| `verdict` | string, nullable | `dropped`, `kept`, `emphasised` to begin with — **an open vocabulary**, so `archive` or `to-be-shared` can be added without a migration (§1.2). Null means unjudged, and the count of nulls is the backlog (objective 7) |
| `verdict_at` | timestamp, nullable | When it was judged |
| `harvested_at` | timestamp | When it first entered the store. A re-harvest never moves it |
| `merged_from` | string[] | The ids this record absorbed, when several sources carried the same story (§3, case 2) |

**Not carried, deliberately:** the email HTML, attachments, images, and anything
about the mailbox beyond `source_doc`. `objectives.md` rules out writing back to
the mailbox, and a harvester that keeps no copy of the mail is a much safer thing
to run repeatedly while it is still wrong.

### 1.1 Themes are tags

There is no separate theme field and no theme table. **A theme is a tag**, by the
convention `theme:<name>`, held in the same set as everything else worth
selecting on — the source, the shape, an error, or whatever a reader invents.

Three reasons this is the right structure rather than merely a cheaper one:

- **Grouping and correcting are the same operation.** Objective 4 asks that a
  story be movable to the right theme. On a set of tags that is adding one and
  removing another — no special case, and a story may sit in several themes at
  once because a set does not object.
- **Whatever adds tags can group stories.** A model proposing themes, a rule
  matching a keyword, or a person typing — all write the same thing, so the
  grouping intelligence is replaceable without touching the record.
- **It matches the bookmark sorter**, whose spec settled on flat free-string tags
  with prefixes as convention and a boolean selection over them. If review ever
  moves into that app (the standing fallback in `decisions.md`), the two data
  models already agree. That is worth having deliberately rather than by luck.

The tag vocabulary is **not fixed**: a bare `boring` is as legal as
`theme:energy`, and nothing validates against a controlled list.

### 1.2 Verdicts are an open vocabulary

`dropped`, `kept` and `emphasised` are the starting set — the three objective 7
names — not the permanent one. `archive`, `to-be-shared` or anything else can be
added later as configuration rather than as a schema change.

Two rules keep that from turning into a mess:

- **A story has exactly one verdict, or none.** This is what makes the backlog
  count meaningful: unjudged is `null`, and everything else is judged. Keeping
  the verdict a single-valued field rather than folding it into `tags` is the
  price of that count, and it is worth paying.
- **An unknown verdict is preserved, never dropped.** Anything reading the store
  — an export, a review page, another surface — must round-trip a verdict it does
  not recognise rather than blanking it. A vocabulary that can grow is only safe
  if the readers do not silently discard what they have not been told about.

## 2. `shape` is recorded, not inferred at render time

The three newsletter shapes are three different extraction problems, and which
one produced a story is the single most useful thing to know when an extraction
looks wrong. A page of thirty footnote-sized items all marked `long-form` is the
failure `objectives.md` calls the sharpest test, and recording the shape is what
makes that visible instead of merely disappointing.

It also decides what `url` means. In `link-list` and `annotated-digest`, the URL
*is* the story. In `long-form`, the links inside are citations, and the story's
own URL is the column itself — or nothing, if the column exists only as an email.

## 3. What makes two stories the same one

Three different questions hide under "the same story", and conflating them is how
a harvester either loses material or produces duplicates.

**Case 1 — the same item, harvested twice.** Ranges overlap and a re-run is
normal. Identity is:

- where the story has a URL: `(source, issue_date, url_key)`
- where it does not: `(source_doc, source_anchor)` — the heading path or the
  link's position within the document

Same identity means same story: the existing record wins, `harvested_at` does not
move, and an existing `verdict` is never overwritten by a harvest. This is the
whole of objective 3.

**Case 2 — the same story, from two sources.** Three newsletters landing in one
week routinely carry the same article. Matching `url_key` across sources means
the same story, and the records **merge**: one record, every source kept, the
earliest `issue_date` kept, the absorbed id recorded in `merged_from`. A verdict
on the merged record covers all of it.

The reason to merge rather than to group is that the reader's question — *do I
want to keep this?* — has one answer, and asking it three times is the volume
problem the initiative exists to solve.

**Merging happens at harvest, not at review.** The reader never sees the
duplicates and never spends a decision on them, which is the point; and because
`merged_from` records what was absorbed, an early merge is inspectable and
reversible rather than lossy. The cost is that a merge made on a bad `url_key`
is invisible until someone looks — which is the argument for §4 being careful,
not for merging late.

**Case 3 — two stories about the same event.** Different links, different words,
one event. These are **not the same story**, and merging them here would be
wrong: objective 6 asks for them to be *read* as one, with the individual links
and dates surviving underneath. That is grouping with a combined paraphrase, and
it belongs to the theme tags rather than to identity.

The line between 2 and 3 is exactly the line between *same URL* and *same
subject*. The first is decidable; the second is a judgement, and `objectives.md`
already flags that being too eager there merges distinct stories while being too
shy leaves the duplication objective 6 exists to remove. Keeping identity at case
2 means a bad judgement in case 3 is always recoverable — nothing was destroyed.

## 4. Unwrapping links, which is where identity actually breaks

Newsletter links are rarely the publisher's URL. Substack rewrites them through
its own redirector, Mailchimp and similar senders wrap every link in click
tracking, and the same article arrives from three newsletters as three different
URLs. **Matching before unwrapping makes case 2 fail silently** — the merge never
happens, and the reader judges the same article three times.

So `url_key` is built by, in order:

1. **Unwrap known redirectors** — take the encoded target out of the tracking
   URL. This is a per-sender rule, and it is the one part of the pipeline that
   goes stale when a newsletter changes provider.
2. **Follow a redirect where the target is not encoded in the URL**, once, on a
   HEAD request, with a short timeout. Left as an option the spec can switch off:
   it costs a request per link and it tells the sender's tracker that the link
   was resolved.
3. **Normalise** — lowercase scheme and host, drop the fragment, strip `utm_*`,
   `fbclid`, `gclid` and the sender's own parameters, and drop a trailing slash
   on an empty path. Nothing else is rewritten; query strings carry meaning often
   enough that being clever loses pages.

The unwrapped target is what `url` stores, and the original is discarded — it is
a tracking link, useful to nobody afterwards.

**A link that cannot be unwrapped is kept as-is and marked**, rather than
dropped. It still shows and can still be judged; it just may fail to merge with
its twin, which is a smaller loss than losing the story.

## 5. Many harvesters, one store

**Any number of skills may harvest material into this store.** The newsletter
harvester is the first, not the only one, and nothing here assumes a single
producer. That is why `harvester` sits on the record beside `source`: the first
says which skill made the extraction, the second says where the material came
from, and a bad run is traceable to one of them rather than to "the harvester".

What that buys, and what it costs:

- **Extraction strategy is the harvester's business.** How a long-form column
  becomes one story — how long the summary is, whether the original text is kept
  beside it, what counts as a citation rather than a story — is decided by
  whichever skill is doing the harvesting, not prescribed here. The record only
  demands that the result be honest about itself, which is what
  `text_is_summary` is for.
- **`shape` is an open vocabulary** for the same reason. A harvester meeting
  material these three shapes do not describe should name a fourth rather than
  mislabel it, since §2's whole argument is that a wrong shape hides a wrong
  extraction.
- **Identity still holds across harvesters.** `url_key` is the cross-source key
  (§3, case 2), so a story harvested from a newsletter and the same article
  arriving through some other skill merge into one record. This is the property
  that makes many producers safe rather than merely possible, and it is the
  reason §4's unwrapping matters more, not less, as sources multiply.
- **A harvester never writes a verdict.** Judging is the reader's, and a record
  that arrives pre-judged would quietly shrink the backlog objective 7 counts.
  Tags are fair game; `verdict` is not.

## 6. What this leaves for the spec

- **How verdicts travel back into the store**, which the runtime decision already
  named as the fiddly part of the chosen option.
- **What a harvester must do to register itself**, if anything — whether the
  store knows the set of harvesters or simply records the name each one claims.
- **Where the shape and verdict vocabularies live**, given both are open:
  configuration, or simply whatever values appear in the data.
