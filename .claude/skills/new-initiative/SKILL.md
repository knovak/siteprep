---
name: new-initiative
description: Create a new initiative under initiatives/ - a durable unit of intent with a wish, a lifecycle stage, and a todo list. Use when the user wants to start an initiative, or describes an idea they want captured as ongoing work rather than done immediately ("start an initiative for...", "I have an idea I want to track"). Scaffolds only the two files a wish-stage initiative needs.
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

## 3. Ask two questions, no more

| Question | Field | Default if they shrug |
|---|---|---|
| Roughly how valuable is this, compared to your other work? | `value` | `medium` |
| One line describing it, for the index page | `summary` | First sentence of the wish |

Do not ask about stage (always `wish`), outputs (unknown yet), or effort on the
first todo (always `small`).

## 4. Write exactly two files

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

### No `index.html`

Do **not** create one. The build generates the overview page from
`initiative.json` and the files present, so a committed page would be a second
copy of the status that could drift from the real one. See
`INITIATIVES_TECHDOC.md`.

## 5. Do not create anything else

No `spec.md`, no `plan.md`, no empty `work/`, `lib/`, or `notes/` directories.
The absence of those files is what tells the sweep the next step is to draft
objectives. Creating them empty destroys that signal.

## 6. Confirm

Report the path, the stage, and the one actionable item. The overview page appears at the next build. Mention that
`overview.md` can be added later for narrative, but is not needed now.
