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

## Optional improvement menu — 2026-08-21

These are proposals, not a plan. Any one can be selected as a real todo item,
redirected in review, or left here indefinitely. Closing the proposal pull
request unmerged is also a complete answer.

| Candidate | Why it could help | Likely size | Boundary and evidence |
|---|---|---:|---|
| **Put backup and restore in the collection bar** | `/api/export` already produces the private `bookmark-sorter/v1` backup, but a user has to know the route. A visible **Download backup** action, a last-backup timestamp kept in this browser, and a labelled JSON restore path would make the safety step part of ordinary use rather than a README instruction. | Small | Do not imply the timestamp proves where a file was saved. Test a full export/import round trip and keep captures out of the document. |
| **Add a guided selection builder** | The expression language is powerful but asks a new user to remember `verdict:untriaged`, bare tags, parentheses, and wildcard placement. A small clause builder for verdict, folder, site, and tag could generate the existing expression, leaving the text field available for advanced combinations. | Medium | It must call the same evaluator and display the generated expression; a second hidden query model would make saved selections disagree with the builder. Compare completion and correction rates for the same five selection tasks. |
| **Open a bookmark detail drawer for notes and one-item tags** | Notes are currently read-only and tagging is selection-wide. A focused drawer could show the complete URL, full note, all tags, capture status, and explicit add/remove-tag actions without making every grid card heavier. | Medium | Preserve the grid's bounded DOM and keyboard path. Tag removal needs one-action undo and must never remove a tag that the same action did not add. Test at phone width and with a long selectable note. |
| **Make capture failures explainable and retryable per item** | A failed card currently says only **Fetch failed**. A detail view could distinguish timeout, invalid metadata, rejected image, and storage failure, then offer an explicit metadata retry for that URL. | Medium | Never display or log a private saved URL in a server error. Retry stays user-triggered, bounded, and pass-1 only; it must not turn on the paid screenshot path or make the grid fetch pages during viewing. Measure whether retries recover enough images to justify the control. |
| **Replace native confirmations with app-owned dialogs** | Bulk actions and collection deletion still rely on `confirm()`, while collection rename already had to move away from unsupported browser prompts in the Sites environment. One accessible dialog pattern would keep the count, consequence, confirm, cancel, and focus return under the application's control. | Small | Preserve the current rule: an already-open visible selection does not confirm, while an unopened saved selection does. Verify Escape, keyboard focus trapping, cancel-without-write, and Sites-browser behavior. |

The smallest useful first change is the visible backup action: it exposes a
working capability, reduces recovery risk, and does not alter triage semantics.
The guided selection builder is the strongest usability experiment, but should
be judged with a short task comparison rather than assumed better because it is
more visual.
