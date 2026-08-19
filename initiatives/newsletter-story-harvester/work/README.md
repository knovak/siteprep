# work/

The harvester as it is being built. `plan.md` §3 is the order; this is what
exists so far.

```
node --test "initiatives/newsletter-story-harvester/work/test/*.test.mjs"
```

No dependencies, no network, no real mailbox, and no live model — which is
`plan.md` §2's seam paying for itself in the first phase that could have needed
all three. Node 18 or later, for the built-in test runner.

## What is here — phases 1–7

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
| `fixtures/responses/*.json` | A recorded reply per issue per contract; the long-form citation recording preserves the live eval content, wrapped only in the requested one-element array | `test-plan.md` §2 |
| `measure-bands.mjs` | The measured row: what each contract actually yields | `test-plan.md` §4.2 |
| `test/` | One test per row of `test-plan.md` §§4.1–4.3 | |

**Phase 3 — a whole run, over a fixture mailbox**

| File | What it is | Specified in |
|---|---|---|
| `src/fixture-source.mjs` | The message-source seam exercised without Gmail: matcher union, half-open ranges, plus-tag over-match, body reads kept separate | `spec.md` §§2, 4, 5.1 |
| `src/run.mjs` | Inventory and range resolution, extraction, tag proposals, merging, source-document accounting, persisted run records | `spec.md` §5.2 |
| `fixtures/inventory-fixture.json` | The committed synthetic form of the private inventory | `spec.md` §4 |
| `fixtures/mailbox-fixture.json` | Seven message envelopes pointing at the existing synthetic issue bodies, including an over-matched publication that must never be read | `test-plan.md` §4.3 |
| `test/run.test.mjs` | Every phase 3 exit row, including persistence and the overlapping second run | `test-plan.md` §4.3 |

**Phase 4 — the self-contained review page**

| File | What it is | Specified in |
|---|---|---|
| `src/review-page.mjs` | Pure store-to-HTML generator with embedded data, CSS, verdict state and export | `spec.md` §§8–9 |
| `generate-review-page.mjs` | CLI that writes one disposable review file from a store | `plan.md` phase 4 |
| `build-fixture-store.mjs` | Reproducibly builds the committed 74-story fixture store from phase 3 inputs | `test-plan.md` §4.4 |
| `fixtures/store-fixture.json` | Offline review input, including one unknown verdict to pin round-tripping | `test-plan.md` §4.4 |
| `test/review-page.test.mjs` | Offline Playwright checks for every automated Phase 4 row | `test-plan.md` §4.4 |
| `measure-review-rate.mjs` | Runs the selected three-pass individual-click protocol and reports elapsed time, throughput, p50/p95 state-update latency, completion, and browser errors | `decisions.md` 2026-08-18 |

**Phase 5 — verdicts back into the store**

| File | What it is | Specified in |
|---|---|---|
| `src/verdict-import.mjs` | The addressed verdict/tag importer: later judgment wins, unknown verdicts survive, wrong stores are refused, and duplicate files are complete no-ops | `spec.md` §9 |
| `import-verdicts.mjs` | CLI that loads the durable store, imports one exported sitting, and writes atomically only when it is new | `plan.md` phase 5 |
| `fixtures/verdicts-*.json` | A valid sitting, a wrong-store file, and an open-vocabulary verdict | `test-plan.md` §4.5 |
| `test/verdict-import.test.mjs` | Every Phase 5 rule, including inert story content and a duplicate that does not append a second run | `test-plan.md` §4.5 |

**Phase 6 — Gmail source and private handoff**

| File | What it is | Specified in |
|---|---|---|
| `src/source-contract.mjs` | Matcher validation and the post-search actual-From check shared by fixture and Gmail sources | `spec.md` §§4, 5.1 |
| `src/gmail-source.mjs` | The Gmail implementation of the same `search(entry, range)` / `read(message)` seam: query composition, honest pagination, public envelopes, and HTML/plain MIME reads | `spec.md` §§2, 5.1, 6 |
| `src/private-inventory.mjs` | Strict inventory validation plus atomic mode-0600 read/write; symlinks and group/world-readable files are refused | `spec.md` §§4, 7 |
| `prepare-private-inventory.mjs` | Reads inventory JSON from stdin so private matcher values do not appear in command arguments, then writes the protected file | `plan.md` phase 6 |
| `private-extract-message.mjs` | Two-turn, in-memory handoff: full MIME becomes model context, and only extracted records plus count-only diagnostics leave the second turn | `spec.md` §§3, 6 |
| `finalize-private-harvest.mjs` | Streams safe extraction results into a new private store and review page, refuses replacement, and forces both outputs to mode 0600 | `spec.md` §§6–8 |
| `private/.gitignore` | Keeps the inventory, store, live handoff, and any other mailbox-specific artefact out of Git | `spec.md` §§4, 6 |
| `test/gmail-source.test.mjs` | Query union/intersection, half-open dates, pagination, MIME fallback, read-only operations, full fixture-harvest substitution, and private-file permissions | `test-plan.md` §4.6 |
| `test/private-real-harvest.test.mjs` | Pins the body-to-model boundary, safe second-turn output, mode-0600 store/review files, and overwrite refusal | `test-plan.md` §4.6 |

**Phase 7 — additive tagging and event clusters**

| File | What it is | Specified in |
|---|---|---|
| `.claude/skills/tag-newsletter-stories/SKILL.md` | The model workflow: read a provenance-light brief, judge themes and same-event clusters, then apply or undo one checked pass | `spec.md` §§10.2–10.3 |
| `.claude/skills/tag-newsletter-stories/scripts/tagging-pass.mjs` | Deterministic brief, proposal validation, additive tag/cluster writes, exact set undo, atomic mode-preserving CLI | `plan.md` phase 7 |
| `src/store.mjs` | Adds the `clusters` block beside stories and runs while hydrating older stores with an empty block | `plan.md` §5.4 |
| `src/review-page.mjs` | Renders a cluster as one top-level entry, with the paraphrase and individually judgeable linked members underneath | `spec.md` §10.2 |
| `fixtures/tagging-proposal.json` | A recorded theme-and-cluster pass over the fixture store | `test-plan.md` §4.7 |
| `test/tagging-skill.test.mjs` | Pins tags-only writes, additive reruns, exact undo, and proposal refusals | `test-plan.md` §4.7 |

The constructor for `gmailMessageSource` accepts exactly two connector
operations: `search_emails` and `read_email`. Search pages at 50 and counts the
messages actually returned; it never trusts an estimate. Read requests full
MIME and prefers the inline HTML part, with a link-preserving plain-text
fallback. The transient envelope contains only id, From, labels, subject and
local issue date; snippets, recipients and connector response objects never
cross the adapter, and neither envelope fields nor message bodies enter the run
record beyond its already-specified body-free `source_doc` accounting.

Create or replace the private inventory without putting its values in shell
arguments:

```bash
node initiatives/newsletter-story-harvester/work/prepare-private-inventory.mjs \
  initiatives/newsletter-story-harvester/work/private/inventory.json \
  < /path/to/private-inventory-input.json
```

The 2026-08-18 live handoff used the three user-supplied sources over the
half-open range ending 2026-08-19. It found 14 Yglesias, 4 Fix the News, and 4
Chop Wood Carry Water Extra messages. All 22 passed the post-search matcher
check and had readable inline HTML. The first extraction run made 3 searches,
28 reads, and no writes; the six reads above the 22 unique issues were explicit
handoff rehearsals or retries and are counted rather than hidden. No mailbox
body was written to disk. The ignored private store and review page are mode
0600 and the finalizer refuses to replace either one.

All three sources use the existing Substack redirect shape. The private
inventory therefore names `unwrap: "substack"`; the optional single-HEAD follow
remains off. Opaque recipient-token links lose their query string and carry
`err:unwrap` rather than generating a click or retaining a subscriber token.

The first real extraction produced 169 accepted findings before identity merge
and 163 private review records. Thirteen additional findings were refused as
newsletter chrome or linked section headings. Every issue stayed inside its
declared count band: 0/14 Yglesias, 0/4 Fix the News, and 0/4 Chop Wood Carry
Water issues were flagged. Three findings merged into existing identities, for
a 1.775% merge rate. `decisions.md` records why these observations keep the
bands unchanged and leave optional single-HEAD following off.

The live protocol is intentionally interactive. Feed the connector result,
searched envelope, inventory entry, and harvest timestamp as the first JSON
line to `private-extract-message.mjs`; pass its model context to the model, then
write the returned findings as the second line. Forward only the second JSON
line to a long-running `finalize-private-harvest.mjs` process. Finish with a
count-only JSON object naming expected issues and connector operation counts.
The test file above is the executable reference for the protocol.

Generate a review file:

```bash
node initiatives/newsletter-story-harvester/work/generate-review-page.mjs \
  initiatives/newsletter-story-harvester/work/fixtures/store-fixture.json \
  /tmp/newsletter-review.html
```

Measure the repeatable browser interaction baseline:

```bash
node initiatives/newsletter-story-harvester/work/measure-review-rate.mjs
```

Import its exported verdict file:

```bash
node initiatives/newsletter-story-harvester/work/import-verdicts.mjs \
  /path/to/store.json \
  /path/to/newsletter-verdicts-fixture-store-v1.json
```

The report always includes the §7.1 counters (`added`, `matched`, `merged`,
`conflicted`) plus `updated`, `conflicts`, and a semantic file fingerprint.
The second import of the same file returns `duplicate: true` and does not write
the store or append a run record.

Prepare, apply, or undo a tagging pass:

```bash
node .claude/skills/tag-newsletter-stories/scripts/tagging-pass.mjs prepare /path/to/store.json
node .claude/skills/tag-newsletter-stories/scripts/tagging-pass.mjs apply /path/to/store.json /path/to/proposal.json
node .claude/skills/tag-newsletter-stories/scripts/tagging-pass.mjs undo /path/to/store.json tag-2026-08-19-example
```

The apply command accepts only `theme:` and `about:` slugs, known story ids,
same-event clusters of at least two members within fourteen days, and a proposal
addressed to the store. It writes no story field other than the additive tag
set. The cluster paraphrase lives in `store.clusters`, not tag metadata. Undo
requires the recorded tag-state fingerprint to match, and the CLI preserves a
private store's file mode across its atomic replacement.

Not committed, deliberately: the Gmail inventory, bodies, or private store.
Phase 3's fixture source and phase 6's Gmail source implement the same two-call
seam: search returns envelopes, then the run verifies the actual From address
before it reads a body. That keeps the gating suite independent of the user's
mailbox even after the live handoff exists.

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
| **Measured: eval score per contract** | `decisions.md`, 2026-08-18 — link-list 10/10, annotated-digest 10/10, long-form 4/10 operational; `test/contracts.test.mjs` now pins the repaired one-element-array wire shape against the live-shaped recording |

## Phase 3 exit

`test-plan.md` §4.3, every row, in `test/run.test.mjs`:

| Row | Evidence |
|---|---|
| Explicit range only | Missing bounds are refused; a one-day half-open range returns exactly that day's issue |
| Per-source lookback | `lookback_days` caps the entry's resolved range relative to the explicit `before` date |
| Matcher intersection | An `{ "all": [...] }` group requires both sender and subject while ordinary matcher groups remain a union |
| Repeatable | Two empty stores harvested over the same range get the same id set |
| Second run adds only what is new | The overlapping run matches 49 existing stories and adds the later issues' 25 |
| Every matched message recorded | `empty-issue` has a `source_doc` entry with zero stories and a count flag |
| Not in the inventory, not harvested | Removing `energy-notes` means its issue body is never read |
| Run record | The atomically persisted store records range, inventory keys, per-source issue counts, add/match/merge counts and flags |
| Themes proposed | The fixture tagger's `theme:` values land as ordinary tags |
| A harvester writes no verdict | Every record remains unjudged after both runs |

## Phase 4 automated exit

`test/review-page.test.mjs` opens the generated page from `file://` and covers
self-containment, no store write path, expand/collapse, all sorts, tag filters,
filtered `verdict-rest`, one-action undo, backlog count, unknown verdicts, and
the downloaded verdict-file shape. The remaining phase 4 measurement is the
deterministic three-pass browser click-through selected on review; it is an
interaction-throughput baseline, not a claim about human judgment speed.

## Phase 5 exit

`test/verdict-import.test.mjs` and the browser round-trip test cover every row
of `test-plan.md` §4.5. Against the committed fixture, the CLI imported one
file as `0 added / 3 matched / 0 merged / 0 conflicted / 3 updated`, kept all 74
stories, and recorded fingerprint
`6e2b783695bfa920a789cac5c5c284b7d6a151f52a8e207844ccb431b0a19bf2`.
Importing the same file again left the store byte-for-byte unchanged.

## Phase 6 adapter exit

The complete Node suite now has 101 passing tests. The six Gmail-focused tests
prove the source swaps into a full fixture harvest without changing the run
loop, and that its complete connector vocabulary is read-only. The live
read-only handoff then exercised the exact queries the private inventory
resolves, including the sender-and-subject intersection. The first real
extraction, count-band measurements, merge rate, and real-story review sitting
remain the rest of `test-plan.md` §4.6 rather than being claimed by the adapter.
