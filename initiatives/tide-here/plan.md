# Plan

How Tide Here gets built, in order. `spec.md` says what is made; this says what
is made *first*, and why that order rather than another. `test-plan.md` is its
other half — every phase below ends at a named section there, which is what
stops "phase complete" from being a judgement call.

Numbered references to **O1–O8** are the objectives; **§n** is a section of
`spec.md`.

## 1. What decides the order

Three rules, applied in this priority, produce the sequence in §3.

1. **What could invalidate an architectural decision goes first.** §6.1 chose a
   static page over a serverless function on the strength of a browser smoke
   check: NOAA, CHS, and Nominatim allow cross-origin reads. If that is wrong,
   or becomes wrong, every later phase was built against the wrong boundary.
   Phase 0 turns that one-off check into a recorded, repeatable one before
   anything is built on top of it.
2. **Then whatever a silent wrong answer flows through.** The day model of §5 is
   the extreme case: get it wrong and every tide, sunrise, and moonset lands in
   a plausible row on the wrong day, and nothing fails. It is also pure
   arithmetic over an IANA zone, so it can be settled completely before a single
   provider is called. It is phase 1 for that reason, not because it is easy.
3. **Then the thing another phase would have to be rewritten without.** The
   normalized response of §7 is consumed by the page, the history, and every
   provider adapter. It is fixed in phase 3 with the first adapter and not
   revisited, so the second provider is a new adapter rather than a new shape.

**What the order is deliberately *not* sorted by.** Not by what the initiative is
*about* — the tide table is the product and it is phase 3, behind a phase of
calendar arithmetic. And not by what demonstrates progress: the page is the
visible artefact and it comes sixth, because a five-day table that is confidently
one day out demonstrates worse than nothing.

**Nothing here is blocked on the user.** There is no `data:`, `cost:`, or
`permission:` input this plan waits on: the providers are public and keyless, the
libraries are pinned and local, and the host is "whichever static host is
available" by §9's deliberate design. The one thing a person must do is phase 8's
look at a real phone, and that is at the end where it belongs.

## 2. Four constraints that hold across every phase

All four come from `spec.md` rather than from this plan, and each is cheap now
and expensive to retrofit — which is why they are build rules here rather than
properties to remember.

**Every provider is behind an adapter from the phase it first appears, and the
fixtures are the first implementation.** §6.1 names five seams — `Geocoder`,
`StationCatalogue`, `TideProvider`, `Astronomy`, `TimeZoneLookup`. Above them
nothing knows a provider's name, its payload shape, or its failure vocabulary;
each adapter maps to the §7 shape and the §8 codes and records provider, source
URL, licence, and retrieval time. This is what makes CHS a phase-3 addition
rather than a phase-3 rewrite, and what will make a third country an adapter.

**No component ever sees a provider payload.** An adapter's output is the only
thing that crosses. A component reaching into a NOAA field is a component that
breaks when CHS is selected, and it will break by rendering something plausible.

**The device time zone is never read, for anything.** Not for grouping, not for
formatting, not for "today". §5 makes the selected station authoritative, and
this is the one rule most likely to be violated by accident — every convenient
date function in the language defaults to the thing this forbids. It is stated
as a build rule so that a lint-level check for it (`test-plan.md` §5) is
obviously in scope rather than pedantic.

**Partial stays partial.** §8's rule that a tide failure does not erase place or
astronomy, and an astronomy failure does not empty the tide table, is a property
of the composition in phase 5. It is much harder to add to a page that was built
assuming a whole result, so `forecast` returns partial results from the first
version rather than throwing.

## 3. The phases

Each names what it produces, why it is here rather than earlier or later, and
where it ends.

### Phase 0 — Prove the providers reach the browser

**Produces:** a small recorded harness that, from a real HTTPS page, performs one
request each to NOAA CO-OPS predictions, CHS IWLS, and Nominatim, and records the
response status, the CORS headers actually returned, the attribution the licence
requires, and the retrieval date.

**Why first.** §6.1's whole argument for a static page is that these three allow
direct browser reads. §2's provider audit and §3.1's Nominatim policy notes rest
on the same assumption. A smoke check performed once on 2026-08-19 and written
into a document is not a thing that keeps being true; a provider tightening CORS
is silent until the page is open. If phase 0 fails for any of the three, the
correct response is to reopen §6.1 and take the serverless option for that
provider — which costs a day here and a rebuild anywhere later.

**Not a test of our code**, which is why it is phase 0 and why `test-plan.md`
§2.1 keeps its live form out of the gating suite. What *is* gating from here on
is that the recorded responses become the fixtures every later phase runs
against.

**Exit:** `test-plan.md` §4.0.

### Phase 1 — The day model

**Produces:** the §5 rules as pure functions — resolve coordinates to an IANA
zone from the pinned offline dataset; produce the five coast-local dates
beginning with the one containing "now"; produce the UTC instants bounding each
local day; place a UTC instant into a row, or reject it; and carry the numeric
offset used for each displayed instant.

**Why here.** This is rule 2's case. Every event on the page is an absolute
instant that has to land in exactly one of five local boxes, and the failure mode
is not an error — it is a tide at 11:40pm appearing on the wrong card, or an
entire day shifting for a user in a different zone from the coast. It needs no
network, no provider, and no page, so there is no reason to discover it later.

**The daylight-saving transition is a phase 1 case, not a phase 8 one.** A
five-day span crossing a transition contains a 23-hour and a 25-hour local day,
and §5 requires the response to carry the offset *per displayed instant* for
exactly that reason. Building it now costs one fixture; retrofitting it means
revisiting every row that assumed a day is 24 hours.

**Exit:** `test-plan.md` §4.1.

### Phase 2 — The station catalogue and the coastal match

**Produces:** the cached, normalized NOAA and CHS prediction-station catalogues of
§3.2 step 1, great-circle ranking, and the three-outcome match: accept, ask, or
refuse.

**Why before any tide request.** The match decides *which* station is asked, so a
tide adapter built first would have been built against a station chosen by
"nearest", which is precisely the answer O2 exists to reject. Building the match
first also means the ambiguous and out-of-coverage states are real from the
beginning rather than error paths bolted on.

**The three numbers are configuration from the first line of code.** 25 km, 60%,
and 150 km live in the provider configuration of §9, not in the matcher. §3.2
says the test plan must challenge them with islands, estuaries, inland places,
and the U.S.–Canada border, and a threshold that has to be edited in a source
file to be challenged will not be challenged. Their review after phase 8 is a
`decisions.md` entry, per §4 below.

**Exit:** `test-plan.md` §4.2.

### Phase 3 — The tide adapters, and the response shape

**Produces:** the `TideProvider` seam, the NOAA CO-OPS adapter, the CHS IWLS
adapter, and the frozen §7 response shape they both map into — including datum,
station kind, and the reference/subordinate relationship where the provider
supplies it.

**Why both providers in one phase.** One adapter cannot show whether the shape is
a shape or just NOAA's response with the names changed. Two providers with
different datums, different station semantics, and different request contracts
are the cheapest available proof that the seam is real — and §2 already committed
to both, so this is not speculative generality.

**Both against recorded fixtures.** The live calls happened in phase 0; from here
the deterministic suite runs on recordings with their retrieval dates and
attribution, and the live check is separate and non-gating (`test-plan.md` §2.1).

**Exit:** `test-plan.md` §4.3.

### Phase 4 — Sun and moon

**Produces:** the `Astronomy` adapter over a pinned SunCalc, producing per-row
arrays for sunrise, sunset, moonrise, and moonset, plus the moon phase at local
noon.

**Why after the day model and not with it.** The arithmetic is SunCalc's; what
this phase actually builds is the *windowing* — asking for events inside the UTC
bounds phase 1 produces, at the station's coordinates rather than the user's.
That is a consumer of phase 1, and building it earlier would have meant building
half of phase 1 twice.

**The empty and the doubled day are the point.** §4 chose arrays over slots so
that zero, one, or two events change nothing structurally. A polar always-up case
and a no-moonrise case are ordinary fixtures here, not edge cases deferred — and
`no-event` is a §8 code that renders as "does not rise", never as a failure.

**Exit:** `test-plan.md` §4.4.

### Phase 5 — `resolve`, `forecast`, and the failure vocabulary

**Produces:** the `Geocoder` adapter over Nominatim with its policy obligations
(one request per submit, at most one per second, cached, attributed, switchable
by configuration), reverse geocoding for coordinate input, and the two logical
steps of §6.1 composed into the eight §8 codes.

**Why the geocoder arrives this late.** It is the *first* thing the user touches
and the *last* thing the system needs: everything downstream takes coordinates,
and coordinates can be typed. Building it last means the coastal match, the
adapters, and the day model were all exercised without a geocoder in the way, and
it means the Nominatim policy obligations are implemented once, against a system
that already works.

**This phase is where partial results are decided.** Composition is the only
place `tides-unavailable` can preserve place and astronomy, so §2's fourth
constraint is built here or not at all.

**Exit:** `test-plan.md` §4.5.

### Phase 6 — The page

**Produces:** the form, the three visible names (**You entered**, **Resolved
place**, **Coast**), the station and zone line, five equal day cards, the
ambiguous-coast chooser with its small map, every §8 state rendered, and the
informational-not-for-navigation line that ends every result.

**Why sixth.** A page over a forecast that is right is a layout problem. A page
built earlier would have been the place the day model, the match, and the
failure states got decided by whatever was convenient to render, which is how
"closest available" quietly becomes "your coast".

**Three things this phase owns that no earlier phase can.** Days stack rather
than clipping on a narrow screen; keyboard focus, form errors, coast choices, and
retry actions are all visible; and the cheerful tone comes from colour and small
marks rather than from replacing labels with icons (O7). All three are claims
about a screen, so `test-plan.md` §4.6 is browser-driven.

**Exit:** `test-plan.md` §4.6.

### Phase 7 — Local history, caching, and the privacy statement

**Produces:** the `localStorage["tide-here.history.v1"]` array with its 100-entry
cap, the **Show local history** view with download and clear, the §6.2 cache
tiers and hashed keys, and the page text explaining where a submitted place is
sent.

**Why last of the building phases.** It stores the §7 response, so it needs that
response to be final. It is also the phase most able to do harm — a history
feature that leaks is worse than no history feature — and doing it against a
finished system means there is exactly one place a response is appended.

**The privacy boundary it has to prove, visibly.** The recorded local-history
decision revises O8 to require the §7 history deliberately: it is capped,
local, user-visible, downloadable, clearable, and never transmitted. The
burden remains on the tests: §4.7 proves no application request carries it,
and the page says plainly that it stays on the device until cleared.

**Exit:** `test-plan.md` §4.7.

### Phase 8 — A real URL, live smoke, and the threshold review

**Produces:** the deployed static files at a temporary HTTPS URL, the live
adapter checks against all three providers, and the §3.2 threshold review as a
`decisions.md` entry.

**Not a development phase**, in the sense that no new behaviour is written. It is
a phase because three of its outputs cannot be produced anywhere else: a page on
a real phone at a real URL (O7), proof that the adapters still speak to live
services rather than to recordings, and the first honest look at whether 25 km,
60%, and 150 km were the right numbers.

**The thresholds are reviewed here or they are never reviewed.** §10 is explicit
that they are "reviewed after those tests rather than silently tuned in code",
which means the outcome is a written decision — including "unchanged, and here is
what we checked".

**Exit:** `test-plan.md` §4.8.

## 4. What each phase leaves behind

Every phase ends with three things, and the third is the one that is easy to
skip:

- the exit section passing;
- a `log.md` entry saying what happened;
- **a `decisions.md` entry for anything the phase settled that the spec left
  open** — the coastal thresholds after real inputs, the pinned SunCalc and
  time-zone dataset versions, the chosen host, whether Nominatim's policy still
  fits the usage. A number learned from a real coast and then buried in a
  configuration file is a decision nobody can revisit, and the next reader of
  `25` has no idea whether it was measured or guessed.

## 5. The questions the spec left for this plan

`spec.md` leaves four things genuinely open. Three are answered here by
reasoning; one is answered by evidence that does not exist yet, and this plan
says who produces it and when rather than guessing.

### 5.1 The §3.2 thresholds — *phase 8, on real coasts*

The one that genuinely waits. 25 km, 60%, and 150 km are defensible starting
values and nothing more; whether they produce a sensible chooser on a real
estuary is not a thing reasoning settles. What does **not** wait is the
mechanism: they are configuration from phase 2, and the fixture set that
challenges them — island, estuary, inland, border — is phase 2's exit. Phase 8
changes numbers, if anything, not code.

### 5.2 Which host — *phase 8, and deliberately not before*

§9 requires host-neutral files and forbids the code containing a host URL, which
makes this a deployment choice rather than a design one. Deciding it early would
be the one way to get it wrong: a host chosen in phase 0 becomes a host the code
grows to depend on by phase 6.

### 5.3 Whether the local history is one feature or two — *one, in phase 7*

§7 describes a diagnostic history and §6.2 describes caches, and it is tempting
to build one store for both. They are not the same thing: a cache is disposable
and keyed by a hash, and the history is deliberately readable and exportable by
the user. Merging them would mean a **Clear local history** button that also
drops the station catalogue, or a cache expiry that silently deletes what the
user was told stays until they clear it. Separate stores, separate lifetimes.

### 5.4 Whether the ambiguity chooser needs a map — *yes, and it is why phase 2 precedes phase 6*

§3.2 step 4 asks for "a small map" beside up to three candidates. Distances alone
do not let a person tell an inlet from an open coast, which is the exact
judgement the chooser exists to hand to them. The map is a display of
already-chosen candidates, so it is phase 6's rendering of phase 2's output and
adds no provider.

## 6. What this plan does not decide

- **Anything about version 2's browser location.** §9 establishes it needs a
  secure context and permission-state tests but no new forecast contract,
  because it feeds the same coordinate path. That is a reason not to plan it
  now, not a reason it is easy.
- **A third country's provider.** §2.1's audit is a queue, not a backlog. Adding
  one is a new adapter plus its own licence and CORS check, which is phase 0 and
  phase 3 repeated for that provider.
- **The visual design beyond §7's constraints.** Compact and cheerful is a brief,
  and phase 6 satisfies it or it does not.

## 7. The risks worth naming

**Nominatim is a shared public service and this is its most fragile dependency.**
The policy permits what this page does, but permission is not capacity: a change
in the policy, or growth past one user, moves the geocoder to a hosted service
and possibly reintroduces the proxy §6.1 rejected. This is why §3.1 requires the
endpoint to be switchable by a configuration file rather than a code change, and
phase 5 must demonstrate that switch rather than merely permit it.

**A conservative match is a match that asks too often.** If real coasts trip the
60% rule constantly, the page becomes a chooser with a tide table attached, and
the fix is a number, not a redesign. Phase 8 is where that is discovered; §5.1 is
why it is cheap when it is.

**The offline time-zone dataset ages.** Zones change by legislation. A pinned
dataset is correct on the day it is pinned and drifts silently afterwards —
another case of a plausible wrong answer. Its version is a `decisions.md` entry
in phase 1 so that "when was this last updated" has an answer.

**A five-day static page invites being trusted for more than it is.** Every
result ends with the informational line, and O6 makes it a first-class
requirement rather than a disclaimer, precisely because the page is friendly and
the temptation is to read it as authoritative.

## 8. Global tide coverage refinement

The first version above remains the deployed product while this refinement is
built. The refinement adds three tide-source families behind one provider
registry:

- NOAA CO-OPS and CHS IWLS continue to supply the United States and Canada;
- an annual Australian Standard Ports adapter supplies licensed Bureau daily
  high/low predictions; and
- a clearly labelled FES2022 harmonic fallback covers other coasts.

The refinement introduces server-side storage because neither licensed annual
files nor FES grids belong in a browser bundle. Large, versioned artifacts live
in R2-compatible object storage. D1 is not added unless a later stage proves a
need for relational or searchable metadata; an object manifest is enough to
select an active immutable dataset.

### 8.1 Initialization is a route, not an undocumented deployment step

Every stage that introduces or changes stored data includes a `POST /init`
entry point. It is version-pinned, idempotent, and safe to repeat: versioned
objects are written or verified first and a small active-manifest pointer is
changed last. `GET /health` reports the active version. A hosted `/init` requires
an `INIT_TOKEN`; only a loopback development request may run without one.

`/init` does not contact SFTP or another upstream data service. Downloading,
licence review, decompression, FES/PyFES processing, checksums, and generation of
deployment artifacts happen in a separate preparation job. Initialization only
loads or activates an exact prepared artifact. This keeps a user request from
waiting on a multi-gigabyte transfer and makes rollback a manifest change rather
than a fresh download.

### 8.2 Refinement stages

#### Stage 1 — Storage and harmonic feasibility spike

**Produces:** the R2-shaped object-store adapter, protected and idempotent
`POST /init`, public `GET /health`, a small versioned harmonic tile, nearest-point
lookup, five-day high/low calculation, and a comparison against published PyFES
results.

The committed tile is deliberately a non-FES fixture: observed Brest TICON-3
constituents published in the official PyFES example. This lets the storage and
runtime boundary be tested without redistributing FES2022 or pretending that
AVISO credentials are available. Passing this stage proves the shape and
runtime calculation, not global accuracy.

**Initialization:** `/init` writes the immutable fixture tile and its dataset
manifest, then activates that exact checksum. Repeating it performs no writes.

**Exit:** `test-plan.md` §7.1.

#### Stage 2 — Provider registry and server boundary

**Produces:** one provider registry with NOAA, CHS, Australian Standard Ports,
and FES capability descriptors; a server endpoint for stored providers; and the
existing normalized forecast response unchanged above the adapters. NOAA and
CHS remain direct, official live sources.

**Initialization:** `/init` validates the provider registry schema and the
storage schema version and activates only a registry whose referenced datasets
are present and checksum-valid.

**Exit:** provider selection is configuration-driven, and existing U.S. and
Canadian fixture, live, time-zone, and partial-result tests still pass.

**Status, 2026-08-27:** implemented in `work/phase-10`. The registry and shared
stored-provider gateway are complete; NOAA and CHS remain browser-direct, and a
future national descriptor can be added without changing the gateway.

#### Stage 3 — Australian Standard Ports

**Produces:** an offline importer for the licensed annual Australian table, a
normalized immutable artifact, station catalogue entries, attribution and datum
metadata, and the Australian provider adapter. The importer is the only
component that understands the source-file format.

**Initialization:** `/init` verifies the prepared Australian artifact and its
licence metadata, stores any missing versioned objects, and activates its exact
year/version only after validation succeeds.

**Exit:** several Australian ports and time zones match the source table; dates
outside the loaded year fail explicitly rather than falling through silently.

**Status, 2026-08-29:** active implementation is complete in `work/phase-11`
using all 76 Standard Port PDFs in the Bureau of Meteorology's 2026 state and
territory indexes. The offline job records each PDF checksum, reconstructs
103,597 daily extrema across 10 IANA zones, applies port-local offsets, and
reproduces the committed artifact exactly. A 16-place before/after matrix proves
that all representative gaps are now within the unchanged 150 km guard. The
licensed artifact, source attribution, required disclaimer, rounded-height
parser case, and held-out table comparisons pass before registry `stage-3-v5`
is activated. Secondary Port corrections remain out of scope, and the earlier
synthetic artifact remains only as a deterministic test boundary.

#### Stage 4 — FES2022 global fallback

**Produces:** the credentialed offline FES/PyFES preparation job, coastal tile
index, production constituent tiles, land/missing-data handling, fallback
adapter, provenance, and accuracy comparisons against held-out official ports.

**Initialization:** `/init` checks the complete tile inventory, sizes and
checksums, and atomically activates one prepared FES dataset version. It never
downloads, decompresses, or derives FES data in the request path.

**Exit:** the held-out comparison establishes written tolerances by tide regime;
any result derived from FES is labelled approximate and remains separate from
weather and storm-surge effects.

**Status, 2026-08-29:** complete locally in `work/phase-12`. A credentialed
offline PyFES job extracted five 34-constituent water points from the FES2022b
native grid, recorded the 3,953,139,340-byte source checksum, and round-tripped
every rounded point to within 0.000004 cm of the atlas path. The pre-declared
Maroochydore/Mooloolaba and Bundaberg comparison gates both passed across 20
paired extrema. PyFES identifies the five selected coastal results as bounded
native-mesh extrapolations using 30–39 nodes, which the source metadata records
explicitly. Registry `stage-4-v6` therefore activates the licensed sparse
extract, while official national providers retain priority. This source was
validated on public test Site version 11 on 2026-08-29; version 13 subsequently
superseded that deployment with the `stage-4-v5` non-FES fixture, so the FES2022
source is not active on the current test Site.

#### Stage 5 — Test deployment

**Produces:** a separate test deployment with R2 bindings, the initializer token,
operational logs that exclude submitted locations, and live checks covering all
three source families.

**Initialization:** deployment calls the protected `/init` with the exact
artifact versions tested in stages 3 and 4, then checks `/health` before traffic
is exercised. A second call must report no changes.

**Exit:** U.S., Canadian, Australian, and fallback locations work at the real
HTTPS URL, and failure or denial leaves the current public version untouched.

**Status, 2026-08-30 UTC:** complete on public test Site version 13 at
<https://tide-here-test.ken-novak.chatgpt.site>. The protected initializer
activated registry `stage-4-v5`, the licensed 76-port Bureau 2026 dataset, and
the explicitly non-FES fallback fixture; a second call wrote zero objects. The
live source-family checks passed across all 76 Australian ports, and browser
searches for Port Douglas and remote Cocos Islands passed with source attribution
and no synthetic-data notice on licensed results. The post-check Worker
execution-error count was zero. Evidence is recorded in `work/phase-13`;
production remains untouched at version 6, which already serves the same
`stage-4-v5` registry and 76-port `2026-bom-v2` dataset.

#### Stage 6 — Production release

**Produces:** the committed, reviewed source released to production, monitoring
for active dataset versions and upstream freshness, a rollback procedure, and a
dated release record.

**Initialization:** production `/init` accepts only the test-validated manifest
versions and remains token-protected. Release verifies `/health`, makes one
request per source family, and retains the preceding active manifests for
rollback.

**Exit:** the production site reports the intended versions, attribution is
visible, the live checks pass, and no user request can trigger an upstream file
download or mutate stored data.
