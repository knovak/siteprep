# Objectives

What a finished World Migration Atlas does. Written from the user's wish and the
July 2026 specification; the atlas already meets most of it, and this is the
standard any later change is held to. The exact requirements and acceptance
criteria are in [spec.md](spec.html); how it was built is in [plan.md](plan.html).

- Explain historical migrations and diasporas from 1000 AD onward - forced
  enslavement, expulsion, refugee flight, imperial collapse, indenture, colonial
  settlement and voluntary movement - with sources, counts, reasons,
  destinations, and stated uncertainty.
- Show population-scaled flows and persistent settlement circles, colored by
  source region or by a coercion spectrum, with a legend the reader can turn on.
- Play automatically, and step backward and forward through time exactly:
  scrubbing away from a year and back to it reproduces the same frame.
- Pan without boundaries and zoom anywhere, on a desktop pointer and on touch.
- Make detail panels, filters, search, focus, the accessible data table, the
  keyboard controls and the data caveats usable at both layouts.
- Run from a local file with no server, no network, and no installation.
- Accept new research by editing one dataset file and rebuilding, so a movement
  can be added without touching application code.

The last objective is the one the initiative could not meet until the
development package was restored on 2026-09-07. `lib/` now carries the build,
the dataset and the tests, and `work/index.html` is reproducible from them - the build and the maintenance path are in `lib/README.md`.

The specification describes an initial 44-movement dataset; the dataset that
shipped, and the one in `lib/data/migrations.json`, has 48. Neither count is
rewritten in its source document.
