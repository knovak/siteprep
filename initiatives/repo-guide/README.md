# SitePrep Repo Guide

The Repo Guide explains how one person and a set of AI agents share work in
this repository. It follows an initiative from its first wish through shaping,
planning, building, review, release, and eventual rest. The guide is generated
from repository facts, so stage names, blocker classes, sweep limits, skills,
and live examples come from the same sources the process uses.

## Choose the version you need

- [Read the guide](https://knovak.github.io/siteprep/demos/Guide%20to%20Initiatives/description.html)
  for the complete explanation, source links, and diagrams.
- [Present the slide deck](https://knovak.github.io/siteprep/demos/Guide%20to%20Initiatives/deck.html)
  for a concise walkthrough. Use the arrow keys, Page Up/Page Down, Home, End,
  Space, or Shift+Space to navigate.
- [Step through the simulator](https://knovak.github.io/siteprep/demos/Guide%20to%20Initiatives/simulator.html)
  to watch items, blockers, sweep choices, review, and stage changes. Use
  **Step**, **Back**, or **Play**.

Each version is one self-contained HTML file. It can be opened from the web,
saved locally, or sent as an attachment without a server or supporting assets.

## How to read the guide

Start with **What this repository is** if SitePrep is new to you. The numbered
sidebar follows the same path as a real initiative:

1. begin with the wish and optional background research;
2. shape objectives and specify the result;
3. plan and critique the work before building;
4. let the sweep pick eligible work without taking decisions or authority from
   a person;
5. review and merge pull requests; and
6. deploy a test copy, then release only when a person asks.

Diagrams and data blocks are derived from the repository. Composed explanatory
prose is dated and linked to its source commit in the footer. If a fact cannot
be resolved or the narrative contains a stale literal where a live fact belongs,
generation fails instead of producing a plausible but incomplete guide.

## Regenerate it after the process changes

Ask an agent to **generate the Repo Guide**. The repository's `generate-guide`
skill rebuilds the description, deck, and simulator and runs their Node and
offline-browser checks. The generated files are kept under
`initiatives/repo-guide/work/guide/out/` as the latest successful generation.

For a manual run from the repository root:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs description
node initiatives/repo-guide/work/guide/build/cli.mjs deck
node initiatives/repo-guide/work/guide/build/cli.mjs simulator
node --test initiatives/repo-guide/work/guide/test/*.test.mjs
```

Review all three files and their provenance footers before committing the
regenerated outputs. The generator's technical details and individual test
commands are in
[`work/guide/README.md`](work/guide/README.md).

## Preview and release

Generating is not publishing. The public Demo remains unchanged until a release
is requested.

- Ask to **deploy the Repo Guide test site** when you want a temporary preview.
- Ask to **release the Repo Guide** only when the committed output is ready to
  replace the public Demo.

The release replaces the complete `demos/Guide to Initiatives/` destination
from the generated `out/` directory, retaining its initiative and featured-demo
metadata. It does not edit production implicitly, and a successful generation
does not count as release authorization.

## Where to look when something is wrong

- Generation or fact-resolution failures: `work/guide/build/` and the exact
  source path named by the error.
- Narrative or slide copy: `work/guide/content/`; change the shared section
  source rather than hand-editing generated HTML.
- Browser, keyboard, overflow, or offline behavior: `work/guide/test/`.
- Optional future improvements: [`notes.md`](notes.md).
- Release history and the public commit: [`releases.md`](releases.md).

Never hand-edit the three files under `out/`. Change their source or renderer,
regenerate, inspect the result, and commit source and output together.
