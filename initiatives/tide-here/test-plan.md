# Test plan

How we know it works. `plan.md` ends every phase at a section of this document,
so "phase complete" is something that passes rather than something somebody
decides.

Numbered references to **O1–O8** are the objectives; **§n** is a section of
`spec.md` unless it says `plan.md`.

## 1. What testing is for here

`objectives.md` names two failures this initiative is about, and neither is a
crash:

- **"Closest available" presented as "correct for this coast."** A station 40 km
  away across a headland returns a complete, well-formed, entirely inapplicable
  tide table. Nothing errors. The page looks right.
- **A device time zone quietly moving an event into the wrong day.** A late
  high tide slides onto tomorrow's card. Four of the five days still look
  perfect.

Both are plausible results produced confidently. So the top-level rule is
narrower than "test what matters": *a test earns its place by making a
confidently-wrong answer visible, or by proving a failure stayed distinguishable
from a success.* Everything in §4 answers to one of those two.

That rule also settles what **not** to spend tests on. Nobody needs a test that
SunCalc computes sunrise, or that a great-circle formula is a great-circle
formula. What needs testing is the window we hand SunCalc, the zone we format in,
and the station we chose to ask.

## 2. Layers, and what goes in each

| Layer | What it covers | Why there |
|---|---|---|
| **Unit** | The §5 day model: zone lookup, the five local dates, local-day UTC bounds, placing an instant in a row, the per-instant offset. Great-circle distance and the three-outcome match of §3.2 | Total functions of their input, and every place a wrong answer is silent rather than loud |
| **Contract** | A **recorded provider response** in, a §7 response out: NOAA and CHS adapters, datum and station kind, the §8 code each provider failure maps to | This is each adapter with the network held still. Deterministic, fast, and gates every change |
| **Live provider** | One real request per provider: reachable, CORS, licence headers, contract unchanged | Whether the recordings still describe reality. Deliberately **not** in the gating suite (§2.1) |
| **Integration** | `resolve` → closest forecast or alternative selection → `forecast`; adapter failures composed into partial results | The seams where a rule stated in one place is enforced in another |
| **Browser-driven** | The page: five cards, stacking, focus, form errors, closest-first alternatives, every §8 state, history view | O2, O6, and O7 are claims about a screen, so they cannot be checked below one |
| **Manual, once** | One look at a real phone at a real HTTPS URL, and one look at a real estuary's closest result and alternatives | "Compact and cheerful" and "is this the right coast" are judgements, and no automated test makes them |

**Every row except the last two runs with no network at all.** That is a property
of `plan.md` §2's adapters rather than of this document: nothing above an adapter
knows a provider exists.

### 2.1 Why the live provider tests do not gate

A live test fails sometimes for reasons that are not a regression — a provider is
down, a rate limit is hit, the runner has no route out. A test that fails
sometimes gets muted, and muting these would leave the one thing that cannot be
mocked unmeasured: whether NOAA, CHS, and Nominatim still allow a browser to read
them. §6.1's entire architecture rests on that.

So they are kept out of the gating suite on purpose, and `plan.md` §3 makes
phase 0's and phase 8's exit a **recorded result** with a date rather than a
passing run. A result that has to be written down is one somebody has to look at.

The corollary: **every recorded fixture carries its retrieval date and
attribution.** A recording with no date is a claim about the present that stopped
being checked.

### 2.2 The fixtures have to be places, not numbers

A fixture invented by whoever wrote the matcher tests the matcher against its own
assumptions and passes. §3.2's thresholds are challenged by **real coastlines**,
chosen because their geometry is awkward, and pinned as recorded catalogue slices
and provider responses:

| Fixture place | Why it is in the set |
|---|---|
| **A large-range semidiurnal U.S. coast** (Boston area) | The ordinary case, with a tide range big enough that a wrong datum is visible |
| **A mixed-semidiurnal Pacific coast** (Seattle area) | Two unequal highs a day: a row shape that a Boston-only fixture never produces |
| **A Canadian coast** (Halifax area) | CHS instead of NOAA, a different datum vocabulary, and a zone at a different offset |
| **An Arctic station** (Prudhoe Bay area) | Polar always-up and always-down astronomy, in the same response shape |
| **An island or estuary** (Puget Sound, or a Fundy inlet) | Two stations within 25 km that are not 60% apart: the chooser's reason to exist |
| **A U.S.–Canada border coast** (Boundary Bay area) | The nearest station and the correct jurisdiction may differ, across two providers |
| **An inland city** (Denver) | Over 150 km: `coverage-unavailable`, not a distant table |
| **An out-of-coverage coast** (Lisbon) | A real coast, no configured provider: the message must name coverage, not failure |

Exact station ids are whatever the catalogue returns at recording time; the
fixture names the place and pins the response, not a guess about the id.

## 3. Fixtures

- **Provider recordings.** One NOAA `predictions?interval=hilo` response and one
  CHS IWLS predictions response per fixture coast, each with retrieval date,
  source URL, and attribution. Plus one recording per failure mode: empty
  predictions, malformed payload, HTTP 500, and a timeout.
- **Station catalogue slices.** Normalized NOAA and CHS station records for the
  fixture regions, including at least one subordinate station with its reference
  station, and one pair that trips the ambiguity rule.
- **Geocoder recordings.** Forward results for each fixture place, a
  no-match result, a throttled (429) result, and reverse results for a
  coordinate input and for a coordinate with no reverse match.
- **Calendar fixtures.** A five-day span crossing a U.S. daylight-saving
  transition in each direction; a span in a zone with no DST; a span crossing a
  UTC date boundary at the user's end but not the coast's.

Recordings are stripped of anything identifying the requester before they are
committed.

## 4. Phase exit tests

### 4.0 — The providers reach the browser

| Test | Pass condition | Protects |
|---|---|---|
| Cross-origin read, per provider | NOAA, CHS, and Nominatim each return a usable response to a real HTTPS page, with the CORS headers that permit it recorded | §6.1 |
| Licence and attribution recorded | Each provider's required attribution string is captured alongside the response | §2, §3.1 |
| The recording is dated | Every fixture written by this phase carries retrieval date and source URL | §2.1 |
| **A failure here reopens §6.1** | If any provider refuses, the phase's output is a decision about the boundary, not a workaround | `plan.md` §3 |

### 4.1 — The day model

| Test | Pass condition | Protects |
|---|---|---|
| Zone from coordinates | Station coordinates resolve to the expected IANA zone from the pinned offline dataset | O5, §5 |
| Five local dates | The rows are the coast-local date containing "now" plus the next four, for a "now" in several different device zones | O5 |
| **Device zone is never consulted** | The same inputs produce identical rows with the process `TZ` set to four different zones | O5, `plan.md` §2 |
| Local-day bounds | Each row's UTC bounds are local midnight to local midnight in the station zone | §5 |
| A 23-hour and a 25-hour day | Across a DST transition in each direction, bounds and the per-instant offset are correct and the row count stays five | O5, §5 |
| Instant to row | An instant one second before local midnight lands on the earlier day; one second after, on the later | O5 |
| Offset travels | Each displayed instant carries the numeric offset used for it | §5 |

### 4.2 — The catalogue and the coastal match

| Test | Pass condition | Protects |
|---|---|---|
| Ranking | Candidates sort by great-circle distance to the resolved input | §3.2 |
| Accept | A candidate within 25 km and no more than 60% of the next distance is accepted, and no chooser is shown | O2, §3.2 |
| **Ask, on the island fixture** | Two candidates within 25 km that fail the 60% rule return up to three candidates with name, jurisdiction, and distance | O2, §3.2 |
| Refuse | Nothing within 150 km returns `coverage-unavailable`, and the response does not name a station as the user's coast | O2, O6, §3.2 |
| Border case | The nearest candidate across the U.S.–Canada fixture is returned with its own jurisdiction and provider, not the input's | §3.2 |
| Subordinate stations | A subordinate candidate carries its reference station into source details | §3.2, §7 |
| **The thresholds are configuration** | Changing 25/60/150 in the configuration file, with no code change, changes the outcome of the fixtures above | `plan.md` §5.1, §10 |
| Catalogue cache | Station metadata is reused for seven days and then refetched | §6.2 |

### 4.3 — The tide adapters

| Test | Pass condition | Protects |
|---|---|---|
| NOAA to §7 | A recorded NOAA response becomes the §7 shape with its datum, station kind, and id | O3, §7 |
| CHS to §7 | A recorded CHS response becomes the **same** shape, with its own datum vocabulary | O3, §7 |
| **No payload escapes the adapter** | Neither a NOAA nor a CHS field name appears anywhere above the adapter | `plan.md` §2 |
| High and low, every day | Every prediction in range appears on exactly one row, with type and local time | O3 |
| Range covers five local days | The requested UTC range is wide enough for all five rows in the station zone, including across a DST transition | §5 |
| Mixed semidiurnal | The Pacific fixture's unequal highs both appear; nothing is deduplicated by height | O3 |
| Source details | Provider, country, station id and name, datum, source URL, licence, and retrieval time are recorded in `sources` | O3, §6.1 |
| Each failure maps | Empty predictions, malformed payload, 500, and timeout each map to `tides-unavailable` and nothing else | O6, §8 |

### 4.4 — Sun and moon

| Test | Pass condition | Protects |
|---|---|---|
| Events per row | Sunrise, sunset, moonrise, and moonset are arrays, computed in the row's UTC bounds at the **station's** coordinates | O4, §4 |
| **Zero events** | A day with no moonrise renders `no-event` as "does not rise", and the five-day structure is unchanged | O4, O6, §8 |
| **Two events** | A day with two moonrises keeps both, in the same array | O4, §4 |
| Polar | The Arctic fixture's always-up and always-down days are represented, not errored | O4, §4 |
| Never the device zone | Every returned instant is absolute; no formatting happens inside the adapter | O5, §4 |
| Moon phase at local noon | Phase is computed at local noon per row, and the current phase is marked without implying it changes at midnight | O4, §4 |
| Failure is isolated | An astronomy failure maps to `astronomy-unavailable` and leaves the tide rows intact | O6, §8 |

### 4.5 — `resolve`, `forecast`, and failure

| Test | Pass condition | Protects |
|---|---|---|
| **Text and coordinates agree** | The same coastal place entered both ways yields the same resolved place, coast, station, and five dates | O1, "how we will know" |
| Input is preserved | What the user typed survives into the response unchanged | O1, §7 |
| Reverse geocoding | Coordinate input gets a standard name; a failed reverse lookup shows the coordinates rather than inventing a name | O1, §3.1 |
| One geocoder request per submit | Exactly one, no typeahead, and never more than one per second under repeated submits | §3.1 |
| Geocoder cache and attribution | Successful queries are cached for 24 hours under a hashed key; OpenStreetMap attribution is displayed | §3.1, §6.2 |
| **The geocoder is switchable** | Changing only the provider configuration routes `resolve` to a different service, with no bundle change | §3.1, `plan.md` §7 |
| Eight codes, eight states | Each §8 code is produced by its own condition and by no other; `place-not-found` and `geocoder-unavailable` never substitute for each other | O6, §8 |
| **Partial stays partial** | A tide failure preserves place, coast, and astronomy; an astronomy failure preserves the tide table | O6, §8 |
| Alternative selection does not repeat work | Choosing another coast after `coast-choice-required` re-runs neither geocoding nor the catalogue fetch | §6.1 |
| Every result carries the line | "Informational and not for navigation or safety decisions" is present on every successful and partial result | O6 |

### 4.6 — The page

| Test | Pass condition | Protects |
|---|---|---|
| Three names together | **You entered**, **Resolved place**, and **Coast** are all visible at once, with station and zone below | O1, O2, §7 |
| Five equal cards | Five day cards, each separating tides, sun, and moon, with one time format throughout | O3, §7 |
| Time zone is visible | The coast's zone is shown, and no displayed time is formatted in the device zone | O5 |
| Past tide emphasis | Tide events before the current absolute instant render at normal weight; later events remain bold, regardless of the browser zone | O3, O5 |
| Browser location is explicit | **Show here** requests one location only after a click, feeds coordinates through the manual coordinate path, and never watches or requests on load | O7, O8, §9 |
| Location fallback | Permission denial, timeout, unavailable coordinates, or a missing geolocation API leaves the manual selection untouched and gives a readable retry path | O7, O8, §9 |
| **Narrow screens stack** | At a phone width, days stack; nothing is horizontally clipped and the page does not scroll sideways | O7, §7 |
| Alternative coasts | The ambiguous fixture immediately renders five days for its nearest candidate; a closed **Alternative coasts** disclosure appears below the result and reveals the other candidates, distances, and map | O2, §3.2 |
| Every §8 state renders | Each blocking or partial code has a distinct, readable treatment; `coast-choice-required` produces closest-first results with a manual override | O6, §8 |
| Keyboard and focus | Form, errors, alternative coasts, and retry are reachable and visibly focused by keyboard alone | O7, §7 |
| Labels, not bare icons | Sun, moon, and tide marks accompany text labels rather than replacing them | O7, §7 |
| Heights are secondary | Tide type and local time lead; height states its datum and unit in source details | O3, §7 |

### 4.7 — Local history, caches, and privacy

| Test | Pass condition | Protects |
|---|---|---|
| Append | Every successful or partial forecast appends the complete normalized response | §7 |
| 100-entry cap | The 101st append drops the oldest and keeps the array at 100 | §7 |
| View, download, clear | The history view lists time, input, coast, provider, and warnings, expands the raw response, downloads as JSON, and clears completely | §7 |
| **Nothing transmits it** | Across a full session — resolve, choose, forecast, view, download — no outbound request contains any history entry, hashed or otherwise | O8, §6.2 |
| No background requests | No service worker refresh and no periodic provider request occur while the page sits idle | §6.2 |
| Caches are separate from history | Clearing history leaves the station catalogue cache intact; cache expiry never removes a history entry | `plan.md` §5.3 |
| Hashed cache keys | Cache keys are a one-way hash of the normalized query; the plain query is not a key | §6.2 |
| The page says so | The page states that the place is sent to a geocoder and then to the named tide authority, and that history stays on the device until cleared | O8, §6.2 |

### 4.8 — Live, deployed, and reviewed

| Test | Pass condition | Protects |
|---|---|---|
| Live adapters | One real request per provider still satisfies the phase-3 contract; differences are recorded, not patched around | §2.1, §10 |
| Two coasts, two regimes | Two supported coasts in different zones with different tide regimes show all tide, sun, and moon events live | O3, O4 |
| Phone and desktop, real URL | The page loads and is usable from a temporary HTTPS URL on both, without granting location permission | O7 |
| No host in the code | The deployed bundle contains no hard-coded host URL | §9 |
| **Threshold review** | 25/60/150 are reviewed against the real fixture coasts and the outcome is written to `decisions.md`, including "unchanged" | §10, `plan.md` §5.1 |
| Policy review | Nominatim's current policy is re-read against actual usage, and the result recorded | §3.1 |

## 5. The tests that exist to stop a decision drifting

Most rows above check that something works. These check that something *stayed
decided*, and each corresponds to a decision that would be easy to undo by
accident:

- **`TZ` is set to four zones and the rows must not move** (§4.1). The single
  most likely accidental regression in the codebase, because every convenient
  date function defaults to the behaviour §5 forbids. Worth a lint rule
  forbidding zoneless date formatting as well as the test.
- **No provider field name appears above an adapter** (§4.3). This is what keeps
  a third country an adapter rather than a refactor.
- **The thresholds change behaviour from configuration alone** (§4.2). A
  threshold that needs a code edit to challenge will not be challenged, and
  `plan.md` §5.1 defers the actual numbers to phase 8 on that basis.
- **The geocoder switches from configuration alone** (§4.5). §3.1 makes this the
  mitigation for the plan's most fragile dependency; a mitigation that is only
  described is not one.
- **No outbound request carries a history entry** (§4.7). The recorded
  local-history decision makes that an explicit O8 boundary, so it carries the
  burden of proof.
- **`coverage-unavailable` never names a station as the coast** (§4.2). This is
  O2 stated as a prohibition, and it is the failure the whole coastal-match
  design exists to prevent.

## 6. What is not tested, and why

- **Third-party astronomy and geodesy.** SunCalc's algorithms and the
  great-circle formula are not re-derived here. What is tested is the window, the
  coordinates, and the zone we hand them — the parts that are ours to get wrong.
- **Provider prediction accuracy.** Whether NOAA's high tide is correct is
  NOAA's contract, not ours. We test that we asked the right station and put the
  answer on the right day.
- **Version 2's browser location.** §9 establishes it reuses the coordinate path
  entirely. Its permission-state and secure-context tests belong to the phase
  that builds it.
- **Load and concurrency.** One user, a few requests a month. The only rate
  limit that matters is the one we owe Nominatim, and that is §4.5's row.
- **"Compact and cheerful."** §2's manual row, once. A test that claimed to
  measure it would be measuring something else.

## 7. Global tide coverage refinement

### 7.1 — Storage and harmonic feasibility spike

| Test | Pass condition | Protects |
|---|---|---|
| Protected initializer | Hosted `POST /init` is rejected without the configured token; loopback development can initialize without a secret | `plan.md` §8.1 |
| Idempotent initialization | The first call writes the tile, dataset manifest, and active pointer; the second call performs no writes | Stored-data repeatability |
| Activate last | The active pointer is the final write, so an incomplete import never becomes current | Rollback and partial-upload safety |
| Health before and after | `/health` is not ready before initialization and names the exact active dataset afterwards | Operability |
| Missing or distant point | A missing tile or a request beyond the fixture's declared radius fails explicitly | No invented coverage |
| Five-day extremes | A five-day request returns ordered, finite high/low events from the stored constituent tile | Runtime feasibility |
| Independent PyFES comparison | The first five highs and lows for the official Brest example are within 6 minutes and 5 cm of the published PyFES results | Engine feasibility, not FES accuracy |
| Fixture truthfulness | Responses and manifests say the committed tile is TICON-3 test data, not FES2022 | Provenance |

The comparison tolerance includes PyFES's published ten-minute sampling. It is
only a gate for continuing to a real FES ingest. Production tolerances are a
stage-4 decision made against licensed FES tiles and held-out official ports.

### 7.2 — Provider registry and server boundary

| Test | Pass condition | Protects |
|---|---|---|
| Registry validation | Provider ids are unique; status, execution, priority, coverage and stored-data requirements are valid | Extensibility |
| Dataset references | Every non-planned stored provider points to a present checksum-valid dataset before activation | No dangling providers |
| Registry activates last | Dataset initialization completes before the provider-registry active pointer changes | Atomic configuration |
| Production selection | U.S. selects NOAA, Canada selects CHS, and fixture/planned providers are not selected without an explicit test opt-in | Existing coverage |
| New national descriptor | A Korean test descriptor becomes selectable without a gateway code change | Future national sources |
| Direct providers stay direct | Calling the server forecast route for NOAA or CHS returns `direct-provider-required` | Current browser boundary |
| Stored response shape | The harmonic fixture returns the same eight top-level normalized forecast fields as NOAA and CHS | Adapter contract |
| Idempotent `/init` | Repeating Stage 2 initialization performs no writes | Repeatable deployment |

### 7.3 — Australian Standard Ports implementation

| Test | Pass condition | Protects |
|---|---|---|
| Offline import is reproducible | Importing the checksum-recorded compressed Bureau source exactly reproduces the committed prepared artifact | Preparation drift |
| PDF reconstruction | Positioned text from all 12 monthly table layouts reconstructs complete days and alternating high/low extrema; invalid or incomplete layouts fail | Source-parser drift |
| Licence metadata gate | A licensed source or prepared artifact without source URL, per-file integrity, attribution, disclaimer, and licence metadata is rejected | Legal/data boundary |
| Port-local conversion | Brisbane, Sydney, Darwin, Fremantle, and Adelaide local source times become the expected UTC instants, and each explicit source offset must match its IANA zone on that date | O5 |
| Data quality | Duplicate events, wrong-year events, invalid ports, zones, types and heights are rejected | Silent bad imports |
| Stored initialization | The Australian artifact and manifest are immutable and checksum-valid; the Stage 3 registry activates last; repeat writes are zero | Deployment safety |
| Catalogue | The stored catalogue returns 23 normalized Bureau reference ports across all Australian coastal states and the Northern Territory, with seven IANA zones | Provider seam |
| Coastal-region routing | Representative searches around the mainland and Tasmania resolve to a configured reference port within the supported radius | Nationwide major-coast coverage |
| Forecast contract | Each of the 23 licensed ports returns five rows and source-matching high/low time, type and height in the existing normalized shape | Adapter contract |
| Held-out table values | Brisbane, Sydney, Melbourne, Hobart, Port Adelaide, Fremantle, Broome, and Darwin values for 2026-08-27 match independently transcribed PDF times, extrema, and heights | Parser and preparation accuracy |
| Explicit date failure | A request outside the loaded year returns `dataset-year-unavailable` | No silent fallback |
| Fixture separation | The synthetic artifact remains test-only; initialized selection returns the licensed dataset without fixture opt-in and identifies its Bureau PDF | Truthful coverage |

These tests complete the licensed Stage 3 activation gate. The synthetic
fixture still proves failure and disclosure behavior, but is not evidence of
Australian prediction accuracy.

### 7.4 — FES-shaped global fallback implementation

| Test | Pass condition | Protects |
|---|---|---|
| Reproducible preparation | The source extract exactly regenerates the committed tile index and objects | Offline preparation drift |
| Complete inventory | Missing, altered, duplicate, or undeclared tile objects fail size and checksum validation before initialization | Partial uploads |
| FES truthfulness | A test fixture cannot set `isFes2022`; licensed activation requires FES2022 identity, source, licence metadata, and at least 34 constituents per point | Data and legal boundary |
| Atomic initialization | Australian and fallback artifacts are ready before the Stage 4 registry pointer is written; repeating `/init` writes nothing | Rollback safety |
| Provider priority | U.S., Canada, and Australia select their national provider before the fallback | Source quality |
| Indexed lookup | Brest, Galway, and Cape Town load separate candidate tiles and return normalized metre events | Runtime tile seam |
| Land or missing data | A location outside initialized coastal tiles returns `coverage-unavailable` | No invented coverage |
| Approximate warning | Every fallback response says approximate and excludes weather and storm surge; the fixture additionally says it is not FES2022 | User safety |
| Engine comparison | The Brest point remains within six minutes and five centimetres of the independent PyFES example | Runtime feasibility |

These tests prove the production code path, not FES2022 accuracy. Licensed
atlas ingestion and held-out national-port comparisons remain required before
the fallback may be marked active.

### 7.5 — Hosted test deployment

| Test | Pass condition | Protects |
|---|---|---|
| Sites binding | The existing test project declares `TIDE_DATA` R2 and no D1 binding | Minimal persistence |
| Hosted initializer | Missing or wrong bearer token returns 403; the configured token initializes exact Stage 4 versions | Mutation boundary |
| Repeat initialization | The second live `/init` call reports zero created or updated objects | Idempotence |
| Health | Live `/health` names provider registry `stage-4-v2` and both stored dataset versions | Operability |
| Log privacy | Logs contain route, method, status, provider, and duration but no URL, body, place, coast, station, or coordinates | Location privacy |
| Static allowlist | The built Site contains the current UI and runtime dependencies but no initiative records, tests, or preparation tools | Publication boundary |
| Source-family smoke | The real HTTPS URL serves the page, reaches NOAA and CHS catalogues, returns the Australian fixture, and returns the approximate fallback fixture | Deployment integration |
| Production isolation | Only the recorded test project changes; the production Site and release record remain unchanged | Release boundary |

**Recorded result, 2026-08-27:** all eight checks passed on public test Site
version 6. Initialization activated `stage-4-v2`; the repeat call wrote zero
objects; 105 Tide Node tests passed in both the working tree and isolated Site
source; the production Site was not changed.

### 7.6 — Australian browser integration

| Test | Pass condition | Protects |
|---|---|---|
| Combined coastal match | Brisbane and representative major coastal-city searches select stored Australian test ports while existing U.S. and Canadian fixtures still select their direct providers | Provider routing |
| Stored request boundary | Only the selected Australian station, five coast-local rows, and forecast context go to the Site gateway | Request scope |
| Coast-local rendering | The page shows five days in the selected port's IANA zone and retains browser-side astronomy | O3, O4, O5 |
| Source disclosure | Licensed results show the Bureau attribution, disclaimer, dataset version, and selected annual-table PDF; only the synthetic browser fixture shows the exact non-official notice inside the location dropdown | Provenance |
| Partial failure | A failed stored-provider request retains place, coast, station, five day rows, and astronomy with `tides-unavailable` | O6 |
| Privacy copy | The page says Australian tide-port requests reach the Tide Here service and that its operational logs exclude submitted names and coordinates | O8 |
| Full-year source | The committed licensed 23-port artifact covers every date in 2026 with explicit IANA-zone offsets across all seven configured zones, including daylight-saving changes | Stable annual operation |

Australian activation remains governed by §7.3's licence, attribution,
source-comparison, and annual-renewal gates.

**Recorded result, 2026-08-27:** all seven checks passed on public test Site
version 6. Sydney selected the stored Fort Denison test port, returned 20 tide
events across five `Australia/Sydney` days, and displayed the synthetic,
non-official fixture warning. The production Site was not changed.
