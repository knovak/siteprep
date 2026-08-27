# Objectives

What "done" would mean, derived from the wish. Outcomes, not implementation —
how any of this is built belongs in `spec.md`.

## The point

**Make global change explorable as geography, time and movement—not as a
catalogue of disconnected maps.**

The wish combines four things that existing products usually separate: a large
catalogue of time-series data, composable visualizations, genuinely different
map projections, and a presentation surface whose controls can live on another
device. The result is educational only if a student can understand what a map
shows, where it came from and how its choices affect the story. Novel display
technology is not the measure of success.

## Done means

1. **A large, mixed catalogue can be understood before anything is mapped.**
   Hundreds of candidate datasets can be searched and filtered by subject,
   place level, time coverage and source. Each entry exposes its provenance,
   licence or reuse terms, units, update and version information, spatial and
   temporal coverage, resolution, known gaps and a link to the original source.

2. **Global does not mean country-only or falsely uniform.** Region, country,
   district and city observations can coexist when the source provides them.
   The system represents the actual place and boundary vocabulary of each
   dataset, makes missing levels visible and does not imply that every country
   has comparable districts, cities or historical boundaries.

3. **Time is an interactive dimension with an honest frame of reference.** A
   person can move through the available dates, animate change, pause on an
   exact period and see when values are measured, estimated, interpolated or
   unavailable. A displayed comparison identifies the dataset versions and
   time alignment that produced it so the same view can be reproduced later.

4. **One view can explain one dataset or a relationship among several.** A
   visualization may map a single measure, layer compatible measures, or place
   flows over a static field. Every visible encoding retains a readable legend,
   units, date, source and uncertainty or missing-data treatment. Incompatible
   combinations are refused or clearly qualified rather than rendered as a
   persuasive but meaningless picture.

5. **Projection is a deliberate, comparable choice.** A compatible scenario
   can be viewed on a conventional geographic projection and a Dymaxion-style
   projection without becoming a separately authored visualization. The
   interface explains discontinuities and distortion instead of treating a
   projection as decoration. A population-proportional cartogram remains a
   candidate for the specification: if included, it is paired with a geographic
   reference and makes its sizing variable unmistakable.

6. **The map can be the presentation while another device is the control.** The
   visual surface remains legible and responsive up to a large 4K display, with
   the map, title, essential legend and source identity visible at presentation
   distance. A laptop or handheld view can choose data, time, layers,
   projection, pan and zoom without putting the full control panel on the large
   display. The two views stay visibly synchronized over an ordinary wireless
   classroom setup.

7. **The same material works for exploration and teaching.** A member of the
   general public can begin from a clear topic and explore without instruction;
   a high-school or undergraduate learner can inspect definitions, sources and
   limitations; and a teacher can prepare a reproducible view or sequence for a
   facilitated explanation. The product does not depend on display novelty to
   communicate scale, trend or movement.

8. **Adding a dataset is a documented contribution, not a private programming
   trick.** The interfaces and procedures say what metadata, geography, time,
   values, licences and validation evidence a contribution needs. A contributor
   other than the original author can add a representative dataset, receive
   useful validation errors and make it discoverable and renderable without
   changing unrelated catalogue entries or visualization code.

9. **Display hardware and data providers can evolve independently.** Dataset
   records, prepared views and citations are portable and versioned rather than
   trapped in one hosted map service. The design keeps a documented path for a
   spherical display—through an export or adapter boundary chosen in the
   specification—without making access to sphere hardware a prerequisite for
   the first useful version.

## Explicitly not the first version

- Hosting and normalizing every source dataset. The first version proves a
  contribution contract across representative sources and geographic levels;
  it is not a replacement for Our World in Data, NOAA, NASA or Data Commons.
- A universal global district-and-city ontology. Uneven administrative
  coverage is disclosed and mapped through source-aware identifiers rather than
  hidden behind a fictional hierarchy.
- Directly operating every spherical projection installation. The first
  version preserves and proves the chosen sphere boundary; deployment to
  particular hardware can follow when that hardware and its operator are
  available.
- A native remote-control application or a required AirPlay integration. The
  outcome is a separate wireless controller and presentation surface; the
  transport is a specification choice.
- Learning-management, grading, multi-user editing and a general social
  publishing system. They are adjacent educational products, not prerequisites
  for exploring and presenting a cited global map.

## How we will know

- A representative catalogue containing hundreds of metadata records remains
  searchable and understandable, and includes time series from more than one
  provider at country, subnational and city resolution where those levels
  actually exist.
- An unfamiliar contributor follows the written procedure to add one new
  dataset, sees intentional validation failures, fixes them and reaches a
  discoverable visualization without editing core rendering code.
- A learner can build and later reproduce a cited view of one measure, a
  compatible layered comparison and an origin-destination flow, including a
  period with missing data.
- One compatible vector scenario can switch between a conventional projection
  and a Dymaxion-style projection while preserving its data, time, encodings
  and citations.
- At a 4K viewport, the presentation remains readable while a second phone or
  laptop viewport changes time, layers, projection, pan and zoom; the display
  reflects each accepted change and does not expose the full control surface.
- The chosen sphere export or adapter proof carries a prepared view's data,
  timing, attribution and visual intent far enough to validate the boundary
  without requiring a permanent sphere installation.

## Questions for the spec

The objectives deliberately leave the architecture open. The specification
must compare whether catalogue datasets and prepared visualizations are
separate versioned objects; whether contributors submit metadata and adapters,
upload hosted data, or both; how place identities and changing boundaries align
across sources; which raster, vector, tile and flow forms can survive each
projection; whether population distortion is a fixed basemap or a recomputed
cartogram; how the display and controller discover and synchronize with each
other, including any offline classroom requirement; and whether spherical
support begins as an SOS-compatible export or a direct renderer.

It must also choose the first teaching setting to optimize—unguided public
exploration, teacher-led presentation or student-authored work—while preserving
a credible path to the others. Those decisions belong in `spec.md`, with the
existing `background.md` evidence and alternatives, rather than being smuggled
into the objectives as implementation facts.
