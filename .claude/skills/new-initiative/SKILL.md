---
name: new-initiative
description: Create a new initiative under initiatives/ - a durable unit of intent with a wish, a lifecycle stage, and a todo list. Use when the user wants to start an initiative, or describes an idea they want captured as ongoing work rather than done immediately ("start an initiative for...", "I have an idea I want to track"). Scaffolds only the files a wish-stage initiative needs, optionally with background research on prior art and on lessons from similar attempts.
---

# Starting an initiative

An initiative is a durable unit of intent: the wish behind a piece of work, the
documents that elaborate it, the capability it develops, and pointers to what it
produced. See `INITIATIVES_VISION.md`.

The blank page is what stops initiatives getting started, so this creates the
minimum and nothing more. Everything else arrives when the lifecycle reaches it.

## 1. Get the wish in the user's own words

Ask for it if they have not already said it. A vague sentence is a legitimate
wish - `wish` is a real lifecycle stage, not a placeholder for a proper
specification, so do not pad it into one.

If they have already described the idea in this conversation, use what they
said. Quote it back and confirm before writing.

**Tidying is allowed here, and only here.** A wish is not fixed until the pull
request creating it merges, so fixing typos, finishing a broken sentence, or
rewording at the user's request is ordinary work while the PR is open - no need
to preserve the first draft alongside it. Where you have guessed at unclear
intent, say so and ask. After that PR merges the wish is the record, and any
later change keeps the superseded text visible below it.

## 2. Propose a slug

Lowercase, hyphenated, short: `migration-atlas`, `deck-auditor`. Derive it from
the wish and confirm it - the slug becomes the directory name and appears in
every future PR branch, so it is worth one question.

Check `initiatives/<slug>/` does not already exist.

## 3. Ask three questions, no more

| Question | Field | Default if they shrug |
|---|---|---|
| Roughly how valuable is this, compared to your other work? | `value` | `medium` |
| One line describing it, for the index page | `summary` | First sentence of the wish |
| Should I look around before we start? | `background.md` | Nothing |

The third is a choice of one:

- **Nothing** - go straight to the files. This is the default and is often right;
  a wish about the user's own material rarely needs the world's opinion first.
- **Prior art** - who is already providing this, or something close to it.
- **Lessons** - what happened to people who tried something close to it.
- **Both**.

Do not ask about stage (always `wish`), outputs (unknown yet), or effort on the
first todo (always `small`).

## 4. Do the research, if they asked for it

Skip this section entirely for **nothing**.

This is research about the world, not about this repo - web search, not
`grep`. For a wish about the user's own material ("sort my bookmarks"), prior
art means the tools and services that already do it.

**Timebox it.** A handful of good sources, not a literature review. Stop when
new searches keep returning what you have already seen. This is orientation
before objectives get drafted; it is not the objectives, and it is not a
procurement exercise.

Write `initiatives/<slug>/background.md`, with only the sections that were
asked for:

```markdown
# Background

Researched 2026-08-15, before objectives were drafted. Findings only.

## Already being provided

### <Name> - <link>
What it does, what it costs, and where it stops short of the wish.

## Lessons from similar attempts

### <Attempt> - <link>
What was tried, what happened, and what is worth taking from it.

## Questions this raises

- ...
```

Five rules, and the last two are the ones that matter:

- **Every claim carries a link.** If you cannot link it, do not write it down.
- **Nothing found is a finding.** Say so plainly, and say what you searched.
  "Nobody appears to be doing this" is among the most useful things this step
  can return, and padding the file with adjacent-but-irrelevant results is
  exactly what destroys that signal.
- **Questions, not answers, at the end.** Do not add blocked todo items for
  them - `answer-decision` picks up a question raised in a document even when it
  never became a blocker.
- **No recommendations.** No "we should", no feature list, no ranked options.
  The stage stays `wish` and the one todo item is still *draft objectives*.
  This file is what the next documents draw on; it is not those documents
  arriving early.
- **If the research undercuts the wish, say so - do not edit the wish.** Tell
  the user what you found and let them decide. The wish is theirs, it is still
  editable until the PR merges (§1 above), and quietly reshaping it to fit what
  you read is how an initiative ends up pursuing something nobody wished for.

## 5. Write the files

### `initiatives/<slug>/initiative.json`

```json
{
  "title": "Migration Atlas",
  "summary": "Interactive map of historical human migration.",
  "stage": "wish",
  "value": "high",
  "outputs": [],
  "todo": [
    {
      "id": "draft-objectives",
      "title": "Draft objectives.md - what \"done\" would mean",
      "state": "actionable",
      "value": "high",
      "effort": "small",
      "advances_stage": true
    }
  ]
}
```

The single todo item is not decoration. An initiative with no actionable item is
a warning condition, and this is the item that makes a brand-new initiative
legal and gives the sweep something to pick up.

There is no `updated` field - last activity comes from git.

### `initiatives/<slug>/wish.md`

```markdown
# Wish

## 2026-08-12
<the user's words, verbatim>
```

Dated, unedited. On a later revisit a new dated wish is added above this one and
the old text stays visible - it is how drift becomes noticeable.

### `initiatives/<slug>/background.md`

Only when §4 produced one. Two files is still the norm; this is the third and
only file this skill may add.

### No `index.html`

Do **not** create one. The build generates the overview page from
`initiative.json` and the files present, so a committed page would be a second
copy of the status that could drift from the real one. See
`INITIATIVES_TECHDOC.md`.

## 6. Do not create anything else

No `spec.md`, no `plan.md`, no empty `work/`, `lib/`, or `notes/` directories.
The absence of those files is what tells the sweep the next step is to draft
objectives. Creating them empty destroys that signal.

`background.md` is not an exception to this. It is not a lifecycle document -
no stage expects it, and its presence says nothing about what to do next. The
missing `objectives.md` still carries that signal, unchanged.

## 7. Confirm

Report the path, the stage, and the one actionable item. The overview page appears at the next build. Mention that
`overview.md` can be added later for narrative, but is not needed now.

If you wrote `background.md`, say so and say what it changes, if anything -
including "nothing, this looks unexplored". **The research and the wish belong
in the same pull request**, deliberately: the user can read the background, ask
about it, and reword the wish while that PR is open. Once it merges the wish is
the record, and later changes have to keep the superseded text visible. Say that
plainly, so the chance to revise is taken while it is free.
