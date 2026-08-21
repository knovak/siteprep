# Decisions

## 2026-08-20 — Should the first version retain a local location history?

**Keep explicit local history and revise O8.**

Review chose Option B. The first version intentionally keeps the complete
normalized response for up to the 100 most recent successful or partial
forecasts in this browser. The history is user-visible, downloadable,
clearable, and never transmitted by the application.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Remove durable history from version 1** | Matches the original O8 literally; reduces sensitive browser state and Phase 7 scope; caches can remain short-lived and disposable | Loses the readable diagnostic record and download that motivated the specification |
| **B — Keep explicit local history and revise O8** | Preserves the diagnostic and usage artifact; makes local, user-controlled retention an intentional product promise | Adds sensitive-state lifecycle, disclosure, and no-transmission work |
| **C — Export on demand without retaining** | Gives a diagnostic artifact when requested while keeping no history between sessions | Cannot show a multi-session history and requires export at the time of interest |

### What this settles, and what it does not

- O8 now makes the 100-entry local history, its visible controls, and its
  no-transmission boundary explicit first-version outcomes.
- Phase 7 may implement the history described by `spec.md` and `plan.md`; its
  privacy tests remain exit criteria, not optional polish.
- This does not permit application analytics, cloud synchronization, or hidden
  location storage.
- Automatic browser location remains a later version and still requires an
  explicit permission request with manual fallback.
