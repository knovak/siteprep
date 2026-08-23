# Notes

Optional ideas and observations. Nothing here is committed work: no tooling
reads this file, so nothing in it is ranked, selected, proposed or counted.
Promote an entry by writing it as a real item with
`node scripts/initiatives.mjs add tide-here <id> --title "..."` when it stops
being optional. See `INITIATIVES_VISION.md` §6.6.

## Optional improvement menu — 2026-08-23

These are proposals, not a plan. Any one can be selected as a real todo item,
redirected in review or left here indefinitely. Closing the proposal pull
request unmerged is also a complete answer.

| Candidate | Why it could help | Likely size | Boundary and evidence |
|---|---|---:|---|
| **Add an explicit Use my current location button** | The original wish names browser location as version 2, the public Site has the required secure origin, and the existing coordinate path already handles reverse geocoding, coastal matching, history and display. | Medium | Explain permission before the browser prompt and call geolocation only after a click. Never request on load, watch location or run in the background. Denial, timeout and unavailable states must leave the manual form usable. Test granted, denied and unavailable states on phone and desktop. |
| **Replace the schematic chooser with a geographic coast map** | The current relative point plot shows distance but not land, channels or islands—the geography a person needs when Bainbridge or a border location produces several plausible stations. | Medium | Keep the same candidates and matching thresholds; the map may inform the user's choice but must not select a station. Prefer local coastline data; if remote tiles are used, disclose the request and attribution. Recheck the island, estuary and U.S.–Canada border fixtures. |
| **Pin a few places on this device** | The 100-entry history is chronological diagnostic data, not a quick way to revisit two or three coasts. A small local-only pinned list could make repeat use faster without adding accounts or synchronization. | Small | Keep pins separate from forecast history and disposable caches, show that they are device-local, and provide explicit remove and clear controls. A pin must not trigger a provider request until the user opens it. |
| **Add concise coverage and coast-choice help on the page** | The README explains U.S./Canadian coverage, ordinary place versus coordinates, the cautious chooser and source details, but a first-time visitor may not know why a nearby place asks them to choose a station or refuses coverage. | Small | Put the explanation behind a short Help disclosure so it does not displace the forecast. Use the same supported-country and privacy wording as the live behavior, and verify it at the phone viewport. |
| **Add one more official tide-provider adapter** | A third provider would test the registry architecture and make the page useful beyond U.S. and Canadian coasts. The existing audit identifies Norway as a strong no-registration candidate and the United Kingdom and New Zealand as possible but operationally different paths. | Large | Recheck current licence, attribution, CORS, limits, station semantics and five-day high/low access before selecting a country. Do not scrape Australia's public pages or hide a credential in the static app. The adapter must preserve datum, time-zone and coverage-refusal behavior and pass live and recorded-fixture checks. |

The strongest next increment is **Use my current location** because it is the
only candidate explicitly requested in the original wish and it reuses the
settled forecast contract. The geographic chooser map is the better choice if
real use shows that the existing station question is hard to answer; that
evidence would outweigh the version-2 ordering.
