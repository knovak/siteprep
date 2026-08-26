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

## 2026-08-26 — Which refinement should Tide Here pursue next?

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Replace the schematic chooser with a geographic coast map** | Gives land, channel and island context when several stations are plausible; directly addresses the hardest coast-selection cases | Medium-sized work with coastline-data or remote-tile privacy and attribution choices; no observed case yet shows that the current chooser caused a wrong or abandoned selection |
| **B — Pin a few places on this device** | Makes repeat visits to a small set of coasts faster while preserving the local-only architecture | Adds another local-data lifecycle and set of controls; there is no evidence yet that repeated entry is the main friction |
| **C — Add concise coverage and coast-choice help on the page** | Brings the existing U.S./Canada coverage, cautious chooser and privacy explanation to first-time visitors at the point of use; small and independently verifiable | Duplicates some README guidance and must stay compact enough not to crowd the phone forecast |
| **D — Add another official tide-provider adapter** | Expands geographic usefulness and exercises the provider registry | Large work with fresh licence, CORS, attribution, station-semantics and live-reliability risk; no target country or demonstrated demand has been chosen |
| **E — Request another proposal round** | Keeps the initiative active while gathering better usage evidence or considering a different idea | Produces no user-visible improvement and leaves the same decision open |
| **F — Declare the initiative dormant** | Accurately recognizes that the shipped public version meets its first-version objectives and keeps optional ideas available for later | Gives up a small, already-identified first-visit clarity improvement; dormancy is a user decision, not one the sweep may enact on its own |

### Recommendation

**Recommendation: choose Option C — add concise coverage and coast-choice help
on the page.** It is the smallest option that addresses a documented gap in the
current experience without presuming usage patterns that have not been
observed. Put the explanation behind a short disclosure so the tide forecast
stays primary, reuse the current supported-country and privacy language, and
verify the result at the phone viewport.

Merging this proposal accepts the recommendation and makes the help refinement
actionable; this pull request does not implement it.

### What would change the recommendation

- A real use case where the schematic chooser makes a coast or station hard to
  identify would make Option A the better next increment.
- Evidence that people repeatedly re-enter the same two or three places would
  favor Option B.
- A concrete need outside U.S. and Canadian coverage, paired with a viable
  official feed, would favor Option D.
- If the current page is already clear enough in real use and no further
  refinement is wanted, declaring the initiative dormant would be the right
  answer instead.
- New usage evidence or a materially different idea would justify Option E.

### What this settles, and what it does not

- The proposed next item is a compact in-page Help disclosure covering current
  coverage, ambiguous coast choice and the existing privacy boundary.
- The exact copy and placement remain implementation details for that item.
- The geographic map, local pins and another provider remain optional ideas,
  not committed work.
