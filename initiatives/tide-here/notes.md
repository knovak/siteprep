# Notes

Optional ideas and observations. Nothing here is committed work: no tooling
reads this file, so nothing in it is ranked, selected, proposed or counted.
Promote an entry by writing it as a real item with
`node scripts/initiatives.mjs add tide-here <id> --title "..."` when it stops
being optional. See `INITIATIVES_VISION.md` §6.6.

## Optional improvement menu — 2026-08-26

These are proposals, not a plan. Any one can be selected as a real todo item,
redirected in review or left here indefinitely. Closing the proposal pull
request unmerged is also a complete answer. The earlier location-button idea is
not included because the current page now provides **Show here** with an
explicit, click-triggered permission request and manual-entry fallback.

| Candidate | Why it could help | Likely size | Boundary and evidence |
|---|---|---:|---|
| **Replace the schematic alternatives view with a geographic coast map** | The current relative point plot shows distance but not land, channels or islands—the geography a person needs when Bainbridge or a border location produces several plausible stations. | Medium | Keep the same candidates, matching thresholds, and closest-first result; the map may inform a manual alternative selection but must not change which station is initially selected. Prefer local coastline data; if remote tiles are used, disclose the request and attribution. Recheck the island, estuary and U.S.–Canada border fixtures. |
| **Pin a few places on this device** | The 100-entry history is chronological diagnostic data, not a quick way to revisit two or three coasts. A small local-only pinned list could make repeat use faster without adding accounts or synchronization. | Small | Keep pins separate from forecast history and disposable caches, show that they are device-local, and provide explicit remove and clear controls. A pin must not trigger a provider request until the user opens it. |
| **Add concise coverage and alternative-coast help on the page** | A first-time visitor may not know why a nearby place offers several official stations, uses an approximate FES2022 model point, or refuses coverage. | Small | Put the explanation behind a short Help disclosure so it does not displace the forecast. Derive the wording from the active provider registry rather than freezing another country list into the page, disclose when a forecast uses the Site gateway, and verify it at the phone viewport. |
| **Add another official tide-provider adapter beyond Australia** | NOAA, CHS and the licensed Bureau path exercise browser-direct and stored national providers; another country would extend useful reach and further test the provider-neutral registry. The existing audit identifies Norway as a strong no-registration candidate and the United Kingdom and New Zealand as possible but operationally different paths. | Large | Recheck current licence, attribution, credentials, limits, station semantics and five-day high/low access before selecting a country. Do not hide a credential in browser code. Preserve datum, time-zone, privacy and coverage-refusal behavior and pass live and recorded-fixture checks. |

The strongest next increment is the **geographic coast map** if real use shows
that the existing station question is hard to answer. **Pin a few places** is
the smaller choice if repeat visits, rather than coast ambiguity, are the main
friction.
