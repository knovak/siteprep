---
name: research-package-options
description: Research and maintain travel package options with a comparison table, provider and accommodation reviews, exact dates and costs, party-specific availability checks, rejected options, and research notes. Use when the user says "research package options" or asks to create or refresh this kind of travel comparison.
---

# Research package options

Use this method for a new comparison or an update to an existing one. It
generalizes the Eclipse 2027 research process; the destination, event, dates,
party size, accommodation needs and selection rules belong to the current
request.

The normal deliverable is a **Package options** page with a comparison table
and detailed entries, a **Rejected options / research holding** companion page,
and **Research notes** that let another session continue the work. Honor a
requested report-only or other output format. Read [README.md](README.md) for
the reusable record structure and Siteprep integration.

## Establish the brief

Read the user's request, existing comparison, rejected/holding records and
research notes before searching. Carry forward their constraints, promoted
order, sources, item numbers and decisions. Establish:

- Destination or event, travel window including year, acceptable trip length,
  start/end points and transport constraints.
- Travelers and the actual room/cabin arrangement, accessibility or comfort
  requirements, budget and currency, and acceptable package types.
- Hard exclusions, preferences, what qualifies for the main page, and whether
  waitlists or unconfirmed leads should be shown.

Ask only for missing information that materially affects the research. Begin
independent discovery while awaiting it; label provisional assumptions and do
not declare party suitability without the needed details. Four adults in two
private rooms was the Eclipse brief, not a default for every trip.

For a new comparison, default the main list to in-scope, dated offers with
public availability evidence. Keep unverified, waitlisted and sold-out leads
in the companion record unless the user chooses a broader selection rule.
Record that rule so a later refresh does not silently change it.

## Discover and verify packages

Search broadly across the requested regions and suitable package types:
specialist operators, local providers, hotels, cruises/boats, event organizers
and relevant directories. Use directories and search snippets to find leads;
verify consequential claims on the exact operator departure, itinerary,
booking and terms pages. Open the user's supplied URLs and retain unresolved
ones with the reason they could not be verified.

On a refresh, recheck existing included offers, then eligible holding records,
and also search beyond the existing lists for newly released or missed offers.
Expand paginated or browser-rendered catalogues when needed. If retrieval is
empty, blocked or inconsistent, inspect the rendered page before drawing a
conclusion; a failed retrieval is not proof of closure or sold-out stock.

Deduplicate by underlying operator, itinerary, departure and allocation. Merge
reseller copies while retaining useful source links and price differences.
Separate variants when dates, accommodation, inclusions or eligibility differ
materially. Match similarly named companies, ships and hotels carefully.

For each candidate establish exact start/end dates with year and weekdays,
days/nights, itinerary, included accommodation and transport, and the event or
experience being bought. Check the event venue/date independently when it
determines suitability. For an eclipse, that includes the actual totality
site and relevant authoritative predictions; a country name is insufficient.
Keep uncertain dates, hotel substitutions and approximate locations explicit.

Capture the full fare and its unit (per person sharing, per room, per cabin or
whole charter), original currency, occupancy basis, mandatory fees and known
extras. Separate deposits, optional extensions, discounts and payment-method
conditions. Calculate party totals only from compatible prices and explain
what is missing. Do not sum overlapping allocations or silently compare
currencies. Summarize deposit, cancellation and refund terms from the provider.
Show material conflicts between sources instead of picking the cheaper claim.

## Research provider and accommodation reviews

Assess **the operator and the advertised hotel, ship or other accommodation
separately**. Use independent review platforms and substantive traveler reports;
operator-selected testimonials may supplement these but must be identified.
For unnamed accommodation, record that the accommodation cannot yet be assessed.

Record the exact entity, source URL, rating and scale if available, sample
size, review recency and date checked. Summarize recurring strengths and
complaints relevant to this trip, with examples where useful. Distinguish
operator reliability from hotel quality and advertised star classifications.
Do not transfer a review to a similarly named business or assume that reviews
of another destination establish performance on this itinerary.

State evidence limits: small or old samples, changed management or renovation,
uncertain vessel/property match, substitutions, or no dependable reviews found.
Future departures cannot already have traveler reviews. Attribute serious
complaints as reports or allegations and include a relevant provider response;
syndicated copies of the same report are not independent corroboration.
Any confidence label describes the strength of the evidence, not a new rating.
Explain its basis without importing Eclipse-specific score thresholds.

## Test availability for the actual party

Keep **general package availability** and **requested-party availability** as
separate findings in every entry and in the comparison. Test the exact dated
departure and room/cabin categories in the public booking flow, as far as it
can be inspected without submitting personal data or creating a booking/hold.
Record the tested selections, observed result, source and check date/time zone.

| Evidence observed | What may be concluded |
|---|---|
| Dated provider statement of available/limited places | Provider-reported general availability; party fit still needs evidence |
| Priced selection of the exact departure and requested rooms/cabins together | The flow exposed that priced allocation when checked; disclose any later-confirmation condition |
| Enough named rooms/cabins publicly listed | Published room stock; disclose whether simultaneous allocation needs reconfirmation |
| Traveler quantity selector or four available seats | Traveler capacity only; does not establish two private rooms |
| Separate successful quotes for one room at a time | Does not establish simultaneous stock for several rooms |
| Enquiry form, registration, deposit button or headline fare | Does not establish inventory |
| Explicit sold-out or waitlist notice | Sold out or waitlisted, even if an older selector still offers choices |
| Blocked page, failed booking route or conflicting evidence | Unverified or conflicting; not automatically sold out |

A calculated request subject to later operator confirmation remains
unconfirmed and, by itself, does not qualify as public general availability
evidence for the main list, even when exact rooms can be selected. A separate
current provider statement of stock can establish general availability while
the party allocation remains unconfirmed.

A four-berth cabin, shared gîte, camping or whole-boat charter may
not meet a private-room brief. Say whether the party fits, does not fit or
remains unconfirmed, and give the limiting fact.

Research alone does not authorize contacting providers, submitting traveler
details, making reservations/holds or payments. Complete the public checks and
record what would require contact; use any explicit authorization already
given for those actions without asking again.

## Reconcile and write the three outputs

Use the record structure in [README.md](README.md). The table and detailed
entries must come from one maintained source; do not create a second inventory
to update by hand. Include exact dates, comparable price scope, provider and
accommodation review summaries, and both availability findings. Link each row
to its detailed evidence. Group by the place of the core experience when that
is the basis of comparison, rather than the provider's headquarters.

Keep permanent item IDs and the user's order. Record exclusions with a reason,
sources, check date and a specific next check. Distinguish:

- **User rejection:** a standing choice. Never restore it unless the user asks,
  even when its availability improves.
- **Research holding/exclusion:** not yet qualified because of stock, missing
  facts, mismatch or another documented criterion. Reassess on an authorized
  refresh. Restore only where the comparison's recorded policy permits it;
  otherwise report the new evidence for the user to decide.

If an item's rejection type is unclear, preserve it and report the uncertainty.
Do not remove an included item silently when evidence deteriorates. Update its
status and, where the recorded selection policy calls for a move, preserve the
entry and ID in holding with a dated reason. Keep restoration/movement history
without duplicating the same ID as two live entries.

Research notes preserve the brief, selection rules, search coverage, exact
sources, review evidence, availability tests, conflicts, retrieval limits,
decisions and next actions. Append a dated change record on refresh and retain
prior evidence when replacing a finding. Keep availability and review check
dates separate; rechecking stock does not refresh old review assessments.
Do not change timestamps on records that were not actually revisited.

## Verify and finish

Check that every included offer has a matching comparison row, stable ID,
working detail/source links, exact dates, price basis, review assessment and
both availability findings. Check counts, deduplication, ordering, holding
records, maps, all comparison sort controls and narrow-screen readability.
Unknown values must stay unknown rather than becoming zero, available or a
favorable rating.

For Siteprep, follow the integration and validation instructions in README.md
and the repository AGENTS.md. Report additions, material corrections, movements,
party-fit limitations, unresolved evidence and what was actually checked.
Distinguish a locally validated result from a published page. Publishing,
remote pushes, merges, provider contact and future research schedules follow
the user's existing authorization; this method supplies none by itself.
