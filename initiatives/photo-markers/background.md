# Supplied background

Received 2026-10-20 with the wish. This records the user's supplied references and observations from reading them; no external prior-art research was requested or performed.

## Reference files

The three attachments are retained unchanged under `notes/reference/divider-image/`. The Python file is in `scripts/` to match the layout documented by the attachments.

| Attachment | Preserved source | Role |
| --- | --- | --- |
| README.md | [Reference README](https://github.com/knovak/siteprep/blob/main/initiatives/photo-markers/notes/reference/divider-image/README.md) | Design, parameters, examples, batch-driver sketch, and possible extensions. |
| generate_divider.py | [Python generator](https://github.com/knovak/siteprep/blob/main/initiatives/photo-markers/notes/reference/divider-image/scripts/generate_divider.py) | Initial implementation using Pillow and piexif. |
| SKILL.md | [Reference skill document](https://github.com/knovak/siteprep/blob/main/initiatives/photo-markers/notes/reference/divider-image/SKILL.md) | Original usage instructions; retained as background, not installed as a repo skill. |

These links target the repository source on main and become available when this initiative's creation PR merges. Nested reference files are retained as source material rather than copied into the published initiative pages.

## What the starting point implements

The [generator](https://github.com/knovak/siteprep/blob/main/initiatives/photo-markers/notes/reference/divider-image/scripts/generate_divider.py) draws a square RGB image with a circular outer ring touching the four side midpoints, a smaller center circle, and a centered, automatically sized title. It exposes corner, ring, center, text, and outline colors, date and time, image size, and font selection. Defaults include a 2000-pixel square and JPEG quality 95.

With piexif available, it writes `DateTimeOriginal`, `DateTimeDigitized`, and `DateTime`, plus a `Software` tag. If piexif is absent, it silently saves a JPEG without EXIF. The supplied code has no timezone-offset handling or metadata read-back verification. Its type annotations use Python 3.10 union syntax despite the README's Python 3.9+ requirement. These are observations about the reference, not validated behavior of the future application.

The [README](https://github.com/knovak/siteprep/blob/main/initiatives/photo-markers/notes/reference/divider-image/README.md) supplies a CSV driver example and sketches rounded rectangles, hexagons, diamonds, and multiline text. Those examples are not integrated batch or shape-selection features in the supplied generator. Its Flask example is background only: the user's wish explicitly requires WASM processing in the browser without a server.

## Questions for objectives and specification

- Which shapes and controls make the first interactive editor useful, and how should previews match exported images?
- How should a user set each marker's date, time, and timezone so that importing it preserves the intended position among photos? Which photo-library import and sort behaviors need explicit verification?
- What should batch entry, per-image overrides, preview, file naming, and delivery look like? How should duplicate names and invalid rows be handled?
- Which browser WASM approach can support rendering, JPEG encoding, and required metadata with acceptable download size and batch memory use? What can be reused from the Python reference?

The initiative remains at `wish`. Its first actionable item is to draft objectives from the wish and these references. The intended output is a static demo; the implementation and its dependencies will need to live within the eventual demo or graduated shared libraries, without runtime references into `initiatives/`.
