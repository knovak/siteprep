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

## 2026-08-22 — Which host and coastal thresholds should the first live validation use?

**Use an owner-only ChatGPT Site and keep 25 km / 60% / 150 km unchanged.**

The first live version is deployed privately at
[Tide Here — five coast-local days](https://tide-here-five-coast-local-days.ken-novak.chatgpt.site).
It is a temporary validation host, not a final public address or a decision about
the later custom domain.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Keep 25 km / 60% / 150 km** *(chosen)* | Accepts clear Seattle and Halifax matches, asks at the Bainbridge and U.S.–Canada boundary ambiguities, and refuses Denver rather than naming a distant coast | The small validation catalogue cannot establish that the values generalize to every coastline |
| **B — Loosen automatic acceptance** | Fewer chooser interactions near a coast | Would turn the deliberately ambiguous island and border cases into more confident claims without evidence that the nearest station is relevant |
| **C — Tighten automatic or maximum distance** | More conservative about station relevance | Would add friction to clear matches or refuse useful coverage without a failing real-coast case to justify it |

### Evidence

- Seattle resolved 0.706 km from NOAA station 9447130, at 5.2% of the next
  candidate's distance, and was accepted.
- Halifax resolved 1.187 km from CHS station 00490, at 0.2% of the next
  candidate's distance, and was accepted.
- Bainbridge's first two subordinate stations were both 1.309 km away, so the
  chooser remained mandatory.
- The border input kept NOAA and CHS choices at 1.855 km and 1.964 km rather
  than selecting across the boundary.
- Denver's nearest prediction station was 1,641 km away and correctly returned
  `coverage-unavailable`.

The live browser check returned readable HTTP 200 responses from Nominatim,
NOAA CO-OPS, and CHS, then rendered five days for Seattle and Halifax. The
current [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
still fits this private single-user page: requests are directly triggered by a
submit, serialized to at most one per second, cached for 24 hours, attributed,
and switchable by configuration; the page has no autocomplete, periodic
request, or bulk lookup.

### What this settles, and what it does not

- The configured thresholds remain the reviewed first-version values.
- ChatGPT Sites is the private host for this validation round.
- A larger station catalogue or a real coastline that produces a wrong
  accept/ask/refuse outcome is evidence to reopen the thresholds.
- This does not authorize public access, choose the final domain, or add a
  third-country provider.

## 2026-08-26 — What should happen when several coasts are plausible?

**Show the closest forecast immediately and offer the other candidates below
it in a collapsed Alternative coasts section.**

The person should always see the closest results. When the coastal matcher
finds several plausible candidates, the page should not stop and require a
choice before showing predictions. It should select the nearest candidate,
display that forecast, and let the person expand **Alternative coasts** below
the results to choose a different one.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Require a coast choice before forecasting** | Avoids making a silent judgement when distance cannot capture islands, inlets, or watersheds | Blocks the most likely result and adds friction before any useful information appears |
| **B — Loosen the ambiguity thresholds** | Makes more matches look unambiguous | Hides useful uncertainty and changes the reviewed matcher without better geographic evidence |
| **C — Show the closest forecast, with alternatives below** *(chosen)* | Gives an immediate useful result while preserving a clear manual override | The closest station is only a distance-based default and may not represent the best local water body |

### What this settles, and what it does not

- The 25 km, 60%, and 150 km matcher thresholds remain unchanged.
- `coast-choice-required` remains an internal resolution state with ranked
  candidates, but it no longer renders as a blocking page state.
- The nearest candidate is used only as the initial forecast. Choosing an
  alternative still reuses the existing resolution without another geocoder or
  catalogue request.
- This does not establish that straight-line distance identifies the most
  relevant side of an island, inlet, estuary, or international boundary.

## 2026-08-27 — What should be the next refinement after Alternative coasts?

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Replace the schematic alternatives view with a geographic coast map** | Adds land, channel, island, and border context to the newly shipped Alternative coasts control | Medium-sized; adds map data or tile-request privacy and attribution work; no observed case yet shows that the current candidate list is hard to interpret |
| **B — Pin a few places on this device** | Makes repeat visits faster and remains local-only | Adds another local-data lifecycle without evidence that repeated entry is the main friction |
| **C — Add concise coverage and Alternative coasts help on the page** | Explains the U.S./Canadian boundary, closest-first behavior, and manual override at the point of use; small and directly complements the shipped refinement | Adds copy to an already compact page and must stay synchronized with the README and live behavior |
| **D — Add another official tide-provider adapter** | Expands usefulness beyond U.S. and Canadian coasts and exercises the provider registry | Large; requires a selected country plus fresh evidence for licensing, attribution, CORS, station semantics, and reliable five-day high/low access |
| **E — Request another proposal round** | Leaves room for new usage evidence or a new idea | Produces no user-visible improvement now |
| **F — Declare the initiative dormant** | Recognizes that the first-version objectives and the selected Alternative coasts refinement are shipped | Only the user may declare dormancy, and first-time visitors still have little explanation of coverage and closest-first behavior |

### Recommendation

**Recommendation: choose C — add concise coverage and Alternative coasts help
on the page.** It is the smallest remaining option tied to visible current
behavior: Alternative coasts now exists, while its coverage boundary and
closest-first default are explained mainly in the README rather than at the
moment someone encounters them. The help should stay collapsed so it does not
displace the forecast on a phone.

### What would change the answer

- A real island, inlet, estuary, or border case where the candidate list is
  hard to interpret would favor A.
- Evidence that people repeatedly re-enter the same places would favor B.
- A concrete need outside U.S. and Canadian coverage, paired with a viable
  official feed, would favor D.
- Materially different usage evidence or a new idea would justify E.
- If the live page already feels complete and no refinement is wanted, F is
  correct.

### What this settles, and what it does not

- Merging this proposal makes `inline-coverage-help` actionable; it does not
  implement the help.
- The implementation should explain current behavior, not change the 25 km,
  60%, or 150 km matcher thresholds or the closest-first selection.
- The page should keep the forecast prominent at phone widths and use wording
  consistent with the user-facing README and privacy disclosure.
- Disagreement is one line: comment `Choose A`, `Choose B`, `Choose D`,
  `Choose E`, or `Choose F` and the proposal can be revised to that option.
