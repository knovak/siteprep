# Hosted event offset display — October 7, 2026 (UTC)

## Problem and correction

The existing fictional repeated-hour fixture rendered `2026-11-01 01:30 –
2026-11-01 01:15 · America/Los_Angeles`. Its saved instants represent a valid
45-minute interval, but the summary omitted the two different offsets. This
reproduced the usability gap recorded in `hosted-end-roundtrip-20261006.md`.

Organizer summaries, member pages and read-only member previews now show each
endpoint's numeric UTC offset. The event zone and existing date formatting
remain visible. Offsets come from the saved endpoint's instant and zone; no
stored dates, editor selection rules or permissions changed. See
`../EVENT_TIME_TECHDOC.md` for implementation and regression commands.

## Local verification

- Pinned installation and TypeScript checking passed.
- All 177 application tests passed. The new offset test covers the two Los
  Angeles autumn occurrences, its spring transition, Lord Howe's half-hour
  change, Kathmandu and UTC.
- Six event-details journeys passed in Chromium 143.0.7499.4, Firefox 144.0.2
  and WebKit 26.0 at 1280 and 390 pixels, with a Tokyo viewer. Organizer,
  member and preview summaries retained event-zone offsets; saved instants,
  invalid-end rejection, private-location handling and narrow layouts passed.
  The structured receipt is `../work/app/test/evidence/event-offsets-20261007.json`.
- The application build passed and produced a Worker archive.

The first two full-suite runs each passed 176 tests and failed the existing
HTTP retry test: its fixture clock was fixed at September 13 while the HTTP
handler used the current clock, so the sending window had expired and returned
409. That HTTP fixture now starts at `Date.now()`. Its focused rerun and the
final full suite passed; fixed-clock domain expiry tests remain unchanged.
Dependency installation still reports the existing 27 audit findings; this
display change does not remediate the toolchain.

## Test deployment and hosted verification

- Test: <https://flings-test.ken-novak.chatgpt.site>.
- Successful replacement: version 16, October 7 at 02:08:48 UTC, preserving the
  existing public audience and access-policy revision 2. No access API was used.
- Source: Siteprep `d206f86ab38821b6f782f691201b4b02824ac32b`; isolated Sites
  source `67bd13623cadf321b064b54ac30a07b75e2dcad7`.
- Archive: 107 files, 2,867,200 bytes. Deployment
  `appgdep_6ac5a9a775a481918a11ac7d9b8d90ef` reported `succeeded`.
- Production: not released. This initiative remains on test, never released.

With the native owner session in the Codex in-app browser, the October 6
fixture now reads `2026-11-01 01:30 (UTC−07:00) – 2026-11-01 01:15
(UTC−08:00) · America/Los_Angeles`. At a 390 × 844 viewport its document
client/scroll widths were both 375 pixels; at 1280 × 720 both were 1265 pixels.
The phone screenshot showed the entire summary wrapping within its card.
Only existing fictional records were read; no hosted form was submitted.

Immediately after publishing, a direct reload remained at “Opening your
gathering…” without a captured console error. Navigating through Organizer
workspace and reopening the fixture recovered. No cause or latency conclusion
is inferred from that observation. The earlier attempted browser zoom shortcut
did not change viewport dimensions or device pixel ratio, so it supplies no
text-zoom evidence.

## Limits

Member and preview offset checks are local three-engine evidence; this run's
hosted display checks cover the organizer fixture only. They do not establish
screen-reader, text-zoom, independent second-organizer, concurrent hosted-write
or managed-provider recovery acceptance. The remaining Phase 6 matrix,
provider backup retention/deletion and later authorized pilot remain open.
`verify-hosted-test` stays actionable, with stage `building`; no messages or
production release were initiated.
