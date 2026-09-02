---
id: shape
title: Shaping and specifying
order: 30
slide: true
slide_title: From a wish to a specification
audience: both
---
The next two stages turn the wish into something an agent can build. An agent
does the writing. You review the pull request and decide the questions it
raises.

**Objectives** say what done would mean, as outcomes rather than
implementation. They also name the questions the wish leaves open. Merging the
objectives moves the initiative to its second stage.

**Decisions** are where those questions get settled. Each answer is appended
with a date, together with the alternatives that were considered and what the
answer leaves open. This file exists so that a settled argument doesn't get
re-argued months later. When you answer a question the work is stuck on, the
`{{skills.answer-decision.name}}` skill writes the entry and unblocks the
waiting item.

**The specification** says what the thing is, including the alternatives that
were considered and why they lost. Merging it moves the initiative to its
third stage.

@figure record-growth

Each stage expects certain documents to exist, as the chart above shows. The
validator warns when a document expected at the current stage is missing, and
that warning is how the next piece of work gets noticed.

Two documents are tied to no stage. The decisions file appears when there's a
question to settle. The log appears when there's something to record, and it's
append-only: a dated line for each item completed, each release, and each
change of stage.
[The lifecycle table is in the instruction file](source:AGENTS.md), and
[the validation rules are in the technical document](source:INITIATIVES_TECHDOC.md).

---
## From a wish to a specification

An agent drafts the objectives, then the specification with its alternatives.
You review each pull request. Questions the work gets stuck on are answered in
the decisions file, dated, with the alternatives and what stays open. The
validator warns when a stage is missing a document it expects.

@fact lifecycle.stage_documents as stack
