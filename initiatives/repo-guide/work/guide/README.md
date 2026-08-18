# Repo Guide generator

This directory contains the on-request generator described by the Repo Guide
specification. Phase 1 provides the fact resolver and its command-line entry
point. Phase 2 adds the strict section reader, token substitution, and the three
narrative honesty checks. Phase 3 adds all nine authored sections, the
self-contained description renderer, provenance, and its isolated browser
harness. Phase 4 adds separately authored slide text, a self-contained HTML
deck, strict slide-count and copy-length gates, and keyboard navigation.

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

Generate the 13-slide deck and run its offline browser and keyboard checks:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs deck
```

The file is written to `out/description.html`. `out/` is intentionally ignored:
the guide is generated on request and the footer identifies the date and source
commit of that copy. Use `--output <file>` to choose another path or
`--skip-browser-check` only when a caller is deliberately separating generation
from the bundled Playwright harness.

The deck is written to `out/deck.html` under the same rules. It is a single
offline file with inline CSS and JavaScript. Arrow keys and Page Up/Page Down
move one slide, Home and End jump to the boundaries, and Space/Shift+Space also
move forward and back.

Run all Node-level generator tests:

```bash
node --test initiatives/repo-guide/work/guide/test/*.test.mjs
```

The resolver accepts `--root <path>` so its readers can run against the
miniature repositories under `test/fixtures/`. Readers are deliberately narrow:
an unsupported workflow, skill-frontmatter, prompt, or exported-module shape is
an error. There are no defaults and no partial fact sets.

`build/sections.mjs` reads one strict markdown section at a time. Unknown tokens,
literal blocker prefixes, literal budget numbers, backticked stage names, and
stage lists are errors. Bare stage words and uncited facts are warnings. The
module returns structured diagnostics so later renderers can print one report
without reimplementing the rules.

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
only sections marked for slides. Its browser harness opens the generated file
from `file://`, refuses network dependencies, checks all authoritative links,
and exercises forward, back, first, and last keyboard navigation.

The first real description contains nine sections, 1,076 composed words and 23
resolved fact tokens. The per-section baseline and the real drafting-check
results are recorded in `decisions.md`.

Fact keys are registered once with a source label. Registering the same key a
second time fails before any source is read. Dynamic collections use one key per
file (`workflows.<name>` and `skills.<name>`); `initiatives.live` is a shallow
directory read containing only slug, title, and stage.
