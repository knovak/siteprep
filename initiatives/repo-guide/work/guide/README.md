# Repo Guide generator

This directory contains the on-request generator described by the Repo Guide
specification. Phase 1 provides the fact resolver and its command-line entry
point; renderers and content arrive in later phases.

Resolve the live repository facts from the repository root:

```bash
node initiatives/repo-guide/work/guide/build/cli.mjs facts
```

Run the Phase 1 exit tests:

```bash
node --test initiatives/repo-guide/work/guide/test/facts.test.mjs
```

The resolver accepts `--root <path>` so its readers can run against the
miniature repositories under `test/fixtures/`. Readers are deliberately narrow:
an unsupported workflow, skill-frontmatter, prompt, or exported-module shape is
an error. There are no defaults and no partial fact sets.

Fact keys are registered once with a source label. Registering the same key a
second time fails before any source is read. Dynamic collections use one key per
file (`workflows.<name>` and `skills.<name>`); `initiatives.live` is a shallow
directory read containing only slug, title, and stage.
