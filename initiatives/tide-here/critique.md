# Critique of the plan before building

Written 2026-08-20, before Phase 0. `plan.md` supplies the order and
`test-plan.md` supplies the exits; this document checks whether those two can
actually establish the outcomes in `objectives.md`. It does not settle the two
product decisions identified below.

Numbered references to **O1–O8** are the objectives; **§n** is a section of
`spec.md`.

## 1. Verdict

The plan is unusually strong on the failures that look plausible rather than
broken. It puts the provider boundary, coast-local day model, station selection,
and normalized adapter shape before the page. The test plan uses recorded real
places, fixes every event to an absolute instant, varies the process time zone,
and makes partial failures retain the data that still exists. Those are the
right risks and the right order.

**Phase 0 is ready to run**, with the evidence-bundle clarification in §3.3.
It proves or reopens the static-browser boundary without committing the rest of
the build to it.

The whole plan is not yet ready to run unchanged. Two contradictions must be
settled before their affected phases:

1. Phase 7 retains a 100-entry location history even though O8 says the page
   does not retain a location history.
2. Phase 2's distance rule cannot catch a station that is clearly closest in a
   straight line but belongs to the wrong side of a barrier.

Neither should be hidden as an implementation detail. The first is a product
and privacy decision; the second reopens the coastal-relevance design if an
adversarial real-place fixture proves the gap.

## 2. What should not be lost

1. **Architecture is proved before it is elaborated.** Phase 0 can invalidate
   the direct-static choice in one small experiment instead of after eight
   phases depend on it.
2. **The day model is its own phase.** Coast-local dates, DST bounds, and
   per-instant offsets are pure and can be exhausted before provider or UI code
   makes mistakes look plausible.
3. **Two provider adapters freeze the response shape.** NOAA and CHS differ
   enough that a shared shape passing both is evidence of an adapter, not NOAA
   fields renamed.
4. **The fixtures are real places with awkward geometry.** Boston, Seattle,
   Halifax, the Arctic, Boundary Bay, Denver, and Lisbon make the test data
   argue with the algorithm instead of agreeing by construction.
5. **Partial results are designed before the page.** A tide failure retaining
   place and astronomy is a composition property, not error-message polish.
6. **Deployment records decisions.** Provider policy, library/data versions,
   host choice, and threshold review belong in `decisions.md`, where a later
   run can discover why a number exists.

## 3. Findings

### 3.1 Phase 7 directly contradicts O8

O8 says a typed place or coordinates are used only to resolve and display the
result and that the page **does not retain a location history**. `spec.md` §7
and plan Phase 7 instead append every successful or partial forecast — including
input, resolved place, coast, and station — to a durable 100-entry local history.
Calling it diagnostic, local, visible, downloadable, and clearable improves the
feature; it does not make it cease to be retained location history.

The plan acknowledges the tension but then chooses an interpretation on behalf
of the objective. That is not enough. `objectives.md` defines done, so Phase 7
cannot exit while the documents disagree.

The available decisions are:

| Option | Strengths | Weaknesses |
|---|---|---|
| **A — Remove durable history from version 1** | Matches O8 literally; reduces sensitive browser state and Phase 7 scope; caches can remain short-lived and disposable | Loses the readable diagnostic record and download that motivated §7 |
| **B — Keep explicit local history and revise O8 through a recorded decision** | Preserves the debug/usage artifact; makes local, user-controlled retention an intentional product promise | Changes a stated first-version outcome and adds sensitive-state lifecycle and disclosure work |
| **C — Export on demand without retaining** | Gives a diagnostic artifact when requested while keeping no history between sessions | Cannot show a multi-session history and requires the user to export at the time of interest |

**Recommendation, not a decision:** A for the first version. The product already
has deterministic provider fixtures and can add an explicit one-result export
if debugging needs it. B is reasonable only if local history itself is desired,
not as a relabelling of “does not retain.” A different choice must update the
objective and record why before Phase 7 begins.

### 3.2 The coastal matcher can confidently accept the wrong water body

The 25 km / 60% rule detects *competition between nearby stations*. It does not
detect geography. A station can be 4 km away across a barrier while the relevant
station is 12 km away along the connected coast; 4 km is within 25 km and less
than 60% of 12 km, so the current rule auto-accepts the wrong station with high
confidence. This is exactly the headland/island/estuary failure O2 says must not
be silent.

The existing island and estuary fixture only protects the branch where two
candidates happen to fail the ratio. Add an adversarial real-place fixture
where the hydrologically wrong station is clearly closest by great-circle
distance. Its pass condition is that the page asks or refuses rather than
auto-accepting.

If the current algorithm fails — which its definition predicts — Phase 2 must
reopen §3.2. The choices include a small land/water connectivity mask, explicit
high-risk polygons that always ask, or accepting more manual choices for all
non-obvious inputs. Silently tuning 25 or 60 cannot solve a topological error.

### 3.3 Phase 0 needs an explicit evidence-bundle contract

“Record the responses as fixtures” is directionally right but underspecified.
The Phase 0 artifact should be reproducible and safe enough to become the input
to later contract tests. For each NOAA, CHS, and Nominatim request, record:

- the provider and adapter case;
- the source URL and non-secret request parameters;
- retrieval time in UTC;
- status and the response body exactly as the browser received it;
- the relevant observed CORS behavior and headers;
- licence/policy URL and required attribution text;
- the HTTPS page origin and browser used for the observation; and
- a redaction statement confirming that no requester identifier, credential,
  or unrelated response header was committed.

Use one small valid real response per provider. Synthetic empty, malformed,
500, and timeout fixtures belong to later adapter tests; Phase 0 should not
fabricate provider failures and label them observations.

A successful JavaScript `fetch` proves browser readability more reliably than
trying to read `Access-Control-Allow-Origin` from page code, because response
headers not exposed to scripts may still be visible only in browser tooling.
The harness should record the observation method rather than pretending all
CORS headers are readable application data.

### 3.4 “Live tests do not gate” needs narrower wording

Live checks deliberately do not gate the repeatable build suite, but they do
gate Phase 0 and Phase 8 as recorded human-inspected evidence. The current test
plan says both “live provider tests do not gate” and that Phase 0 exits on them.
The intended distinction is sound; the wording is not.

State it as: **live checks never gate an ordinary deterministic build, but a
dated successful observation gates Phase 0 and Phase 8.** This keeps temporary
provider downtime from making every build red without allowing the static
architecture to proceed on stale assumptions.

### 3.5 The test plan's top-level rule excludes some of its own important tests

Section 1 says every test earns its place by exposing one of two confidently
wrong answers: the wrong coast or the wrong day. But §4 also correctly tests
privacy, keyboard access, provider policy, partial failure, attribution,
history, narrow layouts, and safety wording. Those do not all reduce to the two
named failures.

Keep the tests and widen the rule: a test earns its place by exposing a
confidently wrong answer, keeping failure distinct from success, or pinning an
explicit privacy/accessibility/safety boundary. Otherwise the document argues
against its own strongest non-numeric tests.

### 3.6 There are nine numbered phases, not eight

The plan has Phase 0 through Phase 8. The log calls them eight phases. This is
only bookkeeping, but phase counts appear in handoffs and reviews; call it a
nine-phase plan or call Phase 0 a prerequisite consistently.

### 3.7 “Switch without a bundle change” must remain a deployed-file property

The Nominatim endpoint is supposed to switch through provider configuration
without changing the application bundle. The test should load a separately
deployed configuration file twice and prove the adapter changes. Replacing a
compile-time environment value and rebuilding would satisfy “no source-code
change” while failing the stronger runtime switch the plan relies on.

The switch test also needs a provider-compatible fake or local adapter. It must
not send automated test traffic to a replacement public geocoder.

## 4. Readiness by phase

| Phase | Readiness | Condition |
|---|---|---|
| 0 — Provider reachability | **Ready** | Record the complete evidence bundle in §3.3 |
| 1 — Day model | **Ready** | Preserve the device-zone matrix and DST fixtures |
| 2 — Coastal match | **Needs design evidence** | Add the clearly-nearest-but-wrong-water fixture and reopen §3.2 if it auto-accepts |
| 3 — Tide adapters | **Ready after Phase 0** | Consume dated sanitized fixtures only |
| 4 — Astronomy | **Ready** | Test windows and zero/two-event shapes, not SunCalc itself |
| 5 — Composition/geocoder | **Ready with clarification** | Prove the endpoint switches through a separately deployed config |
| 6 — Page | **Ready after match contract** | The chooser depends on Phase 2's corrected outcomes |
| 7 — Local state/privacy | **Not ready** | Settle §3.1 before implementing durable history |
| 8 — Deployment/review | **Ready when prior exits pass** | Distinguish dated live evidence from the deterministic suite |

## 5. Recommended plan corrections

These are corrections to make as their affected phase begins; they are not a
new feature backlog:

1. Use §3.3's evidence bundle as Phase 0's fixture contract.
2. Add the topological adversarial fixture before Phase 2 and require ask or
   refuse.
3. Settle the local-history decision before Phase 7; do not implement the
   current contradiction.
4. Clarify live-evidence gating, the test-plan purpose, and the nine-phase count
   when those documents are next revised.
5. Exercise the provider switch through a separately deployed configuration,
   not a rebuild.

No additional visible feature should start before the Phase 0 and day-model
risks are retired. The plan is strongest when it resists the temptation to
build the page first; this critique does not change that order.
