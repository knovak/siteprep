# Event summary UTC offsets

Organizer event summaries and member views, including read-only previews, show
the numeric UTC offset beside each start and optional end. The event's IANA zone
remains visible. Each offset is calculated from that endpoint's saved instant
and event zone, independently of the viewer's zone and the other endpoint.

`work/app/lib/event-time.ts` exports `utcOffset`, using the platform's IANA
timezone data through `Intl.DateTimeFormat` with `longOffset`. UTC is displayed
as `UTC+00:00`; positive, negative and fractional-hour offsets retain their
minutes. Existing date formatting, saved UTC instants, validation, editor
choices and authorization are unchanged.

This makes the repeated-hour interval `2026-11-01 01:30 (UTC−07:00)` to
`2026-11-01 01:15 (UTC−08:00)` distinguishable from an invalid backwards
interval. It is a 45-minute interval across Los Angeles's autumn transition.

## Verification

`npm test` includes offset checks for Los Angeles's repeated hour and spring
transition, Lord Howe's half-hour change, Kathmandu's quarter-hour offset and
UTC. With `npm run dev:local` running, execute:

```sh
FLINGS_EVIDENCE=test/evidence/event-offsets-20261007.json node test/event-details-browser.mjs
```

The six desktop/phone journeys in Chromium, Firefox and WebKit use a Tokyo
viewer. They verify the organizer's backwards-looking wall-time interval, both
endpoint offsets on the member page and read-only preview, saved instants,
end-time rejection, location privacy and absence of horizontal overflow.
`FLINGS_EVIDENCE` selects a fresh receipt without overwriting earlier evidence.

The HTTP retry regression now starts its fixture clock at the current time,
matching the real-clock store constructed by the HTTP handler. Its former fixed
September 13 date expired the sending window during October runs, causing a
409 in the authorization test. Fixed-clock domain expiry tests remain intact.
