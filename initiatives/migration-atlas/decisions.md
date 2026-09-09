# Decisions

## 2026-09-07 — Adopt the existing atlas as an initiative

The user requested an initiative for the working World Migration Atlas in `demos/world_migration_atlas/`, with “all the relevant documents” and “no code changes, just file migrations.” The supplied implementation plan and specification must be adopted without modification. The README may be reorganized if all its content is preserved. The wish is the supplied text and must link to `prompts.html`.

**What this settles.** The supplied `SPECIFICATION.md` becomes `spec.md`, and `IMPLEMENTATION_PLAN.md` becomes `plan.md`, with identical bytes. The supplied README is preserved in full within the initiative README. Existing development instructions and test reports in those documents are historical project records; the current request does not authorize reimplementation, new research, image generation, or a new tutorial.

**Migration arrangement.** The agent uses `migration-atlas` as the initiative slug and the default medium value. The existing demo is recorded as an output, and an unchanged copy of its nine files becomes the initiative's `work/` source. Keeping the released snapshot in `demos/` preserves its URL and prevents this adoption from removing or replacing production. The copies may diverge only through later authorized work and release; the production demo does not load anything from `initiatives/`.

The repository source takes precedence over other code in the local download folder. The three named Markdown documents are the adopted attachments. Build scripts and tests described by the historical README are absent from the repository demo and are not reconstructed or imported as part of this request.

## 2026-09-07 — Test first, production later

The user requested: “proceed to do a test deployment as part of this PR. we'll do a prod deployment only after testing”.

**What this settles.** Use the existing demo deployment kind, with `initiatives/migration-atlas/work` as source and `world_migration_atlas` as destination. The repository build publishes the source to a separate Pages preview. This adopts the existing public demo's deployment model; it does not create a separate hosted application.

**What remains open.** The user's test findings and explicit authorization for a production release. The initiative rests at `dormant` after adoption, with blocked testing/release follow-ups, because no additional implementation work was requested. Resume it when those inputs arrive. Historical implementation phases are retained as history, not seeded as new actionable build tasks.

## 2026-09-07 — The development package arrived, and where it goes

The user supplied `migrationatlascomplete2.zip` as the complete July 2026 code
base, two months after the atlas was written. It holds what the first adoption
looked for and could not find: `src/core.js`, `src/app.js`, `tools/build.py`,
the vendored d3 modules, the T1-T7 test suites with their eight goldens, and the
T8 editorial checklist.

**What this settles.** The package is committed under `lib/`, which is where
AGENTS.md puts an initiative's capability. The atlas can be changed again: edit
`lib/data/migrations.json`, run the tests, rebuild. The blocker recorded in
`test-plan.md` as "recovering the development package is separate work" is
closed.

**The bundle is reproducible.** The package's own build produced a file 195
bytes short of the published one, differing in four places: the `<title>`, one
CSS rule for the header link, the header line carrying the tutorial links, and a
comment in `app.js` - branding edits made to the bundle after the snapshot was
taken. They are ported into `lib/src/`, so `python3 lib/tools/build.py` now
rewrites `work/index.html` byte for byte. The published atlas is provably the
output of the committed source, which is the property that makes the source
worth keeping.

**Why `work/` was trimmed.** `work/` is the deployment source: the branch
preview publishes it and a release copies it to `demos/world_migration_atlas/`.
It now holds only what is served - `index.html`, `prompts.html`, `prompts.txt`.
Four things left it. `index-initial.html` was byte-identical to `index.html`, so
the "initial version" was not one. `dist/migration-atlas.html` was an older
build than the file beside it, and is now a build output rather than a committed
file. `src/index.html` was a shell with no JavaScript, superseded by the real
sources. `data/` is a build input, and belongs with the build. This cuts the
published preview from 4.8 MB to 1.27 MB.

**What that means for the next release.** A release removes those four from
`demos/world_migration_atlas/` as well. Nothing links to them: the demo's index
entry is hardcoded in `scripts/build.sh` and points at the demo root and the two
tutorial documents. Until someone releases, production keeps serving them, and
the atlas it serves is byte-identical either way.

**What was not done.** `spec.md` and `plan.md` remain the preserved originals.
The package's `README.md` matches the one already preserved in `README.md`,
hash for hash, so nothing was re-adopted. No application behavior changed: the
only edits to source files are the four that reconcile the build with the
already-published bundle.


## 2026-09-09 — Keep a blank opening map at 1000 AD

**Move the two start dates to 1001.** The user chose this after the sweep
explained that starting the timeline at 1001 would still show two ongoing
migrations.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| Open at 999, preserving dates | Provides a blank map before the earliest recorded movements | Changes the desired opening year |
| Move the two approximate starts to 1001, opening at 1000 — chosen | Keeps the desired opening year with no flows or circles | Changes an approximate date for presentation, without new historical evidence |

### What this settles, and what it does not

- Romani migration and Indian Ocean slave trades now start at 1001; population
  values, end dates and coordinates stay as recorded.
- The timeline includes the year before the first migration, so Home and the
  opening view are blank and the first event jump reaches 1001.
- This is a display convention, not independent source verification or a
  production-release decision.

## 2026-09-09 — Playback frame-rate target

**60 fps is preferred, 30 fps is acceptable.** The user supplied this exact
wording after asking about the inherited 17 ms threshold.

### What this settles, and what it does not

- The specification and current README use the requested wording.
- Performance acceptance permits frame times up to 1000/30 ms for the median
  and p95, while reporting the measured frame rate against the 60 fps preference.
- Browser-specific results describe the test machine; the requirement does not
  certify performance on untested physical devices or authorize a release.
