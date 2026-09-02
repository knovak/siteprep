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

## 2026-08-27 — May licensed Australian annual tide data be activated?

**Yes. Licensed annual data and its reuse terms are approved for Australian
activation; replace the synthetic fixture with real functionality.**

### What this settles, and what it does not

- The licensing and reuse-authorization blocker is settled for the Australian
  annual tide data.
- The Australian provider may be marked active once the real annual artifact,
  required attribution and disclaimer, source checks, and live initialization
  all pass.
- Synthetic Australian values must not be presented as the activated result.
- The exact official source files, their integrity records, and the attribution
  shown by the product still have to be recorded and verified by the
  implementation.
- This does not authorize a Tide Here production release; the current work
  remains on the public test Site until separately promoted.

## 2026-08-28 — What should follow the nationwide Australian test?

**Expand the licensed Bureau Standard Port catalogue before a production
release or further FES2022 work.**

The 23-port dataset proves the annual-table pipeline and gives every Australian
coastal state and the Northern Territory at least one tested reference port. It
does not yet justify calling the coverage nationwide: the existing 150 km
relevance guard correctly refuses several populated or strategically distinct
coasts between those ports.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Release the current 23-port catalogue** | The active test dataset is official, attributed, checksum-verified, and healthy across all configured ports | It would turn a deliberately bounded major-port test into the production coverage promise while known coastal gaps remain |
| **B — Add the remaining useful Bureau Standard Ports and a national gap matrix** *(chosen)* | Uses the same approved annual-table terms, importer, storage contract, and exact-source checks; closes known gaps with official predictions instead of guessing | Requires a larger annual acquisition and verification set, and does not remove the need for a separate yearly renewal process |
| **C — Increase the 150 km maximum match distance** | Makes more place searches appear covered without adding data | Can attach a distant port across islands, headlands, bays, or different tide regimes; it weakens the reviewed coast-relevance safeguard |
| **D — Prioritize the FES2022 fallback** | Would eventually cover coasts that have no national table | Licensed atlas files and held-out official-port comparisons are still unavailable, and approximate model output is a worse next step where exact Bureau tables already exist |

### Evidence

- On public test Site version 8, registry `stage-4-v4` served all 23 configured
  Australian ports from `2026-bom-v1`: a fresh live pass returned 447 events
  across five days with no failed port, warning, approximate result, or missing
  official source.
- The recorded browser matrix passed Brisbane, Cairns, Sydney, Melbourne,
  Hobart, Adelaide, Perth, Broome, and Darwin, covering every coastal state and
  the Northern Territory at a representative-city level.
- Fresh browser searches for Eden, Devonport, Cooktown, and Thursday Island
  returned `coverage-unavailable`; the guard refused them rather than silently
  naming a distant configured port.
- The Bureau's current 2026 tables include [Eden and other additional New South
  Wales Standard Ports](https://www.bom.gov.au/oceanography/projects/ntc/nsw_tide_tables.shtml),
  [Devonport and other Tasmanian Standard Ports](https://www.bom.gov.au/oceanography/projects/ntc/tas_tide_tables.shtml),
  [Thursday Island and other Queensland Standard Ports](https://www.bom.gov.au/oceanography/projects/ntc/qld_tide_tables.shtml),
  and [six Victorian Standard Ports beyond Melbourne](https://www.bom.gov.au/oceanography/projects/ntc/vic_tide_tables.shtml).

### What this settles, and what it does not

- The 25 km / 60% / 150 km matcher thresholds remain unchanged. Coverage grows
  by adding official stations, not by relabelling distant predictions as local.
- The next increment expands Standard Ports first and records a repeatable
  representative-place gap matrix before and after the catalogue change.
- Secondary Port corrections remain a later parser and modelling decision; they
  are not assumed to have the same independent daily-table contract.
- This does not authorize a production release, supply licensed FES2022 files,
  or settle the 2027 annual-data renewal procedure.

## 2026-08-29 — Where may expanded Australian coverage be deployed?

**Deploy expanded Australian coverage to Tide Here's existing public test and
production Sites, now and in the future.**

### What this settles, and what it does not

- The 76-port 2026 Bureau Standard Port catalogue may replace the current
  Australian dataset on `https://tide-here-test.ken-novak.chatgpt.site` for
  live verification and on
  `https://tide-here-five-coast-local-days.ken-novak.chatgpt.site` for
  production use.
- This is standing deployment permission: future Australian coverage
  expansions and refreshes may be deployed to both recorded Sites without
  asking for deployment permission again.
- Every deployment must still use committed source, preserve the Sites' public
  access settings, pass the applicable build and deployment checks, initialize
  stored data safely, and complete live verification. Permission is not a
  waiver of release gates.
- The current actionable todo remains the test deployment and its
  representative-place checks. A production deployment is authorized when a
  separately scoped release task is run; this decision alone does not mark
  either deployment complete.
- This permission does not authorize a new Site, an audience or access change,
  unapproved data or reuse terms, FES2022 activation, or matcher-threshold
  changes. Those remain separate decisions even when a later deployment is
  already authorized.

## 2026-09-01 — May the merged validated global FES2022 fallback be deployed?

**Yes. Deploy the merged FES2022-capable source and its verified global coastal
package to Tide Here's existing public test and production Sites.**

### What this settles, and what it does not

- Test version 15 and production version 7 may run the same merged source,
  preserving both existing URLs and public access settings.
- Each Site receives its own checksum-verified copy of dataset
  `fes2022b-global-coast/2026-08-29-global-coast-r1` in its private R2 store;
  neither depends on a database, a public static data file, or a runtime atlas
  download.
- Official configured NOAA, CHS, and Bureau sources continue to outrank FES.
  The fallback may be used only through its 40 km sampled-point selection
  guard when official coverage declines or is too distant or ambiguous.
- Every FES result remains an approximate harmonic estimate relative to the
  model mean-sea-level datum, excludes weather and storm surge, and is not for
  navigation or safety decisions.
- This does not authorize a new Site, an access change, a different FES source
  or licence, a wider selection limit, or removal of the official-source
  priority and interpretation disclosures.

## 2026-09-02 — What should follow the global FES2022 release?

This is a **proposal for the user's decision**, not a decision already made.
The global FES2022 fallback is now deployed to test and production, the
official-source priority and model limitations are documented, and the
remaining menu consists of optional product refinements rather than unfinished
release work.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **Replace the relative alternatives plot with a geographic coast map** | Makes islands, channels, borders, and station placement legible when several official coasts are plausible | Medium-sized interface and coastline/tile work for a path that already shows the closest forecast and named alternatives; no recorded use yet shows that the relative plot causes a wrong choice |
| **Pin a few places on this device** | Gives repeat visitors a direct route back to familiar coasts; small, local-only, and independent of provider coverage | Adds another local state and control whose value depends on people returning to the same places |
| **Add more inline coverage and alternative-coast help** | Could reduce first-use uncertainty about official versus approximate results | The current result, source details, safety copy, privacy disclosure, and README already explain the provider and FES boundaries; more copy may crowd the forecast without evidence of misunderstanding |
| **Add another official national provider** | Improves official precision and datum semantics in one more country | Large recurring licence, availability, station, and test obligation; the global FES fallback has reduced the immediate coverage gap without removing the value of future official sources |
| **Declare the initiative dormant** | Avoids speculative refinement after a complete, released product and leaves the initiative ready to revisit when real friction appears | Adds no convenience for repeat use and gathers no new evidence about the remaining ideas |

### Recommendation

**Recommendation: add a small device-local pinned-places list.** Keep it
separate from the 100-entry diagnostic history and disposable forecast caches;
label it as device-local; provide explicit remove and clear controls; and make
opening a pin an intentional action that triggers the normal resolution path.
Creating, listing, or removing a pin must not contact a geocoder or tide
provider.

This is the smallest option that adds ordinary-use value after the global
release without changing provider precedence, match thresholds, licences,
deployment access, or the privacy boundary. It should reuse the saved display
value rather than treating an old resolved station or model point as permanently
correct.

### What would change the recommendation

- Recorded confusion or wrong choices in ambiguous official-station cases
  would make the geographic coast map the better next increment.
- Evidence that people misunderstand approximate FES results would move inline
  help ahead of pins.
- Sustained demand in one country plus verified favourable provider terms would
  justify another official adapter.
- Evidence that the Site is not revisited, or a preference to stop until real
  friction appears, would make dormancy the better answer.

### What this settles, and what it does not

- Merging this proposal makes the pinned-places increment actionable.
- It does not deploy either Site, change public access, or authorize a
  production release of the future increment.
- It does not choose synchronization, accounts, a new provider, or a geographic
  map, and it does not make diagnostic history into a favourites list.
