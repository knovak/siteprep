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
