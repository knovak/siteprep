# Plan

1. Record the wish and evaluate the two existing applications.
2. Vendor the selected UI, domain modules and SQL, with source hashes and commit provenance. Remove server bindings and identity/capture services.
3. Add SQLite/WASM bindings, transactional local dispatch, durable snapshot storage, backup/restore, and local image attachment.
4. Build a self-contained HTML distribution with pinned dependencies.
5. Exercise parity, failure cases, offline direct-file use, persistence/reload and responsive UI. Run the repository build, review screenshots, and open a ready-for-review PR.

## Plan critique

The hardest risks are silent persistence failure, multiple tabs overwriting data, security of imported links/images/databases, and claiming offline feature parity while retaining network calls. Address these with atomic save-and-rollback, revision checks, validated import surfaces, a restrictive content security policy, and browser tests which deny network requests. A full snapshot per action favors portability over very large database performance; measure a representative 5,600-item collection and record the limitation.

## After the first experiment

Verify direct-file persistence and recovery in Safari and Firefox before claiming those engines are supported. Human use and a later graduation decision follow the verified Chromium implementation; neither is evidence this automated run can provide.
