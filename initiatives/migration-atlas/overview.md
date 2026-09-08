# World Migration Atlas

A thousand years of human movement on one map. Each migration is an arrow from
source to destination, its width set by how many people moved; a circle stays
behind at the destination, its area set by the diaspora there today. Time plays,
scrubs, and steps a year at a time; the map pans without boundaries and zooms
from the whole world to a coastline. 48 movements, from the Turkic migration
into Anatolia to the displacements of the 2020s, each with counts, causes,
confidence, and cited sources in its detail panel.

It runs from a local file. No server, no network, no installation - one 1.25 MB
HTML file with the dataset, both basemap resolutions and the d3 modules inlined.

The atlas was written in July 2026, before `initiatives/` existed, and was
adopted into the lifecycle on 2026-09-07. Its published output is the
[World Migration Atlas demo](../../demos/world_migration_atlas/index.html).

The source it is built from lives in `lib/`: the dataset, the application
modules, the build, and the T1-T8 test suites. `work/index.html` is what that
build produces and what the preview and a release publish, so the atlas can take
new research the way the wish asked - edit one JSON file, run the tests, rebuild.
The bundle in the repository is byte-for-byte the output of the source beside
it.

[The specification](spec.html) and [implementation plan](plan.html) are the
July 2026 originals, kept as written. What can be run today, and what a new
machine needs first, is in [the test plan](test-plan.html).
