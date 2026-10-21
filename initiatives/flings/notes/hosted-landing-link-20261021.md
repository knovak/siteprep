# Landing-link visual and keyboard follow-up — October 21, 2026

This follows the desktop `link-in-text-block` incomplete result in the
[public entry/denial audit](hosted-public-accessibility-20261021.html).
It checks only the anonymous landing page of [Flings Test](https://flings-test.ken-novak.chatgpt.site),
at 1280 × 800 and 430 × 932 in fresh Chromium 143.0.7499.4 contexts.
No stored browser state, bypass header, account choice or member credential was used.

## Observation and correction

Before the change, the organizer link had no underline in either normal or
hover state. It used the same 16 px regular dark text as its preceding paragraph.
The arrow and separate line helped, but screenshot review showed little visual
distinction from the explanatory text. Tab reached the home wordmark then the
organizer link; the existing 3 px focus outline was visible at both widths.
The desktop automated result was still incomplete due to `bgOverlap`; it was
not treated as a pass or a demonstrated color-contrast failure.

The landing link now has a persistent underline with a 0.2 em offset, scoped
through `.organizer-entry-link`. The destination, full navigation, existing
focus outline and authentication behavior are unchanged. This supplies a cue
independent of color, following [W3C technique G182](https://www.w3.org/WAI/WCAG22/Techniques/general/G182).
It does not claim overall WCAG conformance.

## Hosted result

Replaced the existing public Test Site with version **19** at
`2026-10-21T06:54:54.428635Z`, retaining access and runtime configuration.
Siteprep app source: `92623a9c7`; Sites source:
`3049c913ce7be82984fc3b4826e4c42c193d7b82`. The packaged deployment contains
107 files / 2,867,200 bytes. **Production: not released yet.**

| Check | Desktop | Phone width |
| --- | --- | --- |
| Normal and hover link decoration | Underline | Underline |
| Tab order | Home, organizer link | Home, organizer link |
| Organizer focus | 3 px solid outline, 4 px offset | Same |
| Visual review | Underline and focus visible, no clipping | Same |
| Horizontal overflow | None | None |
| axe `link-in-text-block` / `color-contrast` | Both pass; no violation/incomplete | Both pass; no violation/incomplete |

The [structured before/after receipt](hosted-landing-link-20261021.json) contains
computed styles, element bounds, keyboard order, targeted rule results and
sanitized request paths. The browser made static-page/asset requests and
provider challenge requests, including provider POSTs; no application API
request or business mutation occurred. The organizer link was focused but
never activated. No sign-in, data write or message was attempted.

## Reproduction and limits

Use the repository's locked Playwright and axe packages. Open `/` anonymously
at each width, wait for network idle, inspect the organizer anchor's computed
text decoration before/after hover, then press Tab from the document until the
anchor is focused. Capture normal/focused screenshots and run axe with only
`link-in-text-block` and `color-contrast`. Preserve incomplete results separately.
This is a targeted follow-up, not a rerun of every rule on all four earlier routes.

Application `npm ci`, typecheck, all 177 tests, and the Sites build passed.
The unchanged dependency tree still reports 29 audit findings (9 moderate,
17 high, 3 critical); remediation remains separate work. Final repository build,
scope and whitespace validation accompany the PR. Screenshots after that final
build are saved under `screenshots/flings-landing-link-*-20261021.png`.

The original landing-link manual-review item is closed by this focused visual
check and the persistent cue. Authenticated accessibility, real screen-reader
walkthroughs, physical devices, independent organizer access, signed-out
coordination writes, multiple memberships, expiry/revocation, concurrency and
managed-host recovery remain open. Phase 6 / `verify-hosted-test` stays actionable.
