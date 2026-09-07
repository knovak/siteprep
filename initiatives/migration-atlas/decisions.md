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
