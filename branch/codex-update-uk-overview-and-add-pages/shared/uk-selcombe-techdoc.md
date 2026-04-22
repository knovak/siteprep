# UK Deck Techdoc Addendum: Selcombe (Salcombe) Topics

## Update summary
Added two traveler-information topics to `decks/uk/sections/selcombe/overview.html`:
- **Local Taxis**: prebook guidance, operator list, and fare ballparks.
- **Burgh Island**: tidal-access explanation, Sea Tractor guidance, and location block (name, summary, address, map link, access-hours note).

## Content conventions used
- External provider pages are linked directly from operator/place names.
- Fare guidance is explicitly marked as ballpark and confirmation-at-booking.
- Tidal access is described as time-dependent and weather-dependent for safety.
- Location blocks include:
  - name
  - brief summary
  - street address
  - Google Map link
  - concise access-hours statement

## April 2026 content-link refinement
- Updated `decks/uk/sections/selcombe/overview.html` so source URLs are embedded directly in the relevant topic bullets instead of being separated into standalone "Source links" lists.
- Applied this to:
  - **Ferries around Salcombe** (operator/schedule links moved into the matching ferry bullets)
  - **Travel from London** (Totnes, Tally Ho 164, route-estimate, and day-ticket links moved inline)
  - **Travel from Exeter** (airport, bus timetable, rail planner, Tally Ho 164, Traveline, and Apple Taxis links moved inline)
- Removed the redundant source-list subsections after integrating links into body text.

## April 2026 UK deck expansion (Inverness + Edinburgh)
- Updated `decks/uk/index.html` to:
  - add a UK overview highlight for **Rick Stein's Seafood Restaurant** in Padstow, with address, map link, and official URL.
  - expand the UK table of contents from 1 section to 3 sections.
- Added new section page: `decks/uk/sections/inverness-and-regional/overview.html`.
  - Includes highlighted lodging entries for **Heathcote B&B** and **Cloudhowe Cottage**.
  - Each location block includes name, summary, street address, Google Maps link, and timing/hours note.
  - Added June 10–13 Inverness planning weather guidance using Met Office long-term June averages.
- Added new section page: `decks/uk/sections/edinburgh/overview.html`.
  - Includes June 8–10 Edinburgh planning weather guidance using Met Office long-term June averages.
  - Adds location block for **Stay Central Hotel** (name, summary, address, map link, and hours note).

### Weather note design decision
- Requested dates (June 8–10 and June 10–13) are beyond short-range deterministic forecast windows at editing time.
- To avoid false precision, pages use **expected conditions** based on Met Office long-term June climatological averages for planning-level guidance.
