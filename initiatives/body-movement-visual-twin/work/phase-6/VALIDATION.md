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

## 2026-09-05 — KRN revision deployed to test

- **Test:** [Body Movement Visual Twin — private validation](https://body-movement-visual-twin-validation.ken-novak.chatgpt.site/), replacement version 4; deployment succeeded at 2026-09-05 07:54:35 UTC (00:54:35 PDT).
- **Source:** `initiatives/body-movement-visual-twin/work/phase-6/site`, 26 static files from repository commit `2f3051bf774bf57be18ee7acb074071659f6fcf2`. The isolated Sites source commit is `c80fd339b9323c837b6282a500f0ef488c4de1f5`.
- **Saved package:** 80 packaged files, 1,392,640 bytes (1.33 MiB) reported by Sites, including hosting runtime files. The local compressed upload was 368,743 bytes.
- **Access:** unchanged owner-only custom policy; one allowed account, no groups and no external visitors. An anonymous root request returned `401`.
- **Verification:** the Sites build passed; the local Worker served the source root byte-for-byte with `200`. The authenticated live root returned `200` and matched the source except for the hosting layer's injected Cloudflare challenge script. The live viewer and anatomy module matched their source files byte-for-byte. The earlier KRN technical validation is recorded in [REVIEW-KRN.md](REVIEW-KRN.md).
- **Isolation:** the temporary deployment workspace was removed and the source repository was verified unchanged before this receipt and deployment metadata were recorded.
- **Production:** not released yet. The initiative is on test, never released; no claim has gained practitioner approval from this deployment.
