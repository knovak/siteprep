# Notes

Optional ideas nobody has committed to. Promote one with `add` when it stops
being optional.

## 2026-09-02 — Optional refinement menu

These are possible later improvements, not commitments. The simulator redesign
below is already an actionable item and is intentionally not duplicated here.

| Candidate | Why it could help | Likely size | Boundary and evidence |
|---|---|---:|---|
| **Add a worked pull-request trail to the description** | The guide explains the lifecycle abstractly. One compact, real example linking a wish, decision, plan item, branch, review, merge, test deployment, and release would help a newcomer verify how the pieces connect. | Medium | Derive every link and state from one completed initiative; label it as an example rather than the only valid route; omit private review content; and fail generation when a referenced file or commit disappears. |
| **Provide a downloadable guide bundle** | The three self-contained files travel independently, but a newcomer may want one obvious download containing the description, deck, simulator, and a short index. | Small | Generate the bundle from the same successful outputs, include hashes and the source commit, add no second copy of the narrative source, and keep publishing an explicit release action. |
| **Run a dedicated accessibility review** | Keyboard navigation and overflow are tested, but the current exit suite is not a full screen-reader, contrast, zoom, or reduced-motion review across all three renderings. | Medium | Record human and automated findings separately; preserve offline operation; test at high zoom and with reduced motion; and do not call automated checks proof of screen-reader usability. |
| **Add presenter notes to the deck** | The deck is concise enough to present quickly, but a first-time presenter has to infer transitions and the intended point of dense diagrams from the long description. | Medium | Author notes in the shared section files, keep them out of the projected frame, make them printable or separately visible to the presenter, and retain the deck's copy and overflow gates. |
| **Show public-version freshness before release** | The artifact footers name their source commit, while checking whether the public Demo lags still requires a manual comparison. A release preview could summarize which generated files and live facts changed. | Small | Report drift without auto-publishing, distinguish source changes from live-initiative data changes, and never treat a green comparison as release authorization. |

The smallest useful next step is the **public-version freshness preview**: it
uses provenance already present in every file and makes the manual release
decision easier without weakening it. The **worked pull-request trail** is the
stronger teaching improvement if newcomer comprehension, rather than release
operations, becomes the next priority.

## 2026-09-02 — How the simulator should change

The description and the deck were rewritten on 2026-09-02. The simulator was
left as it was. If it gets the same treatment, these are the changes worth
making, roughly in order of value.

- **Match the new look.** White page, navy accent, the same figure palette as
  the description, and the title "SitePrep Repo Guide: lifecycle simulator".
  The dark left panel and the two-column card layout read as a different
  product from the other two files.
- **Show the whole lifecycle rail at the top and keep it visible.** The stage
  track exists but is small. Make it the same rail the lifecycle figure draws,
  with the current stage filled and the documents added so far beneath it, so
  the simulator and the figure look like one thing.
- **Add the steps the new guide covers and the old walk-through skips.**
  Background research at the wish stage (optional, so show it as a fork:
  "research first, or not"), the critique-the-plan item before the first
  increment, the two items that entering the refining stage seeds, and a
  release step that writes to production only when the person asks.
- **Show who acts on each step.** Colour each step by actor, using the same
  amber-for-person and blue-for-agent scheme as the figures, and put "you
  merge" on every step where the person's merge is what moves the stage.
- **Show the pull request, not just the item.** Each increment should visibly
  become a branch, then a pull request, then a merge, with the write-scope
  check and the branch preview named. The current walk-through goes from
  "item actionable" to "item merged" with nothing in between.
- **Show the digest.** When a step leaves a question waiting on the person,
  show the digest issue gaining a line, and losing it when the person answers.
- **Plain second-person narrative.** The step narratives still carry the old
  register ("The record exists before any of the work does, which is the whole
  trick"). Rewrite them in the same voice as the description.
- **A free-play mode, later.** The objectives explicitly held this out of the
  first version. It is still the larger build, and still not the first thing
  to do.
