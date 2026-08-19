# Repo Guide generator

This directory contains the on-request generator described by the Repo Guide
specification. Phase 1 provides the fact resolver and its command-line entry
point. Phase 2 adds the strict section reader, token substitution, and the three
narrative honesty checks. Phase 3 adds all nine authored sections, the
self-contained description renderer, provenance, and its isolated browser
harness. Phase 4 adds separately authored slide text, a self-contained HTML
deck, strict slide-count and copy-length gates, and keyboard navigation. Phase
5 adds the abstract six-step lifecycle simulator with derived vocabulary and
Step, Back, and Play controls. Phase 6 adds strict PDF-link configuration,
source-commit dating, visible possibly-stale warnings, and the simulator's
watched-date report. Phase 7 packages the complete generate-and-check workflow
as `.claude/skills/generate-guide/SKILL.md`; installing that
skill is intentionally a later delivery step. Phase 8 splits facts by shape so
structured values render as blocks and figures rather than being flattened into
sentences, and rebuilds the simulator around keyed items and the whole
lifecycle.

Resolve the live repository facts from the repository root:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs facts
```

Run the Phase 1 exit tests:

```bash
node --test initiatives/repo-guide/work/guide/test/facts.test.mjs
```

Run the Phase 2 exit tests:

```bash
node --test initiatives/repo-guide/work/guide/test/sections.test.mjs
```

Generate the description and run its offline browser checks:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs description
```

Generate the deck and run its offline browser and keyboard checks:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs deck
```

Generate the lifecycle simulator and run its offline browser checks:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs simulator
```

The file is written to `out/description.html`. The three files under `out/` are
tracked as the repository's latest successful generation. Regenerate them on
request and commit any changed artifacts with the source change that produced
them; the footer identifies the date and source commit of that copy. Use
`--output <file>` to choose another path or `--skip-browser-check` only when a
caller is deliberately separating generation from the bundled Playwright
harness.

The deck is written to `out/deck.html` under the same rules. It is a single
offline file with inline CSS and JavaScript. Arrow keys and Page Up/Page Down
move one slide, Home and End jump to the boundaries, and Space/Shift+Space also
move forward and back.

The simulator is written to `out/simulator.html`. Its choreography is fixed and
abstract: it never reads an `initiative.json`. Stage names, their expected
documents, the proposable and unproposable human blocker classes, sweep phase
names, and the per-run budget resolve from the fact registry at generation.

The walk-through covers the whole lifecycle — every derived stage, including one
deliberate move backwards when an assumption breaks, and the quiet stages at the
end. Items carry stable keys and the item list is *reconciled* rather than
replaced, so an item that survives a step is the same element: it recolours in
place, slides when a neighbour leaves, and collapses out when it merges. That is
the difference between watching a process and paging through screenshots of one.

Two steps choreograph their interesting moment across timed beats rather than
presenting it finished: the sweep run spends its allowance with the meter
filling and greys the passed-over item at the boundary, and the review step
shows feedback being answered before new work starts. `window.simulatorState`
exposes `settle()`, which cancels pending beats and jumps to a step's finished
state — navigation uses it, and so do the tests, which cannot wait on wall time.
Play is paced from narrative length and can be interrupted.

Run all Node-level generator tests:

```bash
node --test initiatives/repo-guide/work/guide/test/*.test.mjs
```

The resolver accepts `--root <path>` so its readers can run against the
miniature repositories under `test/fixtures/`. Readers are deliberately narrow:
an unsupported workflow, skill-frontmatter, prompt, or exported-module shape is
an error. There are no defaults and no partial fact sets.

`build/sections.mjs` reads one strict markdown section at a time. Unknown tokens,
literal blocker prefixes, literal budget numbers, backticked stage names, stage
lists, unresolvable blocks, and **structured values used inline** are errors.
Bare stage words and uncited facts are warnings. The module returns structured
diagnostics so later renderers can print one report without reimplementing the
rules.

The `structured-inline` rule is the one that decides how the guide reads. A
scalar — a count, a command, a single name — belongs in a sentence. A list, a
map, or a set of records does not: flattening one into prose forces every
sentence carrying it into the same "the X are A; B; C" frame, which is what made
the first version read like a machine. Structured values take a block instead.

`build/blocks.mjs` renders those blocks. A section names a directive on its own
line:

```
@fact sweep.budget as table
@fact lifecycle.stages as rail
@fact skills.* as cards
@figure lifecycle-flow
```

Views are `rail`, `chips`, `paths`, `table`, `stack`, `list`, `cards`, and
`initiatives`; omitting `as <view>` picks one from the value's shape. A
`prefix.*` glob resolves a whole registered collection and only supports
`cards`. A block cites every fact it resolves, so putting a value in a table
discharges the `uncited-fact` warning the same way a sentence would — which is
what stops the warning from pushing values into prose that does not want them.
Block directives are excluded from the literal checks and from the word counts.

`build/figures.mjs` holds the inline SVG figures. Each is a pure function of
resolved facts and declares the keys it consumes, so a diagram cannot drift from
the repository; each also namespaces its arrowhead marker, because several
figures share one page. Figures carry no colours of their own — they paint with
`--fig-*` custom properties that the description and the deck each define, so
one source renders correctly on a white page and on a cream slide. Figure and
structured-block rendering also remove horizontal whitespace at line endings so
the tracked generated HTML passes the repository's diff checks without
hand-editing.

The first `---` rule after frontmatter separates page text from slide text.
Further `---` rules divide that slide half into an ordered list, allowing one
section to render as several slides without forking the source. Each slide is
separately authored, may not be a prefix of the page text, and is limited to 90
visible words. Deck generation fails outside the 10–20 rendered-slide range.

`build/description.mjs` resolves the live facts, compiles every file under
`content/`, verifies each authoritative source link locally, and writes one
HTML file with all CSS inline. Source links are GitHub blob links pinned to the
short SHA in the footer. The Playwright config under `test/` opens that file
directly with `file://`; it needs no server and is not part of the repository's
unrelated site test suite.

`build/deck.mjs` uses the same compiled section and fact records, then renders
only sections marked for slides. A slide takes its layout from what it carries —
`figure`, `data`, or `statement` — so a deck of one repeated shape is no longer
possible. The footer names Ken Novak and keeps the generated date and source
commit; the lower-edge navigation uses larger arrows and switches to a bright,
shadowed treatment over the dark title slide. Its browser harness opens the
generated file from `file://`, refuses network dependencies, checks all
authoritative links, exercises forward, back, first, and last keyboard
navigation, and asserts that no slide's content overflows its fixed frame.

`build/simulator.mjs` resolves only four registered fact keys rather than the
whole repository fact set. The selective resolver is what makes the spec's
"reads no initiative data" promise testable: an absent initiatives directory
does not affect generation, while inconsistent lifecycle constants still fail.
Its browser harness steps forward and back across every state, checks the budget
and cascade moments, interrupts and resumes Play, and refuses network
dependencies.

The PDF panel renders only once `config.json` carries at least one entry: an
empty state promoted above the first section told a first-time reader nothing
except that something was missing. When entries exist the panel sits at the end
of the page, next to the provenance it shares.

`config.json` carries the hand-maintained portable-copy data. Each entry in
`pdfs` requires a unique id, label, HTTPS link, and real `YYYY-MM-DD` refresh
date; an incomplete entry stops generation rather than producing a plausible
link. The list begins empty because no current description or deck PDFs were
identifiable on Drive when this increment was built. Once a PDF exists, adding
its entry makes it appear on the description. A refresh date older than the
newest commit touching any registered fact source renders as **Possibly stale**
with both dates, but never blocks generation.

`simulator_watched` records the last complete human walkthrough. Simulator
generation compares it only with the lifecycle and sweep-phase sources and
returns a report diagnostic when another walkthrough may be due. Unrelated
commits advance neither comparison.

The description contains nine sections. Per-section composed words, resolved
inline tokens, and block counts are reported by generation; the reasoning behind
the scalar/structured split is recorded in `decisions.md` under 2026-08-19.

Fact keys are registered once with a source label. Registering the same key a
second time fails before any source is read. Dynamic collections use one key per
file (`workflows.<name>` and `skills.<name>`); `initiatives.live` is a shallow
directory read containing only slug, title, and stage. A skill fact carries its
`name`, its full `description`, and a derived `summary` — the description's
first sentence, which is what a card shows and what a sentence may cite.
