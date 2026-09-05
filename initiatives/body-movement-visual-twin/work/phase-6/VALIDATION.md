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


## 2026-09-05 — First private production release

- **Production:** [Body Movement Visual Twin](https://body-movement-visual-twin.ken-novak.chatgpt.site/), new Site, version 1. Deployment succeeded at **2026-09-05 23:11:22 UTC (16:11:22 PDT)**.
- **Test:** [Private validation Site](https://body-movement-visual-twin-validation.ken-novak.chatgpt.site/), version 4, unchanged by this production release.
- **Released source:** `initiatives/body-movement-visual-twin/work/phase-6/site` at repository commit `021648cc4c585caff04e2a9880cad4969daaa77c` (merged PR #435). The isolated Sites source commit was `52a87ae9521035b273131ce482de19dd65f0bf95`.
- **Release contents:** first production baseline; no earlier production release exists, so a commits-since-release count is unavailable. Includes the 13-study collection, six anatomy views, visual-twin and report controls, complete axial counts, moving skull/occiput and clavicles, added connected muscles, and corrected seated foot direction.
- **Files:** 26 unchanged static source files, 237,237 bytes. Sites reported 27 packaged files including hosting metadata, 266,240 bytes (260 KiB). The compressed local upload was 45,319 bytes.
- **Access:** verified owner-only custom access; one allowed account, no groups and zero external visitors. Signed-out requests to both `/` and `/lib/anatomy-geometry.mjs` returned `401`; authenticated requests returned `200`.
- **Verification:** isolated static build and local HTTP smoke check passed, with the root and all 26 files matching source byte-for-byte. Authenticated live `viewer.mjs`, `lib/anatomy-geometry.mjs` and `data/movement-clips.json` matched source byte-for-byte. The live root differed only by the platform's injected Cloudflare challenge script.
- **Packaging:** the installed Sites plugin no longer contains the initializer named by the older repository helper. Preparation stopped before creating a workspace or building anything. The release used the current Sites-supported static-only path in a fresh isolated workspace with `static.directory: dist`, followed by the bundled packaging helper. No source content or release gate was changed.
- **Cleanup:** the unique temporary deployment workspace was removed. The source repository status matched its pre-deployment baseline before these intentional release/status records were written.
- **Review status:** production availability does not mark anatomy or tradition claims reviewed. `phase-6-practitioner-review` remains blocked on reviewer details, a feedback destination and the remaining human findings. See the [current status and next steps](../../overview.md).
