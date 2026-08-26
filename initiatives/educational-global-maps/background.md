# Background

Researched 2026-08-26, before objectives were drafted. Findings only.

## Already being provided

### [NOAA Science On a Sphere and SOS Explorer](https://sos.noaa.gov/about/products/)

NOAA has the closest end-to-end precedent: a public catalog of more than 600 global datasets, a six-foot spherical projection system, a Windows flat-screen or projector application, and a mobile virtual globe. The full sphere and desktop Explorer accept custom datasets; the mobile product does not. The full system includes roughly 600 datasets, while the desktop and mobile products expose roughly 175. ([SOS product comparison](https://sos.noaa.gov/about/products/))

The desktop Explorer is free for personal or classroom use and the mobile product is free; a full sphere requires a dark room, three or four projectors, two computers, support, and a distributor quote. The mobile product can cast or mirror to a large display. ([requirements and cost](https://sos.noaa.gov/about/products/))

The full SOS system is normally controlled from an iPad over Wi-Fi or Bluetooth. Its remote interface browses the catalog and controls playback, orientation, zoom, annotations, playlists, and layer visibility or transparency away from the display. ([remote app manual](https://sos.noaa.gov/support/sos/manuals/remote-app/))

The catalog is explicitly educational, combines material from NOAA, NASA, universities, museums, and other partners, records source and usage restrictions per dataset, and warns that original source data rather than the educational product should support decisions. ([catalog terms and contents](https://sos.noaa.gov/catalog/datasets/16/))

### [Our World in Data](https://ourworldindata.org/explorers)

Our World in Data offers free public Data Explorers that group indicators by topic, with interactive charts, tables, and maps over time. Its catalog includes population, health, conflict, migration, climate, poverty, food, energy, and other topics, and its chart interface supports downloadable and embeddable outputs. ([Data Explorers](https://ourworldindata.org/explorers), [reuse and embedding](https://ourworldindata.org/faqs))

Programmatic access includes chart data and metadata, searchable tables and indicators, and a public ETL catalog in Parquet and Feather formats. The APIs are documented as under active development, and third-party source licenses continue to govern some data even when the resulting OWID chart is reusable. ([API overview](https://docs.owid.io/projects/etl/api/), [Tables API](https://docs.owid.io/projects/etl/api/catalog-api/), [reuse rules](https://ourworldindata.org/faqs))

The published interface and APIs are a curated chart-and-dataset system rather than a documented framework for contributor-defined layers, flows, alternate projections, detached controllers, or spherical output. ([chart API and supported chart tabs](https://docs.owid.io/projects/etl/api/chart-api/))

### [Gapminder Tools and data](https://www.gapminder.org/tools/)

Gapminder provides free classroom-oriented maps, bubble charts, ranks, trends, tables, time controls, downloadable data, and an offline application. Its bulk repositories contain hundreds of indicators assembled from many sources, and its classroom materials target people who may otherwise avoid data and statistics. ([Tools](https://www.gapminder.org/tools/), [data downloads](https://www.gapminder.org/data/), [teaching materials](https://www.gapminder.org/teaching/materials/))

Gapminder's stated input threshold is a documented country-or-territory time series covering at least five years. That gives it strong global country-level comparison but stops before the requested general region, district, and city catalog. ([Gapminder FAQ](https://www.gapminder.org/about/about-gapminder/faq/))

### [NASA Worldview](https://www.earthdata.nasa.gov/home)

NASA Worldview is a free, open-source web application for browsing more than 1,200 global full-resolution satellite imagery layers. It supports layer discovery, pan and zoom, time animation, comparison by swipe/opacity/spy, snapshots and underlying-data downloads, shareable or embeddable states, polar views, and mobile browsers; many near-real-time layers arrive within hours of observation. ([Worldview overview and features](https://earthdata.nasa.gov/s3fs-public/2025-03/worldview-booklet.pdf?VersionId=vkMI8sbfY1WdDGqFKFSUus_orr4xsYnv), [application license and scope](https://worldview.earthdata.nasa.gov/?abt=on))

Worldview is an imagery browser rather than a general statistical knowledge base. NASA also notes that Worldview exposes selected high-priority products and parameters, not every NASA standard product, with the full catalog remaining in Earthdata Search. ([application scope](https://worldview.earthdata.nasa.gov/?abt=on))

### [Data Commons](https://docs.datacommons.org/what_is.html)

Data Commons is an open-source knowledge graph that normalizes public statistical data from many providers against shared entities and a common schema. It exposes timelines, maps, APIs, Google Sheets functions, and embeddable web components rather than acting as a file repository. ([system overview](https://docs.datacommons.org/what_is.html), [API overview](https://docs.datacommons.org/api/index.html))

Its place model directly covers countries, first- and second-level administrative areas, and cities worldwide, with third- through fifth-level areas, towns, and villages available only in some countries. Its documentation explicitly warns that not every statistical variable is available at every place type. ([place types and coverage](https://docs.datacommons.org/place_types.html))

The public map component renders a single statistical variable for child places within a parent place, can be coupled to a slider, and supports pan and zoom. Public web components currently need no API key; programmatic access uses an API key, with official keys available for school and application use. ([map component](https://docs.datacommons.org/api/web_components/map), [component catalog](https://docs.datacommons.org/api/web_components/index.html), [API-key policy](https://docs.datacommons.org/api/index.html))

### [DCAT 3](https://www.w3.org/TR/vocab-dcat-3/) and [STAC](https://www.ogc.org/standards/stac/)

Two public standards already cover much of a possible knowledge-base vocabulary. W3C DCAT 3 describes catalogs, datasets, dataset series, distributions, and data services, including spatial and temporal coverage and resolution, versions, provenance, update frequency, formats, checksums, access rights, and per-distribution licenses. ([DCAT 3 recommendation](https://www.w3.org/TR/vocab-dcat-3/))

The OGC SpatioTemporal Asset Catalog standard describes geospatial assets at particular places and times through a minimal core plus extensions, while the STAC API supports search by time, area, and metadata properties. Its original imagery focus has expanded to vectors, point clouds, lidar, elevation models, labels, and composites. ([STAC standard](https://www.ogc.org/standards/stac/), [STAC API](https://docs.ogc.org/cs/25-005/25-005.html))

These standards address discovery and interchange rather than educational narrative, map rendering, projection choice, learning controls, or display/controller coordination. ([DCAT scope](https://www.w3.org/TR/vocab-dcat-3/), [STAC scope](https://www.ogc.org/standards/stac/))

### [kepler.gl](https://docs.kepler.gl/), [deck.gl](https://deck.gl/docs), and [Flowmap.gl](https://flowmap.gl/)

kepler.gl is a browser application and embeddable component for geospatial analysis at large scale. It supports layered maps, filters, time playback, globe and 3D views, split maps, exports, and point, arc, line, polygon, trip, raster, vector-tile, H3, heatmap, and other layer types. ([kepler.gl guide](https://github.com/keplergl/kepler.gl/blob/master/docs/user-guides/README.md), [kepler.gl architecture](https://docs.kepler.gl/))

deck.gl is the lower-level WebGPU/WebGL framework beneath kepler.gl. It composes data into visual layers and multiple views, handles picking and filtering, supports major basemap providers, and tiles very large data so that only the current viewport is loaded. ([deck.gl overview](https://deck.gl/docs), [tile layer](https://deck.gl/docs/api-reference/geo-layers/tile-layer))

Flowmap.gl adds WebGL-rendered movement flows with adaptive aggregation and filtering; FlowmapBlue adds spreadsheet, URL, browser-local, and R-based ways to publish origin-destination flows, including time fields. ([Flowmap.gl](https://flowmap.gl/), [FlowmapBlue authoring](https://www.flowmap.blue/how-to-make-a-flow-map), [R time-series examples](https://flowmapblue.github.io/flowmapblue.R/articles/flowmapblue.html))

These tools supply rendering components rather than a curated educational data catalog, a contributor-facing data contract, or a presentation/controller system. deck.gl and kepler.gl use permissive open-source licenses; FlowmapBlue is free for non-commercial use and requires contact for commercial use. Basemap, hosting, and data services remain separate dependencies. ([deck.gl license](https://github.com/visgl/deck.gl/blob/master/LICENSE), [kepler.gl license](https://github.com/keplergl/kepler.gl/blob/master/LICENSE), [FlowmapBlue license](https://github.com/FlowmapBlue/FlowmapBlue))

### [Worldmapper](https://worldmapper.org/) and [D3 geographic projections](https://github.com/d3/d3-geo-polygon)

Worldmapper is a public collection of cartograms in which territory area is resized by the mapped variable. Each map links its underlying figures, and the project uses a consistent regional color scheme across its country-level maps. ([Worldmapper](https://worldmapper.org/), [map and data FAQ](https://worldmapper.org/faq/))

D3's open-source geographic modules already implement conventional projections, interrupted and polyhedral projections, and an Airocean projection identified as Buckminster Fuller's Dymaxion map. They can project GeoJSON into these layouts, but they do not themselves provide a data catalog or population cartogram workflow. ([D3 Airocean and polyhedral projections](https://github.com/d3/d3-geo-polygon/blob/main/README.md), [D3 projection tools](https://github.com/d3/d3-geo-projection))

### [SAGE3 and its SAGE predecessors](https://sage3.sagecommons.org/?page_id=921)

The SAGE family separates shared high-resolution displays from personal devices. SAGE2 redesigned an earlier cluster-and-pixel-streaming system around browsers and cloud technologies for remote and co-located work; published configurations range from one computer driving a 4K monitor to multi-machine tiled walls. ([SAGE2 introduction](https://sage2.sagecommons.org/project/introduction/), [display configurations](https://www.evl.uic.edu/documents/collaborate_com2014-camera_ready-2.pdf))

SAGE3 is a web-based shared spatial workspace that lets laptops and display walls open the same board, supports multiple wireless screen shares, and is used for visually intensive teaching. Public clients and hosted servers are available, and self-hosting is documented. It is a general collaboration surface, not a geographic data catalog or map-projection system. ([SAGE3 use cases](https://sage3.sagecommons.org/?page_id=921), [downloads](https://sage3.sagecommons.org/?page_id=358), [support and self-hosting](https://sage3.sagecommons.org/?page_id=60))

### No complete match found

The reviewed public systems split the wish among catalogs, statistical knowledge graphs, satellite imagery browsers, visualization libraries, cartogram or Dymaxion renderers, high-resolution collaboration surfaces, and sphere-specific presentation systems. None of the reviewed products documents the complete combination of contributor-extensible multi-resolution time-series data, layers and flows, conventional/Dymaxion/population-cartogram projections, a 4K display with a detached controller, and spherical output. ([NOAA SOS](https://sos.noaa.gov/about/products/), [Our World in Data](https://ourworldindata.org/explorers), [Data Commons](https://docs.datacommons.org/what_is.html), [NASA Worldview](https://www.earthdata.nasa.gov/home), [kepler.gl](https://docs.kepler.gl/), [Worldmapper](https://worldmapper.org/), [SAGE3](https://sage3.sagecommons.org/?page_id=921))

## Lessons from similar attempts

### Educational effect depends on the learning setting

NOAA's cross-site evaluation found that both facilitated and unfacilitated SOS visitors reported learning, but facilitation correlated strongly with perceived learning and with reported understanding of time, scale, and continual Earth change. The display's novelty alone did not account for the strongest reported outcomes. ([NOAA docent best practices and evaluation summary](https://sos.noaa.gov/education/resources/docent-best-practices/))

### Animation helps some map-reading tasks and not others

A controlled comparison of animated flow maps with static paper and computer map series found no animation advantage for learning quantities at locations, but did find an advantage for learning and remembering trend patterns. A separate controlled experiment found animated maps faster and more accurate than static small multiples for identifying moving space-time clusters, with pace and cluster coherence affecting results. ([flow-map study](https://cartographicperspectives.org/index.php/journal/article/view/cp30-johnson-nelson), [space-time cluster study](https://pure.psu.edu/en/publications/a-comparison-of-animated-maps-with-static-small-multiple-maps-for))

### Cartograms add both interpretive and authoring friction

Research around the go-cart.io generator identified practices such as pairing a cartogram with a conventional map, preserving a common color scheme, showing missing data and legends, and adding interaction. A later comparative evaluation found the tool had poor usability in key areas including data entry despite its explicit ease-of-use goal. ([cartogram practices](https://arxiv.org/abs/2006.00285), [comparative usability evaluation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11078394/))

### Harmonized global series contain visible editorial choices

Gapminder fills gaps to make broad patterns legible, represents history using current country boundaries, publishes versions, and warns that much of its data is not suitable for detailed numerical analysis. Our World in Data separately requires reusers to preserve both OWID attribution and the underlying provider's license and citation. ([Gapminder data methodology](https://www.gapminder.org/data/documentation/), [OWID reuse rules](https://ourworldindata.org/faqs))

### Geographic depth remains uneven after normalization

Data Commons exposes a common place hierarchy but states that data availability varies by place type and that third- through fifth-level areas, towns, and villages are only partially available across countries. Its place-resolution API also warns that name-based geocoding can be imprecise for ambiguous names. ([place coverage](https://docs.datacommons.org/place_types.html), [place resolution limits](https://docs.datacommons.org/api/rest/v2/resolve.html))

### A hosted map platform can disappear with its embeds

Google Fusion Tables spent nearly nine years as a free tool for visualizing large datasets, especially maps, before Google retired both the service and API in 2019. Existing embedded maps, charts, tables, and cards stopped working; Google supplied data export and migration paths, but the published visualizations themselves still ended. ([official Fusion Tables shutdown notice](https://workspaceupdates.googleblog.com/2018/12/google-fusion-tables-to-be-shut-down-on.html))

### Display systems evolve on a different cycle from their content

SAGE moved from C++ middleware and cluster-driven display walls to a browser-based second generation, then to a web workspace shaped by remote work and mixed personal/large displays. NOAA's SOS family likewise exposes different dataset, contribution, and control capabilities on its full sphere, desktop, and mobile products. ([SAGE generation history](https://sage3.sagecommons.org/?page_id=921), [SOS product comparison](https://sos.noaa.gov/about/products/))

## Questions this raises

- Is the first knowledge base meant to catalog source datasets, prepared visualizations, or both as separately versioned objects?
- Does “new data sets could be added by others” mean submitting metadata and an adapter, uploading and hosting data, or also accepting educational narrative and visualization presets?
- How should one catalog describe country, district, and city resolution when administrative levels and available boundaries differ by provider and country?
- Does alternate projection apply to raster imagery and animated tiles as well as to vector boundaries and points?
- Is population distortion one fixed population basemap, a cartogram recomputed for any variable, or both?
- Is spherical support an export format for existing SOS installations, a renderer that directly drives a sphere, or both?
- Which teaching setting is primary: unguided public exploration, teacher-led classroom use, prepared presentations, or assignments in which students add data?
- Must the 4K display and detached controller continue to work on a local classroom network without Internet access?
- What remains visible on the 4K display when controls, legends, filters, citations, and explanatory text move to the handheld device?
