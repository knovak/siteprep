# Provenance

Two packages make up this initiative, adopted on 2026-09-07.

## The published demo, adopted as `work/`

From `demos/world_migration_atlas/`, introduced by commit
`04de6ead060bd230b242a320279e943708cb2ae2` (2026-09-03).

An earlier version of this file and of `adoption-manifest.json` named
`37e1a5f1306b1386562e95133580547c3490d38a` as the source commit. That object
does not exist in this repository and never did: `git cat-file -t` cannot
resolve it and it appears in no branch. It was a branch commit that this
repository's squash merge discarded - the failure mode
`INITIATIVES_TECHDOC.md` describes under "Currency". The commit above is the one
`git log -- demos/world_migration_atlas` reports, and it resolves.

## The development package, adopted as `lib/`

From `migrationatlascomplete2.zip`, supplied by the user on 2026-09-07 as the
complete July 2026 code base. 28 files; SHA-256
`645c73d88b84d9b70eb602a1807b284ef217f89e6e1d5afbd9f0a8ee68d40969`. Everything
in it is committed under `lib/` except its three markdown documents, which the
first adoption had already taken as `spec.md`, `plan.md` and the preserved
section of `README.md`.

Those three hashes were recorded before the package arrived and could not be
checked against anything. All three now match the package byte for byte, which
is what `adoption-manifest.json` records under `documents[].verified_against_package`.

The package's `data/` files are identical to the ones the demo shipped, and its
`data/migrations.json` holds the same 48 records the bundle inlines. Its
`dist/migration-atlas.html` and `src/index.html` differ from the demo's copies:
the package is the state of the source before the branding edits listed in
`decisions.md` were made to the bundle. Those edits are ported into `lib/src/`,
so the build reproduces the published `work/index.html` exactly.

`lib/data/basemap/ne_50m_land_raw.geojson` is an upstream input that nothing
reads and no script regenerates. It is kept as the only record of where the
basemap came from.

## Two things to know before the next release

`demos/world_migration_atlas/` has no `demo.json`. Its title, description and
the two tutorial links are hardcoded in `scripts/build.sh`, in
`get_demo_description`. `release-initiative` runs `deploy-demo`, which writes a
`demo.json` into the destination - so after the first release the demo will have
two sources for the same index entry, and the hardcoded branch wins. Nothing
breaks; it is worth knowing rather than rediscovering.

`spec.md` and `plan.md` are preserved originals and are not edited to match this
repository's writing-style rules. Wording in them that those rules discourage is
July 2026 text, not a lapse to correct.


## Migration Atlas editorial review — September 8, 2026

**Review performed; T8 acceptance is not established.** All 48 entries have a
nonempty reference and an allowed confidence and type, but reference presence
is not numeric verification. The dataset is unchanged. This report records
corrections/evidence still needed rather than certifying the inherited July
all-pass statement.

Reviewed `lib/data/migrations.json` at SHA-256
`99e4c711ad580e1e0562f65d623add3e4ec79c7c963f4c90f5d27c939e9411a6`.
There are 92 destinations, 43 entries with a non-null descendant/current
population field, and confidence ratings of 31 high, 12 medium and five low.

### Checklist findings

1. **Numbers:** all 48 references were read as recorded; complete field-by-field
   numeric tracing remains unverified for all 48 entries. The targeted primary
   sources below establish only the specific findings attributed to them. The
   complete books were not available in this run; a publisher description is
   bibliographic evidence, not confirmation of a numeric claim. Add exact
   pages/tables, dates, geographic scope, definitions and derivations for every
   migrants/settled/diaspora figure before a T8 pass.
2. **Confidence:** Sephardic expulsion (5x), Huguenot exodus (2.67x), White
   emigres (2.22x) and Highland Clearances (3x) carry medium despite the
   checklist's low-confidence rule for spreads above about 2x. Pre-1800 medium
   or high ratings also need an explicit archival exception, not an automatic
   downgrade without inspecting the source. One confidence field currently
   covers quantities with different uncertainties.
3. **Quantities:** the Holocaust entry allocates 1.05M settlements against 1M
   migrants. Its overlap note needs to reconcile that specific discrepancy.
   Sudan and Yugoslavia include internal displacement in totals illustrated
   only by international arrows. Several recent entries use a population
   stock as cumulative movement; modern ancestry must not silently become
   descendants of one historic flow.
4. **Language:** most causes use descriptive wording. Unqualified largest-ever
   or largest-current claims need dated, comparable definitions. Keep named
   atrocities and coercion explicit; the review does not soften those terms.
5. **Type:** the Romani, Great Migration, Jewish exodus from Arab/Muslim lands,
   Gulf, Chinese and Korean aggregates need their mixed circumstances
   explained. These are review findings, not newly chosen classifications.
6. **Geography:** all source and destination names/coordinates were examined;
   isolated world frames and a 6x first-destination frame were visually
   inspected for each entry. Numerous multi-country labels collapse into a
   point in just one country or offshore. Those limits are recorded below;
   the other 44 destination points still need dedicated 6x inspection before
   geographic acceptance. Representative centroids are permitted by the data
   contract, but should not imply the other named places are located there.
7. **Period:** every envelope was read against its cause, wave note and named
   citation. Numeric/source verification remains open where no exact passage
   is available. Contemporary end dates do not establish a figure's as-of
   date, and a single envelope can obscure opposite directions or late waves.
8. **Visual:** all 48 isolated entries produced hit-testable output at start+1,
   peak (or midpoint), and end: 144 sampled frames, no JavaScript errors. Each
   was briefly played, captured at world scale and at 6x over its first
   destination, and inspected. Small regional arrows benefit from zoom; broad
   aggregates exaggerate a single endpoint. This checks rendering, not every
   instant, every overlapping combination, or the historical truth of a route.

### Entry-by-entry record

Every row retains the current confidence and type. **Each row needs numerical
source tracing** as described above, even when no additional concern appears.
The findings cover the checklist's source, confidence, quantity, language,
type, geography and period criteria; visual coverage and its limits are shared
above. No replacement figures or classifications were invented.

| Entry | Current confidence / type | Finding to carry forward |
|---|---|---|
| `turkic-anatolia` | low / conquest-migration | Low matches the 4x range. Document how 60M descendants are attributed to this medieval flow rather than modern Anatolia generally. |
| `roma-migration` | low / voluntary-economic | Low matches the 10x range. The cause describes uncertain departure and invasion pressure; voluntary-economic needs a qualification supported by the cited scholarship. |
| `mongol-displacements` | low / refugee-flight | Low matches the 5x range. Flight and deportation share one type. The destination point (34N,40E) represents none of India, Egypt or Anatolia accurately at 6x. |
| `jewish-expulsions-medieval` | medium / forced-expulsion | The cited Mundill book covers England, 1262-1290 [S3]; locate evidence for the French totals and dates. Explain medium for a medieval estimate and the Channel source centroid. |
| `sephardic-expulsion` | medium / forced-expulsion | Medium conflicts with the checklist: the range spans 5x. Add distinct locators for the three destination allocations and 2M descendants. |
| `spanish-colonization` | medium / colonial-settlement | Explain the pre-1800 medium-confidence exception and why allocations total 650K against 700K migrants; Mexico/Andes points compress several regions. |
| `atlantic-slave-trade` | high / forced-enslavement | 12.5M embarked and 10.7M disembarked are supported [S1]. Four settlement allocations total 10.6M; explain rounding/coverage, source all descendant values and remove or qualify the unsourced largest claim. |
| `indian-ocean-slave-trades` | low / forced-enslavement | Low is appropriate to the broad reconstruction. Explain the post-1000 subset, 3.8M destination total against 6M moved, and the Indian-Ocean point representing South Asia too. |
| `puritan-great-migration` | high / religious | The book identity is confirmed [S4], not its numeric tables. Justify the high-confidence historical exception; the 30M descendant figure needs a separate source and definition. |
| `huguenot-exodus` | medium / religious | Medium conflicts with a 2.67x range. Religious describes motive but the persecution also needs the coercion context kept visible; Cape descendants require a source. |
| `acadian-expulsion` | high / forced-expulsion | Justify high confidence with archival locators. Louisiana represents a later resettlement; specify the waves and why destination totals omit 2.5K people. |
| `convict-australia` | high / forced-expulsion | Locate the transportation count separately from the 5M descendants. The Sydney centroid does not display Van Diemen's Land or Western Australia; explain the geographic coverage. |
| `trail-of-tears` | high / internal-forced | The cited Cherokee-focused title needs locators for the broader multi-nation total. Separate movement-specific descendants from present tribal membership. |
| `irish-famine` | high / refugee-flight | Canada and Australia share a Montreal point. Document the 1845-1855 count, modern ancestry dates and overlap with European mass migration. |
| `european-mass-migration` | high / voluntary-economic | Check 55M against the stated Americas-only scope and 46M destination total. Define descendants separately and document overlapping Irish/Jewish streams. |
| `indian-indenture` | high / indentured-labor | Locate each destination allocation and explain 1.21M settled against 1.6M moved. A single Caribbean point and Durban point omit other named places. |
| `chinese-diaspora-19c` | medium / indentured-labor | Mixed free and contract migration is disclosed but one indentured-labor color covers both. Southeast Asia is placed offshore; the US point also represents Peru/Cuba/Canada. |
| `chuang-guandong` | medium / voluntary-economic | Circular movement and 9M permanent settlers are distinguished. The 100M descendant estimate needs evidence independent of modern Northeast China's population. |
| `circassian-expulsion` | medium / forced-expulsion | Range supports medium provisionally; page-level evidence is still missing. Source the transit-mortality and descendant figures and clarify the combined national groups. |
| `russian-siberia` | medium / colonial-settlement | Settled and departed are distinguished but unsourced at field level. Novosibirsk represents a region extending into the Far East; explain the descendant cohort. |
| `jewish-pale-emigration` | high / refugee-flight | Source the 1881-1914 total and modern descendant attribution. The London destination combines Argentina and Palestine in one northern-European point. |
| `armenian-genocide` | medium / refugee-flight | Keep deaths separate from refugee counts. Soviet Armenia's total population cannot automatically stand for descendants of these refugees; Marseille also represents the Americas. |
| `greek-turkish-exchange` | high / forced-expulsion | A shared source makes both opposing movements start in Anatolia. Explain 1.6M in the note against 1.5M settled in Greece and trace the descendant estimates. |
| `white-emigres` | medium / refugee-flight | Medium conflicts with the 2.22x range. Explain the missing 500K in the destination sum and the multi-city aggregates. |
| `us-great-migration` | high / internal-forced | The 6M scale is supported by Census [S5], whose envelope begins in 1910. internal-forced is defined as forced relocation: explain the coercion/agency distinction, rather than implying a deportation order. |
| `german-expulsions` | high / forced-expulsion | High may describe the migration total, but the 500K-2M death range has different uncertainty. Explain that distinction and provide destination/descendant locators. |
| `holocaust-displacement` | high / refugee-flight | Settlement totals exceed migrants (1.05M versus 1M). The note admits overlapping refugee waves but does not reconcile that excess. Modern Israeli population needs cohort-specific attribution. |
| `india-partition` | high / refugee-flight | The Punjab centroid omits the Bengal direction at every date. Source the allocations and descendant figures and qualify the largest-single-event assertion. |
| `palestinian-nakba` | high / refugee-flight | UNRWA counts need an observation date and registration definition. Amman represents five named areas; current refugee registration is not a precise location for all descendants. |
| `jews-from-arab-lands` | high / forced-expulsion | The cause describes heterogeneous persecution, expulsion and emigration; a universal forced-expulsion classification needs per-country qualification and quantified sources. |
| `windrush-commonwealth` | high / voluntary-economic | Jamaica is the only source point although South Asia is in scope. Locate evidence covering both regions and separate the 1948-1971 cohort from all current descendants. |
| `vietnamese-boat-people` | high / refugee-flight | Separate all Indochinese refugees from boat departures and sea deaths. Sydney also stands for Canada and France; source the destination and descendant allocations. |
| `afghan-refugees` | high / refugee-flight | An 8M cumulative total cannot be reconstructed by summing annual refugee stocks [S2]. Document de-duplication of return/re-displacement waves and the dates of destination stocks. |
| `soviet-jewish-emigration` | high / refugee-flight | The citation does not name an exact Tolts paper/table. Trace the 1970-2000 total and explain Germany being represented only by a New York point. |
| `mexico-us` | high / voluntary-economic | The note distinguishes gross movement, settled stock and descendants. Specify the gross-flow method, dates of the stock/ancestry estimates and post-2008 claim. |
| `gulf-labor-migration` | high / voluntary-economic | 30M cumulative movements and 24M current workers need different dated sources; the latter may cover origins beyond those listed. Kafala coercion merits an explicit mixed-type qualification. |
| `rwandan-genocide-flight` | high / refugee-flight | Separate 2M flight from 500K settled with a return/observation date. The DRC point does not show Tanzania or Burundi; preserve the genocide/victory sequence in the period note. |
| `yugoslav-wars` | high / refugee-flight | 4M includes internal displacement, while every drawn destination is abroad. Explain that denominator and source the 1.5M settlement/3M descendant estimates. |
| `syrian-civil-war` | high / refugee-flight | The note labels a peak refugee stock, not cumulative migration [S2]. Align destination figures with that date and substantiate the 2025 return/end-year values from exact tables. |
| `venezuelan-exodus` | high / refugee-flight | 7.7M is identifiable in R4V's 2023 report [S6]; a flow ending in 2026 needs the observation date retained. Peru also represents Ecuador, Chile and Brazil. |
| `rohingya-exodus` | high / refugee-flight | Separate end-2024 refugee stock from cumulative departures, and date each quantity. Identify the precise UN report behind the quoted characterization of the violence. |
| `ukraine-war` | high / refugee-flight | End-2025 refugees are a population stock [S2], not unique cumulative departures. Identify the specific situation table and explain the 0.9M not allocated to destinations. |
| `sudan-crisis` | high / refugee-flight | 13M includes 9-10M internally displaced, but the one arrow leads abroad and only 3.5M is allocated. Separate the two populations and date the largest-current-crisis claim. |
| `filipino-overseas` | high / voluntary-economic | The note supplies a current overseas stock in the cumulative migrants field. PSA worker surveys cover a specific work period [S7]; distinguish workers, all emigrants and descendants. |
| `highland-clearances` | medium / forced-expulsion | Medium conflicts with the 3x range, contrary to the inherited all-pass note. Edinburgh represents Australia as well; distinguish eviction, local resettlement and overseas migration. |
| `korean-colonial-migration` | medium / voluntary-economic | Mixed movement and wartime mobilization are explicitly disclosed. Keep this qualification visible alongside voluntary-economic; explain whether 1945 settlement values precede mass returns. |
| `lebanese-diaspora` | low / voluntary-economic | Low and the descendant caveat follow the checklist. The bibliography still needs field-level locators; Sao Paulo represents Argentina too, and later diaspora waves need separating. |
| `cuban-exodus` | high / refugee-flight | The note names its component waves, but the 1.2M total and modern descendants need locators and observation dates. Madrid also represents Latin America. |

### Sources checked in this run

Accessed September 8, 2026. Source checks are bounded by the cited page's
contents; they do not certify every field in the associated entry.

- **S1:** [SlaveVoyages methodology](https://legacy.slavevoyages.org/blog/methodology-trans-atlantic) supports approximately 12.5M embarked and 10.7M disembarked; it does not establish the atlas's modern descendant figures.
- **S2:** [UNHCR Data content](https://popstats.unhcr.org/refugee-statistics/methodology/data-content/) distinguishes end-year population stocks from annual solution flows. The indexed methodology text was readable; direct page retrieval failed, so no underlying refugee tables were verified from it.
- **S3:** [Cambridge: England's Jewish Solution](https://www.cambridge.org/core/books/englands-jewish-solution/7ECFE2968099D205C509FB3E2F89D68C) describes an England study for 1262-1290. This raises a coverage question for the atlas's combined English/French count, not proof that the book contains no continental discussion.
- **S4:** [Cambridge: New England's Generation](https://www.cambridge.org/core/books/new-englands-generation/D9D12C32D8A5ACE1B714E5586CC6EED7) confirms the cited work; neither its numeric tables nor the atlas's descendant total were verified.
- **S5:** [US Census: The Great Migration, 1910 to 1970](https://www.census.gov/library/visualizations/time-series/demo/the-great-migration.html) supports the six-million order of magnitude with a 1910-1970 envelope. It does not identify this as a state deportation program.
- **S6:** [R4V 2023 end-year report](https://rmrp.r4v.info/eyr2023/) identifies 7.7M refugees and migrants outside Venezuela at that reporting date. This establishes a date for the matching figure, not a 2026 cumulative count.
- **S7:** [PSA 2023 Overseas Filipino Workers results](https://psa.gov.ph/content/2023-overseas-filipino-workers-final-results) reports workers during April-September 2023. It illustrates why the worker survey, all overseas Filipinos and historical cumulative movement are different quantities, not a replacement for the atlas's total.

### Evidence and follow-through

The local visual evidence is retained under
`screenshots/migration-atlas-editorial-20260908/` in the operator's Siteprep
checkout: 96 frames, six contact sheets and `checks.json`. Browser-suite
results and reproducible commands are in [browser verification](notes.html).
These screenshots are local QA artifacts, not published research sources.

The follow-up item is to reconcile source/quantity/confidence/type/geography
findings against the existing Phase 5 content-iteration plan and this T8
checklist. Research corrections belong in a separate scoped data change with
an app rebuild; this review makes no dataset or production edits.


## Migration Atlas browser verification — September 8, 2026

The restored suites now run against `work/index.html`. Both inherited browser
scripts still named the removed `lib/dist/migration-atlas.html`; the path and
the bundle-size probe were corrected. Visual inspection also found that the
1950 South Asia camera placed Punjab above the frame: its test camera was
recentered and a Punjab-in-frame assertion added before a fresh full comparison.
Application source and the dataset were
not changed.

### Environment and results

macOS arm64; Python 3.12; Python Playwright 1.57.0, numpy 2.2.6 and Pillow
11.3.0. Playwright matches the repository's locked Node version and uses the
already installed Chromium 1200, Firefox 1497 and WebKit 2227 browser builds.
Python dependencies were installed in a disposable virtual environment.

| Run | Result |
|---|---|
| T1/T2/E2/E6 core | 535 assertions, 0 failures |
| T3 baseline generation plus T4-T6/E1-E7 | Eight goldens refreshed; 79/79 checks passed |
| Independent T3 comparison plus T4-T6/E1-E7 | 88/88 checks passed |
| T7 Chromium/Firefox/WebKit | 24/24 smoke checks passed |
| T8 rendering sample | All 48 isolated entries hit-testable at three dates; no JavaScript errors |

The independent run started fresh browser contexts and compared against the
saved goldens without `--update-goldens`; the 0.5% differing-pixel threshold and
16-per-channel tolerance were unchanged. All eight images were inspected.
This is a new machine baseline, not proof that it equals the original July
machine's rasterization.

The shipped T5 gate passed median frame time below 17ms, p95 below 33ms,
first render below 2000ms, bundle size below 3.5MB, and heap growth below 5%
after three timeline sweeps and garbage collection. These are local runner
results, not a performance guarantee for older phones.

The T6 implementation found no serious/critical axe violations in its main,
data-table and filters states. Manual screen-reader review, exhaustive state
coverage and cross-platform assistive-technology testing were not performed.
T7 is the inherited three-engine **smoke suite** (boot, pixels, selection,
pan/zoom, playback, JavaScript errors); it is not the full T3/T4 suite on every
engine and does not compare HTTP against file URLs. All browser runs here used
the local single-file artifact on macOS. The broader original plan's Windows,
Linux, served/file equivalence and manual accessibility gates remain open.

### Repeat

From `initiatives/migration-atlas/`, using Python 3.12 on macOS arm64:

```bash
python3 -m venv /tmp/migration-atlas-tests
/tmp/migration-atlas-tests/bin/python -m pip install -r lib/tests/requirements.txt
## Only if the matching browsers are not installed:
/tmp/migration-atlas-tests/bin/python -m playwright install chromium firefox webkit
node lib/tests/test_core.mjs
/tmp/migration-atlas-tests/bin/python lib/tests/test_browser.py
/tmp/migration-atlas-tests/bin/python lib/tests/test_crossbrowser.py
```

Re-baseline only deliberately after inspecting the changed rendering:

```bash
/tmp/migration-atlas-tests/bin/python lib/tests/test_browser.py --update-goldens
/tmp/migration-atlas-tests/bin/python lib/tests/test_browser.py
```

The eight committed goldens describe the above machine. A different platform
can have font/rendering differences; investigate before replacing them.
The full data review is in [editorial review](notes.html).
