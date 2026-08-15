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
| `text_is_summary` | boolean | Whether `text` was written by us or by the newsletter. A reader judging a story deserves to know which |
| `newsletter` | string | Which newsletter it came from, by stable key rather than display name |
| `issue_date` | date | The date of the issue it arrived in |
| `story_date` | date, nullable | The story's own date where it differs from the issue's. The wish asks for this directly: it is the difference between *"this was in last week's issue"* and *"this happened last week"* |
| `shape` | enum | `link-list` \| `annotated-digest` \| `long-form`. Which extraction produced it — see §2 |
| `source_message` | string | The mailbox message it was extracted from. Provenance, and how a bad extraction is traced back |
| `source_anchor` | string, nullable | Where in that message — a heading path or the nth link. What makes §3's fallback identity work |
| `themes` | string[] | Content areas (objective 4). Plural, and correctable — a story can sit in more than one |
| `verdict` | enum, nullable | `dropped` \| `kept` \| `emphasised`. Null means unjudged, and the count of nulls is the backlog (objective 7) |
| `verdict_at` | timestamp, nullable | When it was judged |
| `harvested_at` | timestamp | When it first entered the store. A re-harvest never moves it |
| `merged_from` | string[] | The ids this record absorbed, when several newsletters carried the same story (§3, case 2) |

**Not carried, deliberately:** the email HTML, attachments, images, and anything
about the mailbox beyond `source_message`. `objectives.md` rules out writing back
to the mailbox, and a harvester that keeps no copy of the mail is a much safer
thing to run repeatedly while it is still wrong.

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

- where the story has a URL: `(newsletter, issue_date, url_key)`
- where it does not: `(source_message, source_anchor)` — the heading path or the
  link's position within the message

Same identity means same story: the existing record wins, `harvested_at` does not
move, and an existing `verdict` is never overwritten by a harvest. This is the
whole of objective 3.

**Case 2 — the same story, from two newsletters.** Three newsletters landing in
one week routinely carry the same article. Matching `url_key` across
newsletters means the same story, and the records **merge**: one record, both
sources, the earliest `issue_date` kept, the absorbed id recorded in
`merged_from`. A verdict on the merged record covers all of it.

The reason to merge rather than to group is that the reader's question — *do I
want to keep this?* — has one answer, and asking it three times is the volume
problem the initiative exists to solve.

**Case 3 — two stories about the same event.** Different links, different words,
one event. These are **not the same story**, and merging them here would be
wrong: objective 6 asks for them to be *read* as one, with the individual links
and dates surviving underneath. That is grouping with a combined paraphrase, and
it belongs to the theme layer rather than to identity.

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

## 5. What this leaves for the spec

- **How `text` is produced for `long-form`.** A summary is written by a model, so
  its length, and whether the original is kept alongside it, is a spec choice.
  `text_is_summary` exists so that choice is visible in the data.
- **Whether case-2 merging happens at harvest or on review.** Merging early is
  cheaper; merging late lets a reader see it happen and undo it.
- **What a theme is, as data** — a free string, or a controlled set. This
  document deliberately says only that `themes` is a correctable list.
- **How verdicts travel back into the store**, which the runtime decision already
  named as the fiddly part of the chosen option.
