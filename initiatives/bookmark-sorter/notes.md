# Notes

Optional ideas and observations. Nothing here is committed work: no tooling
reads this file, so nothing in it is ranked, selected, proposed, or counted.
Promote an entry by writing it as a real item with
`node scripts/initiatives.mjs add bookmark-sorter <id> --title "..."` when it
stops being optional. See INITIATIVES_VISION.md §6.6.

## Optional measurements from real use

Recorded here rather than as todo items on 2026-08-20 (`decisions.md`). Both are
already instrumented, so the numbers accrue from ordinary sittings and can be
read whenever anyone wants them. Neither gates anything. The intended moment is
after the initiative goes dormant and before improvements start — or never, if
they are not useful by then.

### Triage throughput

**Read:** `triage_sessions.items_judged` and `elapsed_ms` for finished sittings;
the page also displays a live items-per-minute rate, and ending a sitting prints
`Sitting saved: N judged.`

**For:** the throughput target `spec.md` still lacks. `objectives.md` refused to
guess one before there was a measurement to argue from, so the target stays
unset until someone reads this.

**Note:** an average across several ordinary sittings is better evidence than one
staged blind sitting — a single artificial sitting measures a rate nobody works
at. There is no need to avoid selections or otherwise perform the measurement.

### Sweep regret

**Read:** `triage_actions` rows against their `undone_at` — how many sweeps were
applied, and how many were undone immediately afterwards.

**For:** falsifying `spec.md` §8's confirmation rule. The spec claims the
discriminator for asking a confirmation is **visibility, not cardinality**, and
names what would overturn it: sweeps regretted often enough that `undo` is not
sufficient recovery. Frequent immediate undos are an argument for confirming on
the visible path too.

**Not instrumented:** selections opened, and confirmations shown. A confirmation
is a transient `409` plus a browser `confirm()` and is never persisted, so those
two counts need two counters added before they can be read. Only add them if the
undo signal turns out to be ambiguous without them.

## Optional improvement menu — 2026-09-02

These are proposals, not a plan. Any one can be promoted to a real todo item,
redirected in review, or left here indefinitely. The current user guide,
operator runbook, backup format, access boundary, and end-user test procedure
already cover the live product; documentation should be expanded again only
when behavior changes or a real support gap appears.

| Candidate | Why it could help | Likely size | Boundary and evidence |
|---|---|---:|---|
| **Give no-image bookmarks an honest, distinguishable metadata card** | The known blank-card population is the largest visible weakness. A locally rendered fallback based on the saved title and site could make those cards easier to scan without turning on the paid screenshot pass or implying that a page was captured. | Medium | Use only stored bookmark metadata and existing capture state; make the fallback visibly different from an image capture, keep URLs private, and do not fetch another remote asset. Re-run the 10,000-item grid, phone, duplicate-image, and no-image fixtures and compare an ordinary sitting before and after. |
| **Add a private usage-evidence summary** | Sittings and undo records already contain the throughput and sweep-regret evidence described above, but reading raw records makes the optional measurement harder than it needs to be. A small administrator view could summarize finished sittings and immediate sweep undos without adding analytics. | Small | Compute from existing owner-scoped records, disclose exactly what is counted, exclude unfinished sittings, and add no tracking event or cross-user comparison. The summary remains evidence for a later decision, not an automatic product threshold. |
| **Extend selections to saved text** | Tag, folder, site, and verdict expressions are strong once a pile has been organized, while a first pass may remember only a word from a title, URL, or note. A bounded text predicate would help recover those bookmarks before tagging them. | Medium | Define normalization and literal-versus-token semantics before changing the grammar; keep queries collection-scoped and indexed; preserve deterministic saved selections and exports; prove that private notes never enter logs or another user's results. |
| **Add an explicit file bridge for open browser tabs** | The app imports durable bookmark exports, but a temporary research session often exists only as open tabs. A local export/import bridge could turn a browser window into a reviewable collection without granting the Site live browser access. | Medium | Start with a documented, inspectable file format rather than an extension or broad browser permission. Preserve tab order and window grouping as tags, require an explicit import, and never close or modify the source tabs. |
| **Introduce named private collaborators for one collection** | A collection could become useful for a small shared research or review task while keeping every other collection personal. | Large | Add explicit per-collection roles and revocation, retain owner and actor attribution on every write, preview the exact collection being shared, and test that exports, captures, selections, and administrator powers do not leak across the boundary. No public or link-only sharing. |

The strongest next increment is the **honest metadata fallback card** because it
addresses the measured 503 no-image bookmarks without a new vendor, credential,
network request, or privacy boundary. The **usage-evidence summary** is the
smaller choice if the next decision should be guided by ordinary sitting data
before the interface changes.
