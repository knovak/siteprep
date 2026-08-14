---
name: answer-decision
description: Answer a question an initiative is blocked on, recording it in decisions.md and unblocking the item. Use when the user answers something an initiative is waiting for - a decision, a choice between alternatives, or a fact the work needs ("the bookmark sorter should be a web app", "answer the runtime question", "the pile is about 8000 items"). Also use for a question raised in a document but never recorded as a blocker.
---

# Answering a question an initiative is waiting on

Initiatives raise `human:` blockers well and had no way to settle them. This
writes the answer down where it will be found, and unblocks the work.

The value is not the unblocking, which is mechanical. It is that **the reasoning
survives**. An answer recorded only in a commit message or a chat is an answer
that gets re-litigated in six months, which is the failure initiatives exist to
prevent.

## 1. Find what is being answered

Read `initiatives/<slug>/initiative.json` and find the blocked item. The user
will usually identify it loosely — "the runtime question", "where it should
run" — so match on the sense of the blocker text, not an exact string.

If the question was raised in a document (`objectives.md` often ends with a
"Decisions this raises" section) but never became a blocked item, that still
counts. Record it the same way; there is just no item to unblock.

If you cannot tell which question is meant, ask. Answering the wrong one writes
a plausible, wrong record.

## 2. Write the entry in `decisions.md`

Create `initiatives/<slug>/decisions.md` if it does not exist, and **append** —
newest at the bottom, so the file reads in the order things were settled.

```markdown
## 2026-08-14 — Where should this run?

**Web app**, most likely hosted on an OpenAI site using its database.

<the user's reasoning, in their words where they gave any>

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| ... | ... | ... |

### What this settles, and what it does not

- ...
```

Three rules:

- **The answer is the user's, not yours.** Record what they said. Where they
  gave reasoning, keep their words.
- **Say what remains open.** Most answers are partial — "a web app, probably on
  an OpenAI site" settles the shape and leaves the host undecided. Recording it
  as fully settled is how a spec later gets written on a false certainty.
- **Note the consequences you can see.** If the answer makes another open
  question harder or easier, say so. That is the most useful thing in the file
  and the reason a later reader opens it.

An **Alternatives considered** section is not always needed — a factual answer
("the pile is 5,000–10,000 items") has no alternatives. Include it when a real
choice was made, and when the user asks for one. It is what `spec.md` draws on
for its own alternatives section, so writing it once here saves writing it twice.

## 3. Unblock the item

Do not hand-edit the JSON:

```bash
node scripts/initiatives.mjs complete <slug> <item-id> --note "..."
```

for an item the answer *completes*, which also unblocks anything waiting on it
and writes the log entry.

For an item that was **blocked** and is now merely *doable*, flip it: set
`state` to `actionable` and remove `blocked_by`. The work itself still has to
happen — answering "where should this run" unblocks writing the spec; it does
not write it.

Judge which case applies by what the item says. "Decide where snapshots come
from" is completed by the decision. "Draft spec.md" is unblocked by it.

## 4. Do not answer the next question too

A decision often implies others — a web app raises hosting, auth, and how
snapshots get captured. **Raise them, do not settle them.** Add them as new
blocked items with `human:` blockers, and say in `decisions.md` that they
follow from this decision.

The temptation is to keep going while the context is fresh. Resist it: the
user answered one question, and a record that quietly contains three answers
they never gave is worse than no record.

## 5. Open a pull request

Everything above is a normal change: `decisions.md`, `initiative.json`, and
`log.md`. Open a PR as usual and let the user merge it. The decision takes
effect when they do — the same rule as everywhere else here.

## When the answer is yours to propose, not theirs to record

The sweep's propose phase (`initiatives/sweep-prompt.md`, Phase 3) writes the
same entry in the same format, for a `human:` question the user has not answered
yet. Everything above still applies, with one section reversed: **the answer is
a recommendation, not a record**, so the alternatives come before it, it is
labelled as a recommendation, and the entry says what would make a different
option correct. Merging is what turns it into the user's answer.

That distinction is the whole safeguard. A proposal written as though the
question were settled reads exactly like a decision the user made and forgot,
which is worse than leaving it open.

Only `human:` questions may be proposed — never `data:`, `permission:`, `cost:`
or `legal:`. Those need a fact only the user has, or their authority.
