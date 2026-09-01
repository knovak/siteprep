# FES2022 pre-production source and evidence review

Reviewed 2026-09-01 before any production release. This is a source,
licence-boundary, code-reconciliation, and historical-evidence review. It is
not a new deployment, a live-current test, or production authorization.

## Verdict

**The committed FES2022b source and its recorded version 11 validation are
suitable for a new test deployment. They are not sufficient for a production
release.** The current merged source preserves the exact licensed harmonic
extract and official-port comparison that version 11 exercised. The upstream
product and current licence references support sharing this small transformed
tide-height extract with the recorded attribution, licence link, modification
notice, and disclaimer. Local preparation, comparison, runtime, privacy, and
build checks pass.

The missing evidence is environmental: version 13 superseded version 11 at the
same public test URL and runs registry `stage-4-v5` with the non-FES fallback
fixture. The current FES-capable `stage-4-v7` source has therefore not been
initialized and live-checked after its reconciliation with the newer direct and
stored catalogue-loading changes. A fresh test deployment must be separately
authorized, preserve public access, initialize idempotently, and repeat the
FES, national-provider, browser, isolation, and Worker-log checks before a
production release can even be considered. Production itself remains a
separate explicit release decision.

## Source and licence boundary

The product DOI resolves to AVISO's current
[FES2022 product page](https://www.aviso.altimetry.fr/en/data/products/auxiliary-products/global-tide-fes.html).
Checked 2026-09-01, that page identifies FES2022b ocean-tide elevations,
provides the non-structured native grid, lists the same 34 constituents used by
the extract, names PyFES as the official prediction code for the native grid,
and supplies the recorded CNES/LEGOS/NOVELTIS/CLS citation. The committed
extract uses pinned PyFES 2026.5.2, above the page's stated minimum, and records
the official product DOI.

The linked [AVISO License Agreement, Issue 20](https://www.aviso.altimetry.fr/fileadmin/documents/data/License_Aviso.pdf)
is effective 2026-08-10. It permits use and sharing of adapted material,
including commercial use except for products named in Annex A; the Annex A FES
restriction is for current fields, not the tide-height product used here. Its
restriction on mass operational redistribution applies to the original,
unmodified AVISO product and expressly does not restrict adapted material. It
requires source/producer attribution, a product citation, a licence link, and
an indication of modification. Tide Here publishes seven transformed harmonic
points rather than the original 3.95 GB NetCDF and carries those notices in the
source record and forecast response. The checked PDF SHA-256 was
`dba741dfcbd79ee9852591d0c0713ea35afa7be912447254751e6425d9a144f1`.

This is an engineering review of the recorded licence boundary, not legal
advice. A changed AVISO product classification, licence, use model, or decision
to redistribute the original atlas would reopen it.

## Integrity and reconciliation

- The current committed `fes-source-official.mjs` Git blob is
  `f4e15b31518eb6b59927c6d59b107529101ca44f`, exactly the blob at historical
  version 11 source commit `c895ce08463f31daa68159d8447803b7154ed812`.
- The current committed official-comparison Git blob is
  `ae3e2043ff95902917258b5b8e582193fc05d17e`, also exactly the historical
  version 11 blob.
- The source module SHA-256 is
  `a10fe2e9a6d2e3967a47245f569c0059372ffe03da80fddf623367b164410afb`;
  the comparison JSON SHA-256 is
  `4ac55558ecd9b948768db2b95067a26e0ecd5ee799952609b20f55f533472eb4`.
- The extract records source file
  `FES2022b_OceanTide_NSgrid.nc`, 3,953,139,340 bytes, SHA-256
  `6479dbd9acdfb63405ff15de1265154c4659b1f7112b8dfb1cabef945a481a23`.
  It contains seven water points, all 34 constituents, explicit interpolation
  or bounded-extrapolation quality, a maximum 0.000004 cm constituent
  round-trip error, and a 20 km runtime selection guard.
- The merge since version 11 changes direct/stored catalogue availability and
  validation-fixture isolation, but does not change the FES source or fixed
  comparison. The packaged Stage 5 server still imports the Stage 4 worker,
  whose current registry activates `stage-4-v7` and FES dataset
  `fes2022b-native-validation/2026-02-03-r2`.

## Accuracy and historical live evidence

The fixed comparison plan predates its results. Regenerating the comparison
from the committed module produced no diff from the checked-in evidence:

- Maroochydore versus official Mooloolaba: 20 paired extrema, 11.256-minute
  p90, 12.525-minute maximum, and 0.039 m maximum height residual after the
  one documented datum offset.
- Bundaberg versus official Bundaberg: 20 paired extrema, 19.398-minute p90,
  20.709-minute maximum, and 0.110 m maximum height residual after the datum
  offset.

Historical public test version 11 initialized `stage-4-v7` with zero writes on
repeat, served the same FES dataset, passed NOAA and CHS discovery plus the
76-port/1,470-event Australian sweep, returned approximate licensed-source
results for Galway, Cooktown, and Gibraltar, rendered the source, licence, and
safety copy, kept fixture caches tab-scoped, left fixture mode for a manual Nice
search, returned honest unavailable coverage there, rejected an unauthorized
initializer with 403, and recorded no Worker execution errors.

Those checks establish that the exact source worked in the historical hosted
environment. They do not establish that the current merged package is live,
because version 13 now occupies that Site with FES inactive.

## Current verification

- Regenerated fixed official-port comparison: exact match, both cases passed.
- Tide Node suite: 125 passed, 0 failed.
- Tide production build: passed.
- Production dependency audit: 0 vulnerabilities.
- Source/licence disclosure, exact dataset identity, initializer ordering,
  repeat-write behavior, approximate warning, official-provider precedence,
  body-only point resolution, privacy-safe logs, and static publication
  allowlist remain covered by the passing suite.

## Gates that remain

1. Obtain permission to deploy the current FES2022 source to Tide Here's
   existing public test Site. The standing Australian-coverage authorization
   explicitly does not cover FES2022.
2. Deploy committed source without changing access; initialize `stage-4-v7`;
   prove a zero-write repeat; rerun NOAA, CHS, all 76 Australian ports, Galway,
   Cooktown, Gibraltar, browser disclosure/isolation, unauthorized initializer,
   and Worker-error checks; record the new version and source/archive hashes.
3. Only after that current evidence passes, request an explicit production
   release. A production release must not be inferred from this review or from
   the earlier test deployment.
