# Repo Guide generator

This directory contains the on-request generator described by the Repo Guide
specification. Phase 1 provides the fact resolver and its command-line entry
point. Phase 2 adds the strict section reader, token substitution, and the three
narrative honesty checks. Phase 3 adds the first nine authored sections, the
self-contained description renderer, provenance, and its isolated browser
harness. Phase 4 adds separately authored slide text, a self-contained HTML
deck, strict slide-count and copy-length gates, and keyboard navigation. Phase
5 adds the abstract six-step lifecycle simulator with derived vocabulary and
Step, Back, and Play controls. Phase 6 adds source-commit dating and the
simulator's watched-date report. Phase 7 packages the complete
generate-and-check workflow
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

Views are `rail`, `chips`, `paths`, `table`, `stack`, `list`, `cards`,
`documents`, and `initiatives`; omitting `as <view>` picks one from the value's
shape. The `documents` view pairs each document's rendered page title with the
file it lives in, which is the mapping between what a reader clicks on the
published site and what an editor opens in the repository. A
`prefix.*` glob resolves a whole registered collection and only supports
`cards`. A block cites every fact it resolves, so putting a value in a table
discharges the `uncited-fact` warning the same way a sentence would — which is
what stops the warning from pushing values into prose that does not want them.
Block directives are excluded from the literal checks and from the word counts.
The sweep budget table labels `items_per_run` as the current limit, and the work
phase card restates its eligibility in Guide language without changing the
operational sweep prompt.

`build/figures.mjs` holds the twelve inline SVG figures: the repository map,
what an initiative produces, how one is born, the record growing by stage, the
plan critique, the lifecycle rail, the division of labor, blocker triage, one
sweep run, the review loop, the two deployment environments, and the fork
boundary. Each is a pure function of
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
visible words. Deck generation fails outside the 10–24 rendered-slide range;
the current deck renders twenty.

`build/description.mjs` resolves the live facts, compiles every file under
`content/`, verifies each authoritative source link locally, and writes one
HTML file with all CSS inline. Source links are GitHub blob links pinned to the
short SHA in the footer. The Playwright config under `test/` opens that file
directly with `file://`; it needs no server and is not part of the repository's
unrelated site test suite.

`build/deck.mjs` uses the same compiled section and fact records, then renders
only sections marked for slides. A slide takes its layout from what it carries —
`figure`, `data`, or `statement` — so a deck of one repeated shape is no longer
possible. Every slide is white with a navy bar naming the section and the
slide number; only the title slide is dark. The footer names the guide and Ken
Novak and keeps the generated date and source commit. Its browser harness opens the
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

The stage the simulator is showing takes the same orange as the active sweep
phase on exactly the steps where it moved, badge and lifecycle track together.
That flag is derived by comparing a step with the one before it rather than
recorded against the step, so stepping backwards onto a move highlights it the
same way stepping forwards onto it did - including the one deliberate move back
down the lifecycle, which its test demands the walk-through still contains.

`build/dating.mjs` records the last complete human simulator walkthrough and
compares it only with the lifecycle and sweep-phase sources. Simulator
generation returns a report diagnostic when another walkthrough may be due;
unrelated commits do not advance the comparison. There is no separate metadata
configuration file.

The description contains fourteen sections, following one initiative from
wish to archive: what the repository is, what an initiative produces,
starting, shaping and specifying, planning and critique, building and
resting, who supplies what, the sweep, review and merge, decks, demos,
deployment, forking, and sources. The page is documentation-style, with a
sticky sidebar of numbered section links, under the title "SitePrep Repo
Guide"; the deck is white slides with a navy title bar, and only the title
slide is dark. Per-section composed words, resolved
inline tokens, and block counts are reported by generation; the reasoning behind
the scalar/structured split is recorded in `decisions.md` under 2026-08-19.

The lifecycle section reads two views of one more key. `documents.record` is
the whole set of documents an initiative can carry, read from the module's
`DOCUMENTS` export; `documents.titles` is the same source projected to its
titles, because eleven table rows do not fit a slide and eleven chips do. The
stage map beside it stays the *incremental* record - what each stage adds - so
the two blocks answer different questions rather than repeating one.

The deployment section reads two more keys off the same lifecycle module -
`deployments.environments` and `deployments.kinds`, from `DEPLOY_ENVIRONMENTS`
and the values of `DEPLOYMENT_LABELS` - and the `deployment-environments` figure
draws the two lanes from them plus the names of the two deployment skills. That
last dependency is deliberate: renaming either skill fails generation rather
than leaving a diagram quietly describing a procedure that no longer exists.

Fact keys are registered once with a source label. Registering the same key a
second time fails before any source is read. Dynamic collections use one key per
file (`workflows.<name>` and `skills.<name>`); `initiatives.live` is a shallow
directory read containing only slug, title, and stage. A skill fact carries its
`name`, its full `description`, and a derived `summary` — the description's
first sentence, which is what a card shows and what a sentence may cite.

## Releasing to `demos/`

**Generating is not publishing.** The commands above rewrite `out/`, which is
the repository's latest successful generation and nothing else. Readers do not
see `out/` — they see the copy under `demos/Guide to Initiatives/`, and that
copy only changes when someone deliberately releases it.

Release is manual and stays that way. The guide's artifacts are not linked into
site navigation or the build path (`decisions.md`, 2026-08-20): the user runs a
release when they judge that something significant has changed, rather than the
guide re-publishing itself on every commit.

To release, from the repository root:

```bash
python3 .claude/skills/deploy-demo/scripts/deploy_demo.py \
  --source initiatives/repo-guide/work/guide/out \
  --destination "Guide to Initiatives" \
  --title "Guide to Initiatives" \
  --description "Guide to how this repository works, and how you can adopt it for yourself. (The text is AI slop, but the ideas and images are correct.) Please also view this slide deck, and play with this simulator." \
  --root-html description.html \
  --link "this slide deck" deck.html \
  --link "this simulator" simulator.html
npm run build
```

The helper replaces the destination wholly, so a file that a later version of
the guide stopped generating does not survive the release. Its `demo.json` is
rewritten from those arguments too, but the guide's `initiative` and `featured`
fields are carried over from the copy being replaced and named in the output -
they were dropped by hand-repair on the 2026-08-27 release, before the helper
did that. That matters: the
first release (2026-08-19) carried a portable-document panel that was removed
from the generator hours afterwards, and the released copy kept showing it —
along with an orphaned `pdf-dating-preview.html` nothing linked to — because
nothing re-releases on its own.

**Regenerate before releasing, and check what drifted.** The footer of each
artifact names the source commit it was generated from, so comparing the
released copy's footer against `git rev-parse --short HEAD` says whether the
public guide is describing the repository as it is now. Live facts age
independently of the generator: `initiatives.live` renders the current stage of
every initiative, so a release goes stale whenever an initiative advances, not
only when the guide's own code changes.
