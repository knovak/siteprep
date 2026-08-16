# Objectives

What "done" would mean, derived from the wish. Outcomes, not implementation —
how any of this is built belongs in `spec.md`.

## The point

**Turn a stream of newsletters into a short list of stories worth keeping.**

The wish is about volume before it is about anything else: newsletters "that
contain large numbers of stories". Most of that material is read once and never
wanted again; a few items are worth holding on to, and they are buried among the
rest. Everything below — harvesting, grouping, paraphrasing, publishing — earns
its place by getting to that short list faster than reading the emails would.

The failure mode to name early is building a newsletter *archive*: a complete,
searchable, well-tagged copy of every issue that nobody ever opens. Completeness
is not the measure. What is kept, and how quickly, is.

## What makes this hard, and what it changes

The wish names three kinds of newsletter, and they are not three sizes of the
same problem. They are three different extraction problems:

| Shape | Named in the wish | What one story is |
|---|---|---|
| **Link list** | Future Crunch, Fix the News, Americans of Conscience | A link and a sentence or two. Dozens per email |
| **Annotated digest** | Stanford energy, Yale newsletters | A link and a paragraph. Several per email |
| **Long-form column** | Yglesias, Roberts, and other Substack authors | Possibly the entire email — with links inside it that are *citations*, not stories |

The third shape is the one that breaks the obvious rule. "Every link is a story"
works on the first two and produces a page of garbage from the third: one column
yields thirty items, each a footnote to an argument, none of them a story
anybody wanted. So the unit of harvest has to be decided per newsletter, not per
link.

This is also what distinguishes this initiative from the bookmark sorter, which
faces a superficially similar pile. There, an item arrives already discrete — a
title and a URL. Here **a story has to be manufactured out of an email**, and
whether that was done correctly is itself something that can be wrong.

## Done means

1. **The right emails can be found, and finding them again gives the same
   answer.** The set of newsletters in scope is written down rather than
   remembered, and a harvest over a date range is repeatable — re-running it
   produces the same stories from the same issues.

2. **An email becomes stories, not links.** Each story carries its own text —
   the blurb as written, or a summary where the source is long-form — along with
   its link, the newsletter it came from, and the issue date. Where a story's own
   date differs from the issue date, that date survives too; the wish asks for
   this directly, and it is the difference between "this was in last week's
   issue" and "this happened last week".

3. **Harvesting twice does not produce two copies.** Ranges overlap, newsletters
   repeat each other's links, and a re-run is the normal case rather than the
   exception. An item already harvested is recognised as the same item.

4. **Stories are grouped by content area, and the grouping can be corrected.**
   Automatic grouping is what makes the volume tractable; being able to move a
   story to the right theme is what stops one bad call poisoning the page.

5. **A theme can be judged in one sitting.** Its stories are presented so that
   they can be expanded and collapsed rather than scrolled through, and reordered
   — by date at minimum, and by whatever else turns out to sort usefully.

6. **Closely related stories can be read as one.** Where several stories cover
   the same event — the common case when three newsletters land in the same week
   — they can be combined into a single entry with a paraphrase that draws on all
   of them, without losing the individual links or dates underneath.

7. **Every story ends up disposed of or held.** A story is dropped, kept, or
   emphasized, and doing so is fast enough to keep up with reading. Whatever has
   not been judged yet is the backlog, and the system can say how large it is.

8. **The results outlive the run.** Verdicts, themes, and the stories themselves
   persist in a store that can be worked with afterwards, and the emphasized or
   retained set can be published as HTML that someone else can open.

## Explicitly not the first version

The wish marks these as possibilities rather than requirements, and they stay
out until the core above works:

- **Publication as an OpenAI site.** The wish says "consider", and it is a
  hosting decision that follows the runtime one rather than preceding it.
- **Writing back to the mailbox** — labelling, archiving, or otherwise changing
  what is in Gmail. Nothing in the wish asks for it, and a harvester that only
  reads is a much safer thing to run repeatedly while it is still wrong.

## How we will know

- A real month of the named newsletters produces a themed page, and how long the
  harvest and the review each took is known.
- **The long-form shape is handled correctly** — a single Substack column
  produces one story with its argument intact, not one item per embedded link.
  This is the sharpest test of whether extraction works, because it is the case a
  link-scraper fails silently.
- A second harvest over an overlapping range adds only what is new.
- The kept set can be opened as a page by someone who does not have the mailbox.

## Decisions this raises

Drafting these surfaced questions the wish does not settle, and that should not
be settled by whoever writes the spec:

1. **Does this run as agent skills, or as a website?** The wish raises it
   explicitly — "This entire process might run through codex skills rather than
   a freestanding website. That would allow the skills to do some of the
   harvesting and paraphrasing." It decides nearly everything downstream: what
   "a database" means, where the model that paraphrases lives, and whether the
   review UI of objective 5 is a real application or a generated page. Recorded
   as a blocked item.

2. **Which newsletters are in scope, and how is an email recognised as one of
   them?** The wish names seven by title, which is not the same as knowing the
   sender addresses, labels, or how far back to reach. Only the user's mailbox
   can settle it, so it is recorded as a blocked item rather than guessed.

Two more are noted here for the spec rather than raised as blockers:

- **How much of the triage machinery is shared with the bookmark sorter.**
  Objectives 5 and 7 are close cousins of that initiative's grid and verdicts,
  and both may land on a web app. Worth weighing deliberately in `spec.md` —
  including the answer that they stay separate — rather than either duplicating
  by accident or coupling two initiatives before either has run.
- **What "closely related" means in objective 6.** A judgement the spec has to
  make concrete, and one where being too eager merges distinct stories and being
  too shy leaves the duplication the objective exists to remove.
