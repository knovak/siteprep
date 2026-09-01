# Historical sparse FES2022 source and pre-production evidence review

Reviewed 2026-09-01 at 01:36 UTC, before the later global test deployment and
production release. This is the dated source, licence-boundary,
code-reconciliation, and historical-evidence review for the seven-point sparse
dataset used by test version 11. The current deployment record is in
[README.md](README.md).

## Verdict

**At the time of review, the committed sparse FES2022b source and its recorded
version 11 validation were suitable for a new test deployment but were not
sufficient for production.** The merged source preserved the exact licensed
harmonic extract and official-port comparison that version 11 exercised. The
upstream product and licence references supported sharing the transformed
tide-height extract with the recorded attribution, licence link, modification
notice, and disclaimer. Local preparation, comparison, runtime, privacy, and
build checks passed.

Later on 2026-09-01, the separately prepared 65,203-point global coastal package
completed the environmental gates: test version 14 activated and verified it,
version 15 republished the merged source, and production version 7 passed the
same protected import, initialization, provider, browser, and Worker checks.
This review remains useful for the source/licence boundary and the sparse
fixture's fixed comparison; it is not evidence for the global package by itself.

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
an indication of modification. At the time of this review, Tide Here published
seven transformed harmonic points rather than the original 3.95 GB NetCDF and
carried those notices in the source record and forecast response. The later
global package likewise retains derived harmonic points rather than
redistributing the original atlas. The checked PDF SHA-256 was
`dba741dfcbd79ee9852591d0c0713ea35afa7be912447254751e6425d9a144f1`.

This is an engineering review of the recorded licence boundary, not legal
advice. A changed AVISO product classification, licence, use model, or decision
to redistribute the original atlas would reopen it.

## Integrity and reconciliation

- The still-committed sparse `fes-source-official.mjs` Git blob is
  `f4e15b31518eb6b59927c6d59b107529101ca44f`, exactly the blob at historical
  version 11 source commit `c895ce08463f31daa68159d8447803b7154ed812`.
- The still-committed official-comparison Git blob is
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
- The merge reviewed before the global package changed direct/stored catalogue
  availability and validation-fixture isolation, but did not change the sparse
  FES source or fixed comparison. Its Stage 4 fixture registry activates
  `stage-4-v7` and FES dataset
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

Those checks established that the exact sparse source worked in the historical
hosted environment. They did not establish that the then-current merged package
was live, because version 13 occupied the Site with FES inactive. The later
global deployment supplied separate current-environment evidence.

## Verification performed during the review

- Regenerated fixed official-port comparison: exact match, both cases passed.
- Tide Node suite: 125 passed, 0 failed.
- Tide production build: passed.
- Production dependency audit: 0 vulnerabilities.
- Source/licence disclosure, exact dataset identity, initializer ordering,
  repeat-write behavior, approximate warning, official-provider precedence,
  body-only point resolution, privacy-safe logs, and static publication
  allowlist remain covered by the passing suite.

## Subsequent resolution

The remaining gates recorded by this review were completed later on
2026-09-01 by the global coastal work:

1. Public test version 14 imported and activated the global package, and the
   protected repeat initialization wrote zero objects.
2. The live test sweep passed NOAA, CHS, all 76 Australian ports, Galway,
   Cooktown, Gibraltar, Nice, Amsterdam, browser disclosure and isolation, and
   Worker-log checks; version 15 then republished the merged source.
3. Production version 7 was separately authorized and passed the same package,
   initialization, and live checks in its separate private R2 environment.

See [README.md](README.md) and the initiative's `releases.md` for the current
deployment record.
