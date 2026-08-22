# Phase 6 validation record

## Private deployment

- **Site:** [Body Movement Visual Twin — private validation](https://body-movement-visual-twin-validation.ken-novak.chatgpt.site/)
- **Published:** 2026-08-22 02:03 PDT
- **Access:** owner-only custom access; one allowed account, no groups, and no
  external visitors. A signed-out request returned `401`.
- **Discovery:** the deployed root retains `<meta name="robots"
  content="noindex">` and is not linked from the public repository site.
- **Bundle:** 15 static files, 108 KiB before Sites packaging. The authenticated
  production root returned `200` and matched the source HTML apart from the
  hosting layer's injected Cloudflare challenge script.

## Technical review script

The exact self-contained bundle passed:

- 29 contract tests covering rights, registration, movement records, layer
  state, visual-profile boundaries, and separate correction reports;
- 14 collection browser checks across desktop and iPhone-sized Chromium; and
- 4 deployment-bundle browser checks across desktop and iPhone-sized Chromium,
  including the complete movement/correction path, same-origin loading,
  no-WebGL fallback, no serious accessibility findings, no horizontal overflow,
  and no retained reviewer identity or report data.

Phone validation exposed a range-control redraw failure. The viewer now handles
both `input` and `change` events without replacing a real change note with a
duplicate no-op update; the full desktop and phone suites pass after the fix.

Five authenticated production root requests had median response times of 493 ms
with a desktop user agent and 505 ms with an iPhone user agent. These are access
and document-response observations, not end-to-end human interaction timings.

## Human evidence still required

Automation does not promote any `unreviewed` claim. Completion still requires:

- one anatomy reviewer for the named shoulder-and-spine structures;
- one practitioner familiar with each of Feldenkrais, yoga, and Alexander
  Technique;
- their invitation addresses and a destination outside the repository for
  exported review reports; and
- recorded findings, disputed claims, corrections, and any asset removals.

The site remains owner-only until those reviewers are named and invited. Public
release remains a separate successor decision and legal review.
