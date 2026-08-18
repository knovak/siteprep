# work/

The harvester as it is being built. `plan.md` §3 is the order; this is what
exists so far.

```
node --test "initiatives/newsletter-story-harvester/work/test/*.test.mjs"
```

No dependencies, no network, no mailbox, and no model — which is `plan.md` §2's
seam paying for itself in the first phase that could have needed one. Node 18 or
later, for the built-in test runner.

## What is here — phases 1 and 2

**Phase 1 — the store, and what makes two stories the same one**

| File | What it is | Specified in |
|---|---|---|
| `src/url-key.mjs` | The redirector table, the optional single HEAD follow, and normalisation | `story-record.md` §4 |
| `src/identity.mjs` | The record's fields, and identity for both cases | `story-record.md` §1, §3 |
| `src/store.mjs` | The JSON file: atomic write, one generation kept, subset export | `spec.md` §7, §7.1 |
| `src/merge.mjs` | The merge path — harvest and import are the same code | `spec.md` §7.1, `story-record.md` §3 |
| `fixtures/redirectors.json` | Wrapped URLs in the shapes real senders use, one of them unwrappable | `test-plan.md` §3 |
| `fixtures/overlap.json` | One article, two sources, two redirectors — the case 2 merge | `test-plan.md` §3 |

**Phase 2 — the three contracts, against fixtures**

| File | What it is | Specified in |
|---|---|---|
| `src/html.mjs` | Reading an issue: link positions, heading paths, and the text the never-invented check compares against | `spec.md` §3.1, §3.3 |
| `src/contracts.mjs` | The three contracts — the unit, the band, what `text` and `url` mean, the anchor rule, the chrome backstop | `spec.md` §3.1 |
| `src/model.mjs` | The model seam: the recorded-reply implementation, the prompt, and the strict reply parser | `test-plan.md` §2 |
| `src/extract.mjs` | One issue under one contract into records: the override, the count band, `err:count`, the loud case | `spec.md` §3.2 |
| `fixtures/issues/*.html` | Six issues, including the three adversarial ones | `test-plan.md` §3 |
| `fixtures/responses/*.json` | A recorded reply per issue per contract | `test-plan.md` §2 |
| `measure-bands.mjs` | The measured row: what each contract actually yields | `test-plan.md` §4.2 |
| `test/` | One test per row of `test-plan.md` §4.1 and §4.2 | |

Not here, deliberately: the mailbox, the store's harvest entry point, the page,
and verdicts. That is `plan.md` §3's phase 2 boundary — extraction reads a
*document* and returns records, which is the seam that lets everything above it
be built without a mailbox.

## Three things worth knowing before reading the code

**The id is assigned at first write and never re-derived.** It is derived from
`(source, issue_date, url_key)` or `(source_doc, source_anchor)`, so a
re-harvest computes the same one — but after a case 2 merge the surviving
record's fields may have moved to the earlier issue's, and re-deriving then would
break every reference to the old id. Instead the absorbed id lives in
`merged_from` and the store's index resolves it, so both sides' derived ids land
on the same record. That is what makes a merge idempotent rather than a source of
duplicates on the next run.

**A `u1-` / `a1-` prefix says which identity rule produced an id.** `plan.md` §3
is explicit that a change to identity after records exist does not migrate. The
prefix costs four characters and makes such a change visible in the data rather
than something a later reader infers from a pile of duplicates.

**An unwrappable redirector loses its whole query string, not just its `utm_*`
parameters.** This is the one place the code is stricter than
`story-record.md` §4's "kept as-is". Phase 0 found what those query strings hold
— Substack's `j` is a signed blob naming the subscriber, Mailchimp's `e` is the
recipient — and either would travel into `url_key`, into the store, and out
through §12's published page, which §6 says is safe precisely because nothing of
the mail was kept. The cost is that such a link may not resolve when clicked;
`story-record.md` §4's step 2 is what recovers it for a sender where that
matters, which is a second input to `plan.md` §6's open question about whether
the HEAD follow should be on by default.

**The model returns a link index, never a URL.** `spec.md` §3.3 requires
identity to be structural; a reply carrying hrefs would put the model one
mis-copied character away from a new `url_key`, a new id and a duplicate that no
test catches. So `src/html.mjs` numbers the links, the prompt shows that
numbering, and a finding says *which* link rather than *what* link.

**The recorded replies are deliberately wrong in places.** `link-list-typical`'s
reply harvests the sponsor block, the unsubscribe link, one blurb that is not in
the issue, one link twice, and one link index that does not exist;
`link-list-headings`'s harvests a section heading that is itself a link. A
fixture reply that agreed with the pipeline would test the recording rather than
the pipeline, so each of those is a refusal the tests assert.

## One reading of the spec worth flagging

`story-record.md` §3 case 2 is written as *the same story from two sources*, and
the merge here keys on `url_key` regardless of source — so a single newsletter
linking the same article in two issues also merges. That is the same reader
question with the same single answer, which is what case 2 exists to avoid asking
twice, and the merge stays inspectable through `merged_from` either way. Flagged
rather than assumed: if the intent was strictly cross-source, this is a one-line
change in `merge.mjs`.

## Phase 1 exit

`test-plan.md` §4.1, every row:

| Row | Where |
|---|---|
| Atomic write | `test/store.test.mjs` — a crash is arranged at the one moment it could matter |
| One generation kept | `test/store.test.mjs` |
| Unwrap table | `test/url-key.test.mjs`, table-driven from the fixture |
| Normalisation | `test/url-key.test.mjs` — including that a differing query string does **not** collapse |
| Identity with a URL | `test/identity.test.mjs` |
| Identity without one | `test/identity.test.mjs` |
| Re-import is a no-op | `test/merge.test.mjs` |
| Cross-source merge | `test/merge.test.mjs` |
| Merge is inspectable | `test/merge.test.mjs` |
| Import never deletes | `test/merge.test.mjs` |
| Judged beats unjudged | `test/merge.test.mjs` |
| Id collision, different record | `test/merge.test.mjs` |

## Phase 2 exit

`test-plan.md` §4.2, every row:

| Row | Where |
|---|---|
| `link-list` yield | `test/extract.test.mjs` — 40 stories, and none from the sponsor block or the footer |
| Headings are not stories | `test/extract.test.mjs` — including the heading that is a link |
| `annotated-digest` yield | `test/extract.test.mjs` — the three-paragraph item is one story |
| `long-form` yield | `test/extract.test.mjs` — exactly one, and no citation among 25 becomes one |
| `text_is_summary` | `test/extract.test.mjs` |
| Text is never invented | `test/extract.test.mjs` — every stored `text` appears in the issue |
| Per-issue override | `test/extract.test.mjs` — `shape` is what was extracted |
| Count band flags | `test/extract.test.mjs` — the stories are still written |
| The loud case, by name | `test/extract.test.mjs` — and it is first in the run summary |
| Nothing of the mail survives | `test/extract.test.mjs` — no markup, no recipient identifier |
| **Measured: the count bands** | `measure-bands.mjs`, recorded in `decisions.md` |
| **Measured: eval score per contract** | **Not done** — needs a live model, so it is the `eval-contracts` item rather than part of this one |
