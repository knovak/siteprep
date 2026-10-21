# Public entry and denied-screen accessibility — October 21, 2026

## Scope

Targeted T12 automated accessibility checks on the existing public
[Flings Test](https://flings-test.ken-novak.chatgpt.site). Four routes were opened
at 1280 × 800 and 430 × 932 in separate, fresh anonymous Chromium contexts:
the landing page, organizer workspace, direct organizer gathering, and a clean
member URL without a code or session. The gathering is the existing fictional
fixture `7149a04f-4100-4d26-8db4-de35042a7e85`.

No stored browser state, account selection, authentication cookie, bypass header
or member credential was supplied. The organizer and member screens remained
denied. Observed application requests were GETs; no business mutation or message
request was issued. Ordinary host/request logging is not ruled out.

The [structured receipt](hosted-public-accessibility-20261021.json) retains
tool/browser versions, run times, routes, dimensions, rule results, visible
public text and observed API request methods/paths. It contains no credentials.
This is desktop automation at two widths, not physical-phone or screen-reader
acceptance.

## Finding and correction

On test version 17, both member-denial scans reported axe's moderate
`page-has-heading-one` best-practice violation. The error text and recovery link
were present, but no h1 identified the screen. The other six scans had no
violations. One desktop landing-page `link-in-text-block` result was incomplete:
axe could not determine the contrast ratio because it detected overlap.

Added **Unable to open member page** as an h1 when an error is displayed without
a loaded member projection. When a projection remains loaded, the gathering's
existing h1 remains the sole page heading. The existing alert text, denial,
reload behavior and return link are retained.

The local anonymous audit then found no violations in all eight scans. Local
mode has fictional-organizer controls and a different landing page, so that
result was not substituted for hosted verification.

## Hosted verification after replacement

The existing public test Site was replaced with version 18 at
`2026-10-21T02:20:08.684934Z`, preserving its audience and runtime configuration.
The deployment used the existing Site project and database, with no schema
change. Siteprep source commit: `c85546592`; pushed Sites source commit:
`ef8481d49497848c74f5840b419a972f0e238bd2`.

| Screen | Desktop / phone rule passes | Violations after fix | Incomplete rules |
| --- | --- | --- | --- |
| Landing | 18 / 19 | 0 / 0 | Desktop `link-in-text-block`; phone none |
| Organizer workspace denied | 30 / 30 | 0 / 0 | None |
| Direct organizer gathering denied | 30 / 30 | 0 / 0 | None |
| Member link unavailable | 22 / 22 | 0 / 0 | None |

All eight post-deployment scans found zero automated violations. Both member
screens visibly included the new heading and retained the unavailable-link
message. Document scroll width matched client width throughout. The landing
page's incomplete contrast/link distinction result remains manual-review work;
it is not counted as passed. Automated absence of violations does not establish
complete accessibility, WCAG conformance or correct announcements.

## Validation and reproduction

Installed the repository and application's locked dependencies with `npm ci`.
Application typecheck and all 177 tests passed, as did six existing member
journeys across Chromium, Firefox and WebKit at desktop/phone widths. Five
initial HTTP test failures came from fixed September codes/sessions expiring
against the HTTP store's real clock. The affected HTTP fixtures now issue using
current time; domain expiry-boundary tests keep their injected clocks. The
application build and Sites packaging succeeded. Dependency installation still
reports 29 audit findings in the existing locked tree; no dependency or lockfile
change was made, and toolchain remediation remains open.

To reproduce the scoped audit, use the root lockfile's `@playwright/test` and
`@axe-core/playwright`, launch Chromium without storage state, and open each
route above in a new context at each specified viewport. After `networkidle`,
capture visible text and document dimensions, then run
`new AxeBuilder({ page }).analyze()` without disabling rules. Record violations
and incomplete results separately. Do not choose organizer sign-in or issue a
member link for this check. An initial harness dependency-version lookup failed
before any page checks; it was corrected and excluded from the evidence.

The final repository build, scope and whitespace checks are recorded with the
PR. Screenshots of the changed hosted member screen are retained locally under
`screenshots/` after that build. The screenshot is visual evidence, not an
accessibility certification.

## Remaining acceptance

This closes only the missing-heading finding and supplies the public
entry/denial automated audit. The desktop landing link still needs manual
review. Authenticated organizer/member audits, real screen-reader walkthroughs,
independent organizer access, signed-out discussion/poll/payment writes,
multiple memberships, expiry/revocation, concurrency/rollback, other hosted
engines and managed-host recovery remain outside this receipt. Phase 6 and
`verify-hosted-test` remain actionable. Production has not been released.
