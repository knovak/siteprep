# Editorial reconciliation — September 9, 2026

## Partition population definition — September 10, 2026

This supersedes the older Partition disposition below. Coordinates, destination
values and dates remain unchanged; the broader T8 item remains actionable.

| Entry | Source and locator | Correction and remaining evidence |
|---|---|---|
| `india-partition` | [Bharadwaj, Khwaja and Mian, The Big March](https://atif.scholar.princeton.edu/sites/g/files/toruqf3691/files/SSRN-id1124093_0.pdf), printed pp. 1, 4, 6, section 3.1.1 and footnote 14; author-hosted PDF text read directly. | Use 14.5M and label the 1951 population after migration, including subsequent births. Remove the unsupported superlative, untraced range and death toll. Modelled departures are a different measure. Medium confidence does not certify the retained allocations or descendants. |

The source receipt preserves the previous fields and input/output hashes.
The existing two destination points still omit the Bengal route. A matching
allocation sum does not establish the component values or their geography.

## Indochinese and Afghan headline review — September 10, 2026 (UTC)

This continuation corrects one population headline and qualifies another.
It supersedes these two entries' older dispositions below. All periods,
coordinates, destination allocations and descendant values remain unchanged;
the original T8 reconciliation item remains actionable.

| Entry | Source and access evidence | Correction and remaining work |
|---|---|---|
| `vietnamese-boat-people` | [UNHCR's 2000 chapter 4](https://www.unhcr.org/africa/sites/afr/files/legacy-pdf/3ebf9bad0.pdf), printed p. 79, opening paragraph; corroborated by [its 2019 resettlement history](https://www.unhcr.org/africa/sites/afr/files/legacy-pdf/5d1633657_63.pdf), printed p. 7. Both official PDF texts were retrieved directly. | Renamed to Indochinese refugee crisis and replaced 2M with 3M, explicitly a rounded lower-bound figure: the source says more than 3M fled during the two decades after 1975. The cohort includes land and sea flight. Medium confidence applies to this broad headline; boat arrivals, sea deaths, allocations and descendants still need distinct evidence. |
| `afghan-refugees` | [UNHCR's 2000 chapter 5](https://www.unhcr.org/sites/default/files/legacy-pdf/3ebf9baf0.pdf), printed p. 116, was available only as indexed text; direct retrieval failed. It identifies a December 1990 population stock. | Retained the 8M headline as an explicitly unverified cumulative estimate and reduced high confidence to low. A dated stock does not establish unique people across repeated flight and return. The undated destination and diaspora sums and the combined Germany/North America endpoint remain unresolved. |

Subsequent downloads and PDF rendering requests returned access/rate-limit
errors. No table screenshot inspection is claimed. The source receipt records
that boundary, exact changed fields and dataset hashes. These corrections do
not certify the unchanged settlement circles or geographic allocations.

## Endpoint geometry review — September 10, 2026 (UTC)

The earlier destination review incorrectly called the Lebanese entry's West
Africa point **offshore**. Its stored coordinate, 6.5 N, 10 W, is on land in
Liberia in both bundled basemaps; the 6× view confirms that placement. The point
is preserved. This corrects the review, not the underlying regional allocation:
it still cannot locate all West African communities or substantiate their
population estimates.

A new reproducible audit covers **all 140 endpoints: 48 sources and 92
destinations**. It uses the atlas's vendored `d3.geoContains` and the exact
stored coordinates with both bundled land datasets. Fifteen points are outside
the 1:110 million polygons, sixteen are outside the 1:50 million polygons, and
seven change classification between scales. Nineteen endpoint records are
outside at least one scale; repeated coordinates account for four New York
records. Adding the corrected Liberia point gives 17 distinct coordinates for
visual inspection, each captured at world zoom and 6× (34 captures).

**Outside a polygon does not prove an incorrect historical location.**
[Natural Earth's land documentation](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-land/)
describes generalized land polygons including major islands. The filenames
`land50` and `land110` refer to map scales, not 50/110-metre positional precision.
Coastal rounding and omitted small islands can change containment; a point on
land can still misrepresent a multi-country label. These flags require review,
not automatic relocation or a new population allocation.

The captures use the unchanged app at its blank opening year, 1000, to isolate
the coastline. A pink ring marks the projected coordinate for inspection; it
is a test annotation, not an application change. The following observations
were checked in both contact sheets. They do not substitute for T8's separate
migration-period playback, source evidence or settlement-allocation checks.

| Endpoint(s), stored latitude/longitude | Inside 110m / 50m polygons | Visual finding and disposition |
|---|---|---|
| Medieval Jewish expulsions, source (50, 1) | Yes / No | Channel/coastal boundary differs by scale. Keep the combined England/France source unresolved; do not move it merely to make containment pass. |
| Sephardic expulsion, destination 3 (44, 10) | Yes / No | Near the northwestern Italian coastline at 6×. Coastal precision needs evidence; the Netherlands is still not separately located. |
| Transatlantic slave trade, source (5, 5) | No / No | Offshore near the Niger Delta coastline. The broad West/West-Central African source remains schematic; no embarkation-port breakdown was verified. |
| Transatlantic slave trade, destination 2 (16.5, -66) | No / No | Caribbean sea point south of the larger islands. Individual island allocations remain unresolved. |
| Indian Ocean slave trades, destination 2 (-18, 55) | No / No | Sea point east of Madagascar and north of the smaller islands. It does not separately place South Asian destinations. |
| Acadian expulsion, source (45.3, -64.3) | Yes / No | Bay/estuary coastline changes between scales. A settlement-specific source is still needed. |
| Acadian expulsion, destination 2 (40, -74) | No / No | Offshore beside the New Jersey coast. The earlier New York-area description was approximate; France remains unlocated. |
| Irish Famine destination 1; Jewish Pale emigration destination 1; Holocaust displacement destination 2; Lebanese diaspora destination 2 (40.7, -74) | No / No | Shared New York harbor/coastal coordinate. A false containment result here is not enough to reject New York or infer an offshore settlement. All four records remain separate in the receipt. |
| Indian indenture, destination 1 (-20.2, 57.5) | No / Yes | Mauritius appears at the detailed scale and is omitted at the coarse scale. Preserve this point; coarse containment alone would create a false correction. |
| Indian indenture, destination 2 (8, -59) | No / No | Sea point off the northern Guyana coast. It does not individually locate Trinidad, Guyana and Suriname. |
| Indian indenture, destination 4 (-29.8, 31) | No / Yes | Durban-area coastal detail differs by scale. East Africa is still not separately represented. |
| Chinese emigration, destination 1 (3, 105) | No / No | Sea point east of the Malay Peninsula. Replacing it with one city would still need a defensible regional representation and must not attribute the whole 12M allocation to that city. |
| Soviet Jewish emigration, destination 2 (40.6, -74) | No / Yes | New York coastal detail differs by scale. Germany remains unlocated by this shared endpoint. |
| Rohingya exodus, destination 1 (21.4, 92) | No / No | Coastal Cox's Bazar-area reference. Check a detailed camp source before moving it; Bhasan Char is still not separately located. |
| Filipino overseas migration, source (13, 122) | No / No | Archipelago/inter-island point. A land-only rule would not solve the missing distribution of source communities. |
| Filipino overseas migration, destination 3 (22.3, 114.2) | Yes / No | Hong Kong harbor/coastal detail differs by scale. Wider East/Southeast Asia remains unlocated. |
| Lebanese diaspora, destination 3 (6.5, -10) | Yes / Yes | Inland Liberia point. Correct the prior offshore finding; leave regional population and community placement unresolved. |

The receipt records hashes of the dataset, both land files and both vendored
geometry modules; the browser receipt records the application hash and each
camera/coordinate. Re-running `lib/tools/audit_geography.py` produces identical
JSON from the same inputs. Dataset, coordinates, application sources and
`work/index.html` are unchanged in this increment. The report and reproducible
inspection evidence advance the existing reconciliation item; **T8 remains
open**, including field-level sources, regional splits and the plan's distinct
300-km proximity check, which polygon containment does not implement.

## Historical headline and confidence continuation — September 10, 2026 (UTC)

This review addresses all four entries that still carried high confidence
and began before 1800. It supersedes their confidence/source dispositions in
the older audit below. The New England headline is now approximately 20,000,
with medium confidence and a title matching the source's English-settler
cohort. Acadian confidence is now low. The transatlantic and Australian convict
headlines retain high confidence with explicit, limited source rationales.
No coordinate, destination allocation, descendant figure or period was changed.

Accessed September 10, 2026. The following pages were read directly. Population
estimates and confidence judgments are distinguished from the remaining
unverified fields; none of these four entries passes all of T8 yet.

| Entry | Evidence and locator | Disposition and remaining evidence |
|---|---|---|
| `puritan-great-migration` | [American Ancestors Great Migration Study Project](https://www.americanancestors.org/projects/great-migration-study-project), opening scope statement and Methodology: approximately 20,000 English settlers in 1620-1640; the project correlates genealogical accounts with original records. The Directory subsection describes records by head of household; its roughly 5,700 entries are not the number of all people. | Replaced 21,000 with the source's rounded 20,000; existing settlement field is the same cohort. Renamed to English Great Migration to New England because the source does not count religious affiliation. High becomes medium for an approximate historical reconstruction. The inherited 30M descendants are unverified. The bibliography now distinguishes Virginia DeJohn Anderson from Robert Charles Anderson's study project; the book's quantitative tables were not read. East Anglia/Boston remain schematic points. |
| `acadian-expulsion` | [Parks Canada, Fort Anne history](https://parks.canada.ca/lhn-nhs/ns/fortanne/culture/histoire-history), The Acadian Deportation: about 10,000 deported in 1755-1762. [Grand-Pre history](https://parks.canada.ca/lhn-nhs/ns/grandpre/culture/histoire-history) separates nearly 6,000 removed from Nova Scotia in 1755 from permission to return in 1764. | High becomes low: the inherited 11,500 for 1755-1764 has no verified page-level locator. Do not turn the different scope/date summaries into a statistical range or overwrite the total as if they matched. The 9,000 destination sum is an unverified later settlement allocation, not a survival count. Louisiana's 900,000 descendants need a date and cohort; France is not located by the North American point. |
| `convict-australia` | [National Museum of Australia, Convict transportation peaks](https://www.nma.gov.au/defining-moments/resources/convict-transportation-peaks), opening summary and final section: more than 162,000 transported in 1788-1868; 1833 was the peak. | Retained high for the rounded transportation headline and documented period, with an explicit exception rationale for the pre-1800 start. It does not certify 150,000 settled or 5M descendants. The Sydney-area point combines New South Wales/Van Diemen's Land and omits Western Australia. The arithmetic gap does not identify the missing geographic allocation, permanent settlement, returns or mortality. |
| `atlantic-slave-trade` | [SlaveVoyages methodology](https://legacy.slavevoyages.org/blog/methodology-trans-atlantic), Coverage of the Slave Trade, paragraph beginning with the database's 36,000 voyages: estimated 12,520,000 departures and roughly 10.7M disembarkations, incorporating reconstruction beyond recorded voyages. | Retained the rounded 12.5M headline and high confidence for its order of magnitude. This is an explicit pre-1800 exception, not exact enumeration or confidence in all destination/descendant fields. The inherited 10.6M allocation sum remains unreconciled; its 0.1M gap from arrivals is not a death toll. Embarkations, disembarkations and modern descendants remain separate quantities. |

The [Great Migration Parish Map](https://www.americanancestors.org/publications/great-migration-study-project/parish-map)
was also read. Its smaller map/directory coverage does not replace the project
population estimate. [Cambridge's book landing page](https://www.cambridge.org/core/books/new-englands-generation/D9D12C32D8A5ACE1B714E5586CC6EED7) and bibliography could not
be fetched in this session; indexed publisher metadata identifies Virginia
DeJohn Anderson's *New England's Generation* (1991), but supplies no verified
numeric table. No claim here treats the book as directly read.

The source-specific confidence judgments apply to the headlines. The existing
single confidence field cannot express separate certainty for each destination
or descendant estimate, so the detail notes explicitly state those limits.
The remaining nine entries beginning before 1800 were already medium or low;
this pass does not certify them. The full T8 item remains actionable for their
field-level sources and for all unresolved quantity and geographic findings.

## Recent populations and destination inspection — September 10, 2026 (UTC)

Six recent entries now distinguish a dated source from an inherited estimate.
Syria, Venezuela and Ukraine retain their rounded headline numbers with exact
source locators. Rohingya coverage is qualified as regional, its Bangladesh
destination now uses the registered December 2024 population, and the violence
description names the UN fact-finding body. The Filipino entry no longer claims
its untraced total is current and carries low confidence. Sudan's source-access
limit is explicit. The figures and unresolved fields are detailed below.

The 44 destination close-ups left after the earlier review have now been
captured and inspected at 6×. This completes that inspection coverage, not
geographic acceptance: combined labels still put distant places at a single
point. T8 remains open for those corrections and the unresolved numerical
sources. The September 9 sections below remain the record of the earlier
increment; this continuation supersedes their six entry dispositions and the
statement that 44 destination inspections have not been performed.

### Source and quantity reconciliation

Accessed September 10, 2026 (UTC). A verified headline does not certify its
destination allocations, period, descendant attribution or every historical
claim. In particular, a stock includes people present on a date and cannot be
summed across years to obtain unique departures.

| Entry | Exact source and supported field | Disposition and remaining evidence |
|---|---|---|
| `syrian-civil-war` | [UNHCR Global Trends 2021](https://www.unhcr.org/my/sites/en-my/files/legacy-pdf/62a9d1494.pdf), printed p. 17, “By country of origin” and Figure 5: 6,848,900 refugees at end-2021, rounded to 6.8M. The accompanying paragraph identifies births and recognitions as components of change. PDF text read directly. | Replaced the undated peak claim with this observation date. The 5.6M destination sum is not its breakdown: the source gives Türkiye 3.7M, Lebanon 840,900 and Jordan 673,000. Those do not support the inherited 2.9M and 1.4M groups. Allocation dates remain open. Removed the later return/stock comparison from the entry because different snapshots do not measure returns by subtraction. |
| `venezuelan-exodus` | [R4V End-Year Report 2023](https://rmrp.r4v.info/eyr2023/), “Regional Overview”: 7.7M refugees and migrants outside Venezuela, including 6.5M in Latin America and the Caribbean. Report text read directly. | Kept the 2023 reporting frame. The atlas allocates 6.9M, leaving 0.8M relative to its rounded headline; neither that subtraction nor the source locates the remainder. The broad regional groups need dated country-level tables. |
| `rohingya-exodus` | [UNHCR Projected Global Resettlement Needs 2026](https://www.unhcr.org/asia/sites/asia/files/2025-06/projected-global-resettlement-needs-2026_3.pdf), printed pp. 47–48, Asia and the Pacific: over 1.1M Rohingya refugees in the region at end-2024. [Joint Response Plan 2025–26](https://bangladesh.un.org/sites/default/files/2025-03/JRP-2025-26.pdf), printed p. 14, “Situation Overview”: 1,005,520 Rohingya registered in Bangladesh at December 31, 2024, in Cox's Bazar and Bhasan Char camps. Both PDF texts read directly. | Headline 1.1M is a lower, rounded regional scale, not an exact global count. Both Bangladesh fields now equal the same registered stock, 1,005,520, replacing the undated 950K and 1M; this does not create a descendant estimate. The destination label includes Bhasan Char, which its existing point does not separately locate. Other countries and unregistered arrivals remain unallocated. |
| `ukraine-war` | [UNHCR Ukraine Situation: 2026 plans and financial requirements](https://data.unhcr.org/ar/documents/download/120716), printed p. 11, “Refugee response”: 5.86M refugees outside Ukraine, including 5.3M across Europe. PDF text read directly. | Headline 5.9M is the rounded reported stock. Three inherited destinations total 5M: 0.86M below the source, or 0.9M below the display. Their groups and dates are not established by this paragraph. A planning report's assistance target is also a different measure; it must not replace the refugee population. |
| `sudan-crisis` | [UNHCR Mid-Year Trends 2025](https://www.unhcr.org/mid-year-trends), Sudan situation and internally displaced people sections: 13.4M refugees, asylum-seekers and IDPs; 10M displaced within Sudan at mid-2025. **Indexed summary only:** direct web retrieval returned 429 and a direct download attempt returned 403. | The 13M display is a coarse rounding of the combined stock. Its internal component is not an international movement. The 3.5M destination remains unverified: subtracting two rounded totals is not a source for this grouped allocation. No new population value is inferred. |
| `filipino-overseas` | [CFO 2014 Compendium of Statistics](https://cms-cdn.e.gov.ph/CFO/pdf/30.%202014-CFO-Statistical-Compendium.pdf), printed pp. 10 and 22: December 2013 stock 10,238,614; permanent, temporary and irregular populations, with incomplete return and status-change coverage. PDF downloaded, text read and those two pages visually inspected. [PSA 2023 OFW final results](https://psa.gov.ph/content/2023-overseas-filipino-workers-final-results?vcode=x5txXT), Table 1 / Figure 1: 2.16M workers during April–September 2023. Page read directly. | Neither measure supplies the atlas's 12M or its 8.5M destination sum. Retained those inherited figures with an explicit unresolved-source warning and changed high to low confidence. The older CFO stock and narrower PSA worker population are comparisons, not replacement estimates for a 2026 total. |

The Rohingya cause now attributes the finding to the **UN Independent
International Fact-Finding Mission on Myanmar**. Its [August 22, 2019 OHCHR
release](https://bangkok.ohchr.org/news/2019/news-release-un-fact-finding-mission-myanmar-calls-justice-victims-sexual-and-gender)
connects the military's 2017 sexual violence to evidence of genocidal intent.
This replaces the imprecise “UN … ethnic cleansing/genocide” attribution; it
does not soften the account or claim a separate court judgment.

### Remaining destination inspections

The 44 additional destination records were each centered at 6× at the recorded
peak year, or the midpoint when no peak exists, with the relevant migration
selected by its ID. All 44 captures rendered without an uncaught JavaScript
error; the JSON receipt records coordinates, camera, year and the input hash.
The 44 captures were visually inspected in four contact sheets. Coordinate
placement on the bundled basemap is an observation, not proof of a historical
population distribution.

[Observation receipt](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/destination-inspection-20260910.json). Contact sheets: [1](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/destination-inspection-20260910/contact-1.jpg), [2](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/destination-inspection-20260910/contact-2.jpg), [3](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/destination-inspection-20260910/contact-3.jpg), [4](https://github.com/knovak/siteprep/blob/sweep/migration-atlas/reconcile-editorial-findings-20260910/initiatives/migration-atlas/notes/destination-inspection-20260910/contact-4.jpg).

No point was moved and no destination total was split without evidence.

| Entry / destination | Name and coordinate (latitude, longitude) | 6× observation |
|---|---|---|
| `sephardic-expulsion` / 2 | North Africa (Morocco, Algiers) (33, -6) | Morocco reference point; does not separately locate Algiers. |
| `sephardic-expulsion` / 3 | Italy & Netherlands (44, 10) | Northern Italy reference point; the Netherlands is not located by it. |
| `spanish-colonization` / 2 | Andes & Southern Cone (-12, -75) | Peruvian Andes reference point; Southern Cone destinations are not separately located. |
| `atlantic-slave-trade` / 2 | Caribbean (16.5, -66) | Offshore Caribbean aggregate; not an island or a specific settlement. |
| `atlantic-slave-trade` / 3 | Spanish Mainland America (8, -75) | Northern South America reference point; does not represent the whole Spanish mainland allocation geographically. |
| `atlantic-slave-trade` / 4 | North America (33, -81) | Southeastern United States reference point; wider North American settlement remains schematic. |
| `indian-ocean-slave-trades` / 2 | Indian Ocean islands & South Asia (-18, 55) | Offshore east of Madagascar; does not locate the named South Asian destinations. |
| `huguenot-exodus` / 2 | Cape Colony (-33.9, 18.9) | Cape Town area reference point; region remains schematic. |
| `acadian-expulsion` / 2 | Atlantic colonies & France (40, -74) | New York area reference point; France and other Atlantic colonies are not separately located. |
| `irish-famine` / 2 | Britain (53.5, -2.2) | Britain reference point; broad national rather than community coverage. |
| `irish-famine` / 3 | Canada & Australia (45.5, -73.6) | Montreal area reference point; Australia is not located by it. |
| `european-mass-migration` / 2 | Argentina (-34.6, -58.4) | Buenos Aires area reference point; broad Argentina allocation. |
| `european-mass-migration` / 3 | Brazil (-23.5, -46.6) | Sao Paulo area reference point; broad Brazil allocation. |
| `european-mass-migration` / 4 | Canada (49.9, -97.1) | Winnipeg area reference point; broad Canada allocation. |
| `indian-indenture` / 2 | Caribbean (Trinidad, Guyana, Suriname) (8, -59) | Offshore Atlantic point north of Guyana; does not locate Trinidad, Guyana and Suriname individually. |
| `indian-indenture` / 3 | Fiji (-17.7, 178) | Fiji reference point on the island group; local destination remains schematic. |
| `indian-indenture` / 4 | South & East Africa (-29.8, 31) | Durban area reference point; East Africa is not separately located. |
| `chinese-diaspora-19c` / 2 | Americas (US, Peru, Cuba, Canada) (37.7, -122.4) | San Francisco area reference point; Peru, Cuba and Canada are not located by it. |
| `chinese-diaspora-19c` / 3 | Australasia & Pacific (-34, 145) | Inland southeastern Australia reference point; Pacific destinations are not separately located. |
| `jewish-pale-emigration` / 2 | Britain, Argentina, Palestine (51.5, -0.1) | London area reference point; Argentina and Palestine are not located by it. |
| `armenian-genocide` / 2 | France, USA, South America (43.3, 5.4) | Marseille area reference point; the Americas are not located by it. |
| `armenian-genocide` / 3 | Soviet Armenia (40.2, 44.5) | Armenia reference point; the quantity still needs cohort evidence. |
| `greek-turkish-exchange` / 2 | Turkey (39.5, 32.5) | Anatolia reference point, but this reverse movement incorrectly shares the Anatolian source of the Greece-bound movement. |
| `white-emigres` / 2 | Harbin & Shanghai (45.8, 126.6) | Harbin area reference point; Shanghai is not separately located. |
| `holocaust-displacement` / 2 | United States (40.7, -74) | New York area reference point; broader United States allocation. |
| `india-partition` / 2 | Pakistan (Muslims from India) (31.5, 73) | Punjab reference point; the Bengal direction is absent. |
| `jews-from-arab-lands` / 2 | France & Americas (48.9, 2.3) | Paris area reference point; the Americas are not located by it. |
| `vietnamese-boat-people` / 2 | Australia, Canada, France (-33.9, 151.2) | Sydney area reference point; Canada and France are not located by it. |
| `afghan-refugees` / 2 | Iran (32.5, 53.7) | Iran reference point; national aggregate, not a camp or community. |
| `afghan-refugees` / 3 | Europe & North America (51, 10) | Germany reference point; North America is not located by it. |
| `soviet-jewish-emigration` / 2 | United States & Germany (40.6, -74) | New York area reference point; Germany is not located by it. |
| `syrian-civil-war` / 2 | Lebanon & Jordan (33.5, 36) | Near the Lebanon-Syria border; cannot locate both Lebanon and Jordan at community scale. |
| `syrian-civil-war` / 3 | Europe (esp. Germany) (51, 10) | Germany reference point; broad European allocation. |
| `venezuelan-exodus` / 2 | Peru, Ecuador, Chile, Brazil (-12, -77) | Lima area reference point; Ecuador, Chile and Brazil are not separately located. |
| `venezuelan-exodus` / 3 | USA & Caribbean (25.8, -80.2) | Miami area reference point; Caribbean destinations are not separately located. |
| `ukraine-war` / 2 | Germany & Western Europe (51.2, 9) | Germany reference point; broader Western Europe is not separately located. |
| `ukraine-war` / 3 | North America (43.7, -79.4) | Toronto area reference point; broader North America is not separately located. |
| `filipino-overseas` / 2 | USA & Canada (34, -118.2) | Los Angeles area reference point; Canada is not located by it. |
| `filipino-overseas` / 3 | East & Southeast Asia (22.3, 114.2) | Hong Kong area reference point; broader East and Southeast Asia is not separately located. |
| `highland-clearances` / 2 | Lowland cities & Australia (55.9, -3.2) | Edinburgh area reference point; Australia is not located by it. |
| `korean-colonial-migration` / 2 | Manchuria (Jiandao/Yanbian) (42.9, 129.5) | Yanbian area reference point; wider Manchuria is not separately located. |
| `lebanese-diaspora` / 2 | United States (40.7, -74) | New York area reference point; broader United States allocation. |
| `lebanese-diaspora` / 3 | West Africa (6.5, -10) | Inland Liberia reference point; the earlier offshore description was incorrect, as corrected in the September 10 endpoint review above. Regional settlement remains schematic. |
| `cuban-exodus` / 2 | Spain & Latin America (40.4, -3.7) | Madrid area reference point; Latin America is not located by it. |

## September 9 increment

The inherited audit covers 48 entries. This increment fixes four confidence-rule conflicts, distinguishes the quantities already described in the dataset, and makes schematic geography and unreconciled allocations visible. It does not certify the historical values, replace unverified numbers, or claim that all T8 criteria pass. The original reconciliation todo remains actionable.

## Verified source passages

- [US Census Bureau, The Great Migration, 1910 to 1970](https://www.census.gov/library/visualizations/time-series/demo/the-great-migration.html), September 13, 2012, introductory paragraphs: approximately six million people left the South in 1910–1970. The entry now uses that envelope. Classifying this internal flight under `refugee-flight` is an editorial interpretation of its recorded oppression and economic motives; it avoids suggesting state-ordered deportation. It does not establish legal refugee status or independently verify the 25M descendant estimate.
- [SlaveVoyages database methodology](https://legacy.slavevoyages.org/blog/methodology-trans-atlantic), Coverage: 12,520,000 captives departed Africa and approximately 10.7M disembarked. This supports the existing rounded headline figures. The inherited four allocations total 10.6M; their discrepancy and separate descendant-source requirement are now explicit. The unsupported largest-in-history claim is removed.
- R4V and UNHCR source locators from the September 8 audit remain in that record. This run could read search-indexed summaries for the 2023 7.7M figure, but direct R4V access returned 403 and UNHCR returned 429. No fresh source-table verification is claimed. The new stock label follows the recorded measure; it is not a newly calculated total.

## Disposition of each entry

Every row below still needs exact source passages or tables for destination allocations and reported diaspora/stock figures. A confidence badge remains the inherited assessment except for the four direct conflicts with the existing greater-than-twofold rule. No coordinates or population values were guessed. All aggregate points now carry a shared schematic-geography explanation in the detail panel. The remaining 44 destination-specific 6× inspections identified in the original audit remain open.

| Entry | Reconciliation in this increment | Remaining evidence from the original audit |
|---|---|---|
| `turkic-anatolia` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Low matches the 4x range. Document how 60M descendants are attributed to this medieval flow rather than modern Anatolia generally. |
| `roma-migration` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Low matches the 10x range. The cause describes uncertain departure and invasion pressure; voluntary-economic needs a qualification supported by the cited scholarship. |
| `mongol-displacements` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Low matches the 5x range. Flight and deportation share one type. The destination point (34N,40E) represents none of India, Egypt or Anatolia accurately at 6x. |
| `jewish-expulsions-medieval` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | The cited Mundill book covers England, 1262-1290 [S3]; locate evidence for the French totals and dates. Explain medium for a medieval estimate and the Channel source centroid. |
| `sephardic-expulsion` | Changed medium to low: the stored range exceeds twofold; added an explanatory note. | Medium conflicts with the checklist: the range spans 5x. Add distinct locators for the three destination allocations and 2M descendants. |
| `spanish-colonization` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Explain the pre-1800 medium-confidence exception and why allocations total 650K against 700K migrants; Mexico/Andes points compress several regions. |
| `atlantic-slave-trade` | Source locator for embarked/disembarked estimates; explicit 10.6M allocation sum; removed unqualified superlative. | 12.5M embarked and 10.7M disembarked are supported [S1]. Four settlement allocations total 10.6M; explain rounding/coverage, source all descendant values and remove or qualify the unsourced largest claim. |
| `indian-ocean-slave-trades` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Low is appropriate to the broad reconstruction. Explain the post-1000 subset, 3.8M destination total against 6M moved, and the Indian-Ocean point representing South Asia too. |
| `puritan-great-migration` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | The book identity is confirmed [S4], not its numeric tables. Justify the high-confidence historical exception; the 30M descendant figure needs a separate source and definition. |
| `huguenot-exodus` | Changed medium to low: the stored range exceeds twofold; added an explanatory note. | Medium conflicts with a 2.67x range. Religious describes motive but the persecution also needs the coercion context kept visible; Cape descendants require a source. |
| `acadian-expulsion` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Justify high confidence with archival locators. Louisiana represents a later resettlement; specify the waves and why destination totals omit 2.5K people. |
| `convict-australia` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Locate the transportation count separately from the 5M descendants. The Sydney centroid does not display Van Diemen's Land or Western Australia; explain the geographic coverage. |
| `trail-of-tears` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | The cited Cherokee-focused title needs locators for the broader multi-nation total. Separate movement-specific descendants from present tribal membership. |
| `irish-famine` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Canada and Australia share a Montreal point. Document the 1845-1855 count, modern ancestry dates and overlap with European mass migration. |
| `european-mass-migration` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Check 55M against the stated Americas-only scope and 46M destination total. Define descendants separately and document overlapping Irish/Jewish streams. |
| `indian-indenture` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Locate each destination allocation and explain 1.21M settled against 1.6M moved. A single Caribbean point and Durban point omit other named places. |
| `chinese-diaspora-19c` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Mixed free and contract migration is disclosed but one indentured-labor color covers both. Southeast Asia is placed offshore; the US point also represents Peru/Cuba/Canada. |
| `chuang-guandong` | Labelled cumulative movements including repeat moves, following the existing circular/return-migration account. | Circular movement and 9M permanent settlers are distinguished. The 100M descendant estimate needs evidence independent of modern Northeast China's population. |
| `circassian-expulsion` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Range supports medium provisionally; page-level evidence is still missing. Source the transit-mortality and descendant figures and clarify the combined national groups. |
| `russian-siberia` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Settled and departed are distinguished but unsourced at field level. Novosibirsk represents a region extending into the Far East; explain the descendant cohort. |
| `jewish-pale-emigration` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Source the 1881-1914 total and modern descendant attribution. The London destination combines Argentina and Palestine in one northern-European point. |
| `armenian-genocide` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Keep deaths separate from refugee counts. Soviet Armenia's total population cannot automatically stand for descendants of these refugees; Marseille also represents the Americas. |
| `greek-turkish-exchange` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | A shared source makes both opposing movements start in Anatolia. Explain 1.6M in the note against 1.5M settled in Greece and trace the descendant estimates. |
| `white-emigres` | Changed medium to low: the stored range exceeds twofold; added an explanatory note. | Medium conflicts with the 2.22x range. Explain the missing 500K in the destination sum and the multi-city aggregates. |
| `us-great-migration` | Census-linked 1910–1970 envelope and six-million total; explicit mixed coercion/agency note and refugee-flight classification. | The 6M scale is supported by Census [S5], whose envelope begins in 1910. internal-forced is defined as forced relocation: explain the coercion/agency distinction, rather than implying a deportation order. |
| `german-expulsions` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | High may describe the migration total, but the 500K-2M death range has different uncertainty. Explain that distinction and provide destination/descendant locators. |
| `holocaust-displacement` | Explicitly disclosed 1.05M destination sum versus 1M headline; kept the overlap unresolved rather than inventing a correction. | Settlement totals exceed migrants (1.05M versus 1M). The note admits overlapping refugee waves but does not reconcile that excess. Modern Israeli population needs cohort-specific attribution. |
| `india-partition` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | The Punjab centroid omits the Bengal direction at every date. Source the allocations and descendant figures and qualify the largest-single-event assertion. |
| `palestinian-nakba` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | UNRWA counts need an observation date and registration definition. Amman represents five named areas; current refugee registration is not a precise location for all descendants. |
| `jews-from-arab-lands` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | The cause describes heterogeneous persecution, expulsion and emigration; a universal forced-expulsion classification needs per-country qualification and quantified sources. |
| `windrush-commonwealth` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Jamaica is the only source point although South Asia is in scope. Locate evidence covering both regions and separate the 1948-1971 cohort from all current descendants. |
| `vietnamese-boat-people` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Separate all Indochinese refugees from boat departures and sea deaths. Sydney also stands for Canada and France; source the destination and descendant allocations. |
| `afghan-refugees` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | An 8M cumulative total cannot be reconstructed by summing annual refugee stocks [S2]. Document de-duplication of return/re-displacement waves and the dates of destination stocks. |
| `soviet-jewish-emigration` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | The citation does not name an exact Tolts paper/table. Trace the 1970-2000 total and explain Germany being represented only by a New York point. |
| `mexico-us` | Labelled cumulative movements including repeat moves, following the existing circular/return-migration account. | The note distinguishes gross movement, settled stock and descendants. Specify the gross-flow method, dates of the stock/ancestry estimates and post-2008 claim. |
| `gulf-labor-migration` | Labelled cumulative movements including repeat moves, following the existing circular/return-migration account. | 30M cumulative movements and 24M current workers need different dated sources; the latter may cover origins beyond those listed. Kafala coercion merits an explicit mixed-type qualification. |
| `rwandan-genocide-flight` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Separate 2M flight from 500K settled with a return/observation date. The DRC point does not show Tanzania or Burundi; preserve the genocide/victory sequence in the period note. |
| `yugoslav-wars` | Labelled the total as including internal displacement; did not assign the whole total to an international arrow. | 4M includes internal displacement, while every drawn destination is abroad. Explain that denominator and source the 1.5M settlement/3M descendant estimates. |
| `syrian-civil-war` | Labelled the headline as reported population abroad in detail, tooltip and table; no new numeric estimate. | The note labels a peak refugee stock, not cumulative migration [S2]. Align destination figures with that date and substantiate the 2025 return/end-year values from exact tables. |
| `venezuelan-exodus` | Labelled the headline as reported population abroad in detail, tooltip and table; no new numeric estimate. | 7.7M is identifiable in R4V's 2023 report [S6]; a flow ending in 2026 needs the observation date retained. Peru also represents Ecuador, Chile and Brazil. |
| `rohingya-exodus` | Labelled the headline as reported population abroad in detail, tooltip and table; no new numeric estimate. | Separate end-2024 refugee stock from cumulative departures, and date each quantity. Identify the precise UN report behind the quoted characterization of the violence. |
| `ukraine-war` | Labelled the headline as reported population abroad in detail, tooltip and table; no new numeric estimate. | End-2025 refugees are a population stock [S2], not unique cumulative departures. Identify the specific situation table and explain the 0.9M not allocated to destinations. |
| `sudan-crisis` | Labelled the total as including internal displacement; did not assign the whole total to an international arrow. | 13M includes 9-10M internally displaced, but the one arrow leads abroad and only 3.5M is allocated. Separate the two populations and date the largest-current-crisis claim. |
| `filipino-overseas` | Labelled the headline as reported population abroad in detail, tooltip and table; no new numeric estimate. | The note supplies a current overseas stock in the cumulative migrants field. PSA worker surveys cover a specific work period [S7]; distinguish workers, all emigrants and descendants. |
| `highland-clearances` | Changed medium to low: the stored range exceeds twofold; added an explanatory note. | Medium conflicts with the 3x range, contrary to the inherited all-pass note. Edinburgh represents Australia as well; distinguish eviction, local resettlement and overseas migration. |
| `korean-colonial-migration` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Mixed movement and wartime mobilization are explicitly disclosed. Keep this qualification visible alongside voluntary-economic; explain whether 1945 settlement values precede mass returns. |
| `lebanese-diaspora` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | Low and the descendant caveat follow the checklist. The bibliography still needs field-level locators; Sao Paulo represents Argentina too, and later diaspora waves need separating. |
| `cuban-exodus` | Schematic geography and incomparable destination estimates disclosed; figures retained pending evidence. | The note names its component waves, but the 1.2M total and modern descendants need locators and observation dates. Madrid also represents Latin America. |

## Acceptance boundary

T8 remains open for field-level quantities, pre-1800 confidence exceptions, stock observation dates, cohort-specific descendants, mixed-type interpretation and detailed endpoint evidence. The correction scope deliberately preserves all original numeric values and coordinates. The new tests enforce the broad-range confidence rule and reject unknown quantity categories; they test representation, not historical truth.


## Source key from the September 8 audit

These are the source locators referenced as S1–S7 above, with the original verification limits. They are carried forward from the earlier audit; this page adds no new source verification.

Accessed September 8, 2026. Source checks are bounded by the cited page's
contents; they do not certify every field in the associated entry.

- **S1:** [SlaveVoyages methodology](https://legacy.slavevoyages.org/blog/methodology-trans-atlantic) supports approximately 12.5M embarked and 10.7M disembarked; it does not establish the atlas's modern descendant figures.
- **S2:** [UNHCR Data content](https://popstats.unhcr.org/refugee-statistics/methodology/data-content/) distinguishes end-year population stocks from annual solution flows. The indexed methodology text was readable; direct page retrieval failed, so no underlying refugee tables were verified from it.
- **S3:** [Cambridge: England's Jewish Solution](https://www.cambridge.org/core/books/englands-jewish-solution/7ECFE2968099D205C509FB3E2F89D68C) describes an England study for 1262-1290. This raises a coverage question for the atlas's combined English/French count, not proof that the book contains no continental discussion.
- **S4:** [Cambridge: New England's Generation](https://www.cambridge.org/core/books/new-englands-generation/D9D12C32D8A5ACE1B714E5586CC6EED7) confirms the cited work; neither its numeric tables nor the atlas's descendant total were verified.
- **S5:** [US Census: The Great Migration, 1910 to 1970](https://www.census.gov/library/visualizations/time-series/demo/the-great-migration.html) supports the six-million order of magnitude with a 1910-1970 envelope. It does not identify this as a state deportation program.
- **S6:** [R4V 2023 end-year report](https://rmrp.r4v.info/eyr2023/) identifies 7.7M refugees and migrants outside Venezuela at that reporting date. This establishes a date for the matching figure, not a 2026 cumulative count.
- **S7:** [PSA 2023 Overseas Filipino Workers results](https://psa.gov.ph/content/2023-overseas-filipino-workers-final-results) reports workers during April-September 2023. It illustrates why the worker survey, all overseas Filipinos and historical cumulative movement are different quantities, not a replacement for the atlas's total.


## Opening-year convention — September 9 review follow-up

At the user's request, the approximate start dates for Romani migration and
the Indian Ocean slave trades were moved from 1000 to 1001 AD, while the
opening map stays at 1000 with no flows or circles. This is a presentation
convention, not new historical evidence; all population values, end dates
and coordinates remain as recorded.
