# Test plan

How we know it works. `plan.md` ends every phase at a section of this document,
so "phase complete" is something that passes rather than something somebody
decides.

Numbered references to **O1–O8** are the objectives; **§n** is a section of
`spec.md` unless it says `plan.md` or `story-record.md`.

## 1. What testing is for here

`objectives.md` names the failure this initiative is about: **a long-form column
yielding thirty footnote-sized items, and doing it silently.** That is not a
crash, a wrong number, or a page that fails to load. It is a plausible result,
produced in bulk, that looks like a productive harvest.

So the top-level rule is narrower than "test what matters": *a test earns its
place by making a wrong extraction visible, or by protecting the speed at which
stories are judged.* Everything in §4 answers to one of those two.

It also means the usual shape of a test suite is wrong here in one place. Most of
this system is deterministic and testable in the ordinary way; the part that
decides whether any of it was worth doing is a model reading prose, and a model
does not return the same words twice. **§2 splits that in half** — everything
around the model's words is asserted, the words themselves are scored — and that
split is the single most important decision in this document.

## 2. Layers, and what goes in each

| Layer | What it covers | Why there |
|---|---|---|
| **Unit** | `url_key` construction and the unwrap table, identity for both cases of `story-record.md` §3, the case 2 merge, the §9 verdict-file rules, the count-band check | Total functions of their input, all places a silent wrong answer is possible, none needs a model or a mailbox |
| **Contract** | A fixture issue plus a **recorded model response** in, records out: shape handling, `text_is_summary`, `url` and `source_anchor` meaning, the §3.2 override, `err:count` tagging | This is the extractor with the one non-deterministic part held still. It is deterministic, fast, and gates every change |
| **Eval** | The same fixture issues with a **live model call**, scored against a recorded rubric | Whether the contracts actually work. Deliberately *not* in the gating suite (§2.1) |
| **Integration** | Fixture source → run loop → store; store → page; page export → store | The seams where a rule stated in one place is enforced in another |
| **Browser-driven** | The page: expand and collapse, sort, filter, `verdict-rest`, `undo`, the backlog count | O7 is a claim about a screen, so it cannot be checked below one |
| **Measured** | Review rate, eval scores per contract, count-band flag rate, cross-source merge rate | Numbers that decide things (`plan.md` §4) rather than numbers that pass or fail |
| **Manual, once per phase** | A sitting with a real store | "A themed archive nobody reads" is the failure `objectives.md` warns about, and no automated test detects it |

**Every row above except the last two runs without a mailbox and without a
model.** That is the answer to the question the item asked, and it is a property
of `plan.md` §2's seam rather than of this document: extraction takes a
*document*, not a message, and the model call is one function that can be
replaced by a recording.

### 2.1 Why the eval layer does not gate

An eval fails sometimes for reasons that are not a regression, and a test that
fails sometimes gets muted. Muting the eval would leave extraction quality
unmeasured, which is the one thing this initiative cannot afford — so it is kept
out of the gating suite on purpose, and `plan.md` §3 makes each phase's exit a
**recorded score** rather than a passing run. A score that has to be written down
is one somebody has to look at.

What keeps the scores comparable is that the fixtures do not move. The same
column is scored every time, so a falling score means the prompt changed, not the
material.

### 2.2 The fixtures have to be messier than we would write

A fixture written by whoever wrote the contract tests the contract against its
own assumptions and passes. The adversarial issues in §3 are therefore **derived
from real newsletters** — the user's own, with addresses and tracking parameters
stripped — rather than composed to exercise a rule. What survives from the real
issue is the mess: the sponsor block, the unsubscribe footer, the heading that
reads like a headline, the citation that reads like a link.

This is also why `plan.md` §3 puts a real harvest in phase 6 and calls it a
calibration rather than a test. The fixtures are for the pipeline; real issues
are the only honest input to the contracts.

## 3. Fixtures

Committed under this initiative. Small enough to read and diff, and carrying no
address, no tracking parameter and no message id.

**The issues**

- **`link-list-typical.html`** — 40-odd links across several sections, with the
  chrome every real newsletter has: a sponsor block and an unsubscribe footer.
  The chrome is in the *typical* fixture rather than an adversarial one, because
  it is in every real issue and a contract that only meets it in a hard case has
  the difficulty exactly backwards.
- **`link-list-headings.html`** — *adversarial (§15)*. Section headings that look
  like items, and one heading that is itself a link.
- **`annotated-digest-typical.html`** — 8 items with paragraphs, one of them
  three paragraphs long. That item is the fixture's point: the contract's failure
  mode is splitting it into three stories.
- **`long-form-citations.html`** — *adversarial (§15)*. A column with 25 inline
  citations. Expected yield: exactly one story.
- **`long-form-roundup.html`** — *adversarial*. A source declared `long-form`
  that this week is a link roundup — §3.2's per-issue override, and the case
  that decides whether the override is real or aspirational.
- **`empty-issue.html`** — an issue that matched a sender and yields nothing.
  §5.1 requires a `source_doc` for it anyway.

**The rest**

- **`inventory-fixture.json`** — §4's form, naming the fixture sources with their
  shapes and unwrap rules.
- **`redirectors.json`** — wrapped URLs in the shapes the named senders use,
  including one that cannot be unwrapped and must be kept and marked.
- **`overlap-a.html` / `overlap-b.html`** — two sources carrying the same
  article, wrapped by two different redirectors. The case 2 merge, and the reason
  `story-record.md` §4 exists.
- **`responses/`** — a recorded model response per issue per contract, which is
  what makes the contract layer deterministic.
- **`store-fixture.json`** — a store with a few hundred stories, for the page and
  its measured rate.
- **`verdicts-good.json`**, **`verdicts-wrong-store.json`**,
  **`verdicts-unknown-verdict.json`** — §9 files, valid and not.

## 4. Phase exit tests

Each section is the gate for the matching phase in `plan.md` §3.

**Rows beginning `Measured:` need a person, real material, or both**, as does
§2's once-per-phase sitting. A phase can be entirely written, fully green, and
still not exit — "code complete" and "phase complete" are two states, and only
the second is what `plan.md` §3 gates on.

### 4.0 — The mailbox reaches

Not software, so the exit is evidence rather than a passing suite: §14's first
row filled in with what was actually observed, and a `decisions.md` entry.

Four observations, and the last two are the ones likely to disappoint:

- A search by **from-address** over a date range returns the expected messages.
- The **message body** comes back in a form the extractor can read.
- A search by **Gmail label** works.
- **Several matchers union**, as §4's `match` field requires — or, if not, what
  it costs to run them as separate searches and merge the message lists.

### 4.1 — The store, and identity

| Test | Pass condition | Protects |
|---|---|---|
| Atomic write | A crash mid-write leaves the previous store intact and readable | §7 |
| One generation kept | After a write, the previous version is recoverable | §7 |
| Unwrap table | Every shape in `redirectors.json` yields the publisher URL; the unwrappable-not one is kept as-is and marked | `story-record.md` §4 |
| Normalisation | Case, fragment, `utm_*`, `fbclid`, `gclid` and a trailing slash on an empty path collapse; **a differing query string does not** | `story-record.md` §4 |
| Identity with a URL | `(source, issue_date, url_key)` is stable across two computations of the same story | O3 |
| Identity without one | `(source_doc, source_anchor)` is stable, and is what a long-form record uses | O3 |
| **Re-import is a no-op** | The same records imported twice: same count, `harvested_at` unmoved, no verdict touched | O3, §7.1 |
| Cross-source merge | `overlap-a` and `overlap-b` records become one, both sources kept, earliest `issue_date` kept, absorbed id in `merged_from` | `story-record.md` §3 case 2 |
| Merge is inspectable | Every merge is recoverable from `merged_from` alone | `story-record.md` §3 |
| Import never deletes | A subset import leaves the records absent from it untouched | §7.1 |
| Judged beats unjudged | A null verdict never displaces a real one, in either direction | §7.1 |
| Id collision, different record | Reported and skipped, never overwritten | §7.1 |

### 4.2 — The three contracts

The contract layer is table-driven: one fixture issue, one recorded response, one
expected record set.

| Test | Pass condition | Protects |
|---|---|---|
| `link-list` yield | `link-list-typical.html` yields one story per story link — and **none** from the sponsor block or the unsubscribe footer | §3.1 |
| Headings are not stories | `link-list-headings.html` yields no story for a section heading, including the one that is a link | §3.1, §15 |
| `annotated-digest` yield | The three-paragraph item is one story, not three | §3.1 |
| `long-form` yield | `long-form-citations.html` yields **exactly one** story; no citation becomes one; `url` is the column's own or null | §3.1, O2 |
| `text_is_summary` | `true` on `long-form` only | `story-record.md` §1 |
| **Text is never invented** | On both verbatim shapes, every `text` appears in the source document, modulo whitespace | §3.1 |
| Per-issue override | `long-form-roundup.html` extracts under `link-list`, and `shape` on the records is the override — what was extracted, not what was expected | §3.2 |
| Count band flags | A yield outside the band writes `err:count` on every story from that issue and reports it; **the stories are still written** | §3.2 |
| The loud case, by name | A `long-form` source yielding more than one story is reported first and named, not counted | §3.2, O2 |
| Nothing of the mail survives | No HTML, no attachment, no image reaches a record, a log or a temporary file | §6, `plan.md` §2 |
| **Measured: eval score per contract** | Each contract run live against its fixtures and scored against a recorded rubric; the score and the rubric written to `decisions.md` | `plan.md` §5.2 |
| **Measured: the count bands** | The yield each contract actually produces on the fixtures, and the bands chosen from it | §3.1 |

The long-form summary is scored, not asserted. Everything around it is asserted,
which is `plan.md` §5.2's argument in table form: the count, the flags, the
identity and the verbatim text are all checkable, and they are the parts a
silently wrong extraction gets wrong.

### 4.3 — A whole run

| Test | Pass condition | Protects |
|---|---|---|
| Explicit range only | A run without a date range is refused; "since last time" does not exist | O1, §5.1 |
| Per-source lookback | A source with `lookback_days: 14` searches no earlier than fourteen days before the run's exclusive `before`, without widening a narrower requested range | §4, §5.1 |
| Matcher intersection | A matcher group requiring sender and subject returns only messages satisfying both; sibling groups still union | §4, phase 0 |
| Repeatable | Two runs over the same range against the same fixtures produce the same set of ids | O1, §3.3 |
| Second run adds only what is new | An overlapping range adds the new issues' stories and nothing else | O3 |
| Every matched message recorded | `empty-issue.html` produces a `source_doc` and no stories | §5.1 |
| Not in the inventory, not harvested | A fixture issue from a source absent from `inventory-fixture.json` is never fetched | §4 |
| Run record | Issues per source, added, matched, merged, flags — written to the store | §5.2 |
| Themes proposed | Harvest-time `theme:` tags land as ordinary tags, indistinguishable from typed ones | §10.1 |
| A harvester writes no verdict | After any run, every new record's `verdict` is null | `story-record.md` §5 |

### 4.4 — The review page

| Test | Pass condition | Protects |
|---|---|---|
| Self-contained | Opened from the filesystem with the network disabled, it renders fully | §8 |
| No write path | Nothing in the generated file can write the store; its only output is the §9 file | §1.1, `plan.md` §2 |
| Expand and collapse | Collapsed shows title, source, date, verdict; expanded shows text and link | O5, §8 |
| Sort | Story date falling back to issue date, plus issue date, source, and unjudged-first | O5 |
| Filter by tag | Any tag including `theme:`; this is how a theme is a page | O4, §8 |
| **`verdict-rest` respects the filter** | Applies to everything **visible and unjudged**, so changing the filter changes what it means | O7, §8 |
| `undo` reverses a sweep as one action | Fifty swept, one undo restores all fifty | §8 |
| Backlog count | Correct after every action, and shown at all times | O7 |
| Unrecognised verdict displays | A store carrying `to-be-shared` renders and round-trips it | §11, `story-record.md` §1.2 |
| **Measured: interaction throughput** | Three fresh automated passes over `store-fixture.json` alternate individual verdict clicks until backlog zero, recording elapsed time, clicks per second, p50/p95 click-to-state-update latency, completion, and browser errors in `decisions.md`; it is never labelled human review speed | O7, `decisions.md` 2026-08-18 |

The rate is a recorded number, not a threshold. There is nothing to compare it
against until it exists — and it is the first evidence for or against the whole
runtime decision, which chose a page over a conversation on exactly this claim.

### 4.5 — Verdicts back into the store

| Test | Pass condition | Protects |
|---|---|---|
| Round trip | Verdicts given on the page arrive in the store against the right stories | O7 |
| Idempotent | The same file imported twice changes nothing the second time | §9 |
| Verdicts and tags only | A file carrying story text, a new story, or a deletion is ignored, not trusted | §9 |
| Later wins | Two sittings imported out of order resolve by `verdict_at` | §9 |
| Unrecognised verdict stored as given | `verdicts-unknown-verdict.json` loads and round-trips | §11 |
| Wrong store refused | `verdicts-wrong-store.json` is refused with both ids shown | §9 |
| Run record | The import reports added, matched, merged, conflicted | §7.1 |

### 4.6 — The real mailbox

The first real harvest, and the exit is evidence as much as assertions:

| Test | Pass condition | Protects |
|---|---|---|
| The seam held | Swapping the fixture source for the Gmail one changes nothing above it | `plan.md` §2 |
| Read-only | No label, no archive, no mark-read, no draft — asserted over the connector calls the run makes | O-scope, §6 |
| Inventory drives scope | Only sources in the inventory are searched | §4 |
| **Measured: count-band flags** | How often a real issue falls outside its contract's band, per source | §3.2 |
| **Measured: the merge rate** | How often two sources really did carry the same article — the number that says whether unwrapping earns its keep | `story-record.md` §4 |
| **Manual: a sitting on real stories** | A month of real issues reviewed end to end, and it is faster than reading the newsletters would have been | O7 |

That last row is the whole initiative, and it is the one no automated test
replaces.

### 4.7 — The tagging skill

| Test | Pass condition | Protects |
|---|---|---|
| Tags only | It writes no verdict, no text, no title, no identity, no merge | §10.3, `story-record.md` §5 |
| Additive | Re-running adds tags rather than replacing them | §10.3 |
| **Undoable as a set** | The run record names the tags the pass added, and removing that pass's tags restores the previous state exactly | `plan.md` §5.6 |
| Origin is invisible | Nothing distinguishes a proposed tag from a typed one | §10.3, §13.1 |
| Cluster renders as one | A cluster shows one entry with its paraphrase, members underneath, each keeping its own link, source and date | O6, §10.2 |
| A verdict on a cluster reaches each member | The backlog still counts stories, and a member can still be judged individually | O6, §10.2 |
| The paraphrase is in the store | Held in the `clusters` block, not on a tag; the page makes no model call | `plan.md` §5.4, §13.1 |

### 4.8 — Publishing

| Test | Pass condition | Protects |
|---|---|---|
| Kept and emphasised only | Nothing dropped or unjudged appears | O8, §12 |
| No verdict controls | The published file has no way to judge anything | §12 |
| **Provenance does not travel** | `source_doc` and `source_anchor` appear nowhere in the output, including in any embedded data | §12, §6 |
| Same generator | The published page is the §8 renderer with two arguments changed, not a second renderer | §12 |

## 5. The tests that exist to stop a decision drifting

Most of the rows above check that something works. These check that something
stayed *true* — each pins a decision that an ordinary, reasonable change would
undo, and each names the change it is guarding against.

| Pinned | The drift it prevents |
|---|---|
| A count-band flag is written and reported, never suppressed | The band gets widened until the flag stops firing, and §3.2 becomes decorative |
| On verbatim shapes, `text` appears in the source | Someone improves the prose, and the reader can no longer judge whether the source was worth reading |
| Identity is structural, never derived from model output | An id becomes a hash of the text, and every re-harvest duplicates the pile |
| No mail HTML anywhere — store, log, or temporary file | A raw body is retained "for debugging" and §12's published page stops being safe by construction |
| The page has no write path to the store | A direct-write convenience is added, and the disposable thing gains authority over the durable one |
| A harvester writes no verdict | An "obvious junk" pre-drop is added, and the backlog O7 counts quietly shrinks |
| A tag is a bare free string with no per-tag metadata | The cluster paraphrase gets hung off its tag, and §13.1's selection language becomes unreachable |
| An unrecognised verdict round-trips | A reader starts validating against the vocabulary, and the open vocabulary closes |
| Import never deletes | A "sync" is added, and a subset export starts removing stories |
| `source_doc` never reaches a published page | Provenance is added back for debugging and a message id ships to whoever opens the file |

## 6. What is not tested, and why

- **The model's prose.** Scored in the eval layer against a rubric, never
  asserted against an expected string. `plan.md` §5.2 is the argument; the short
  version is that the summary is the one deliverable the model actually writes.
- **Real mail, in the gating suite.** Everything below phase 6 runs against
  fixtures. A suite that reaches a mailbox fails for reasons unrelated to the
  change under test, and needs a credential to run at all.
- **The Gmail connector's own behaviour.** Not ours. Phase 0 establishes what it
  can do and phase 4.6 asserts only that we ask it for nothing that writes.
- **Anything held out of the first version** — publication as an OpenAI site,
  writing back to the mailbox. The one thing tested on their behalf is the store
  format, which §13 says is what makes the D fallback cheap.
