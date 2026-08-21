# Phase 5 corrective review

This increment makes every current-frame joint action and muscle annotation,
every named claim source, and every safety claim independently flaggable. The
flag opens a local report form tied to one exact JSON path.

`src/review-report.mjs` creates a separate, immutable report with movement id,
claim path, optional reviewer identifier, date, kind, severity, note, and an
explicit `record_changed: false`. The page can download or copy that JSON. It
can also construct a pre-addressed email draft when a maintainer supplies a
review inbox; no inbox is invented in this phase, so the email control remains
unconfigured. None of these actions edits the movement record or persists the
report or reviewer identity in browser storage.

`TRIAGE.md` documents the human-only correction path, including reviewed versus
disputed outcomes and source or asset removal. The report stays unchanged as
evidence while a maintainer edits and validates the source record separately.

## Verification

From the repository root:

```sh
node --test initiatives/body-movement-visual-twin/work/phase-{0,1,2,3,4,5}/test/*.test.mjs
./node_modules/.bin/playwright test --config initiatives/body-movement-visual-twin/work/phase-3/playwright.config.mjs
```

The tests resolve every exported claim path, prevent kind/path drift, exercise
download and copy, prove the source fixture remains byte-for-byte unchanged,
confirm reviewer identity is not retained, and simulate correction, dispute,
and source removal while keeping the original report as separate evidence.
