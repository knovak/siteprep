# Decisions

## 2026-10-20 — What should the first release validate?

**Verify JPEG images and EXIF metadata directly; do not validate a photo-library application now.**

The user wrote, “don't do any validation of a photo library application - not needed now,” both on the proposed import/order check and on the compatibility-target question ([acceptance comment](https://github.com/knovak/siteprep/pull/609#discussion_r4323456078), [target question](https://github.com/knovak/siteprep/pull/609#discussion_r4323466256)).

This removes the photo-library import/sorting acceptance gate and the question of selecting Apple Photos, Google Photos, or Lightroom. It retains image-opening and independent EXIF read-back checks. Application-specific ordering is not claimed as verified; any future library testing is separate work.

## 2026-10-20 — Which browsers are supported first?

**Chrome and Safari, on desktop and iOS.**

The user's answer was “chrome and safari, desktop and ios” ([comment](https://github.com/knovak/siteprep/pull/609#discussion_r4323469327)).

This settles the browser/platform families for the editor and single/batch exports. Exact versions and test devices will be recorded in the test plan and results; no additional browser family is implied.

## 2026-10-20 — What do blank date/time fields mean, and which timezone applies?

**Both fields blank means current date/time. An explicit date with no time means midnight in the effective timezone.**

The user asked to “leave the date/time blank, to indicate the current date/time” ([blank-field comment](https://github.com/knovak/siteprep/pull/609#discussion_r4323436011)). They also explained: “Usually a user just wants the date, assuming midnight - but local time, which could be anywhere” ([timezone comment](https://github.com/knovak/siteprep/pull/609#discussion_r4323483321)).

These are distinct cases: leaving both fields empty requests now; entering a date with no time requests 00:00:00 on that date. The same distinction applies to omitted or blank optional CSV values.

The user delegated the visible default timezone to the agent, offering browser timezone or UTC. **Selected default: the browser's timezone, with a visibly identified UTC fallback if detection fails.** This makes the ordinary local-time workflow convenient while allowing a different timezone for photos from another place. The effective timezone and interpreted date/time must be visible and adjustable.

### Alternatives considered

| Default | Strengths | Weaknesses |
| --- | --- | --- |
| Browser timezone — selected | Matches the current local-time workflow without another input; suitable for the default “now” case. | It may differ from the location of an older or travel photo, so the displayed default must be changeable. |
| UTC | Uniform across devices and locations. | Usually requires an extra choice for a marker meant to represent midnight at a particular place. |

### What this settles, and what it does not

- Blank date/time is valid input and must not be rejected by validation.
- An explicit date with blank time preserves the intended local midnight rather than becoming “now.”
- Optional location entry to infer a timezone was suggested with “maybe”; retain it for assessment as a convenience, not as a required location field or a promised first-release feature.
- Location inference, if adopted, must preserve browser-local processing and make an ambiguous or unknown location visible.
- Time-only input, daylight-saving ambiguity handling, and EXIF offset representation remain specification/implementation details. The default timezone choice does not settle those details.

## 2026-10-20 — Which designs and image parameters belong in the first release?

**Donut, star, and solid-color square; inherit the legacy Python image parameters.**

The user requested the current donut inside the square, a star inside the square, and “nothing inside the square image - a solid block of one color.” They added: “more to be defined in future versions” and “image sizes an other parameters should be set as in the legacy python implementation” ([comment](https://github.com/knovak/siteprep/pull/609#discussion_r4323500055)).

The applicable reference defaults are a 2000 × 2000 square, JPEG quality 95, black background, red ring, light-green center (`#b6d7a8`), black bold centered auto-sized text, and a white scaled outline. The donut touches the side midpoints and its inner radius is 78% of its outer radius. Retain applicable reference options through browser controls; the reviewed date/time behavior above supersedes the old CLI defaults.

This settles the initial three shape choices and the source of the image parameters. Star geometry, browser font selection, and mapping existing color controls to each design remain specification details. A plain solid-color marker can omit its title. No additional shape family is required for the first release.

## 2026-10-20 — How are batches supplied?

**CSV, with optional columns wherever defaults are sensible.**

The user wrote, “CSV is fine. allow for optional columns where defaults are sensible” ([comment](https://github.com/knovak/siteprep/pull/609#discussion_r4323504907)).

The specification will define column names, which columns are required, precedence between row values and shared settings, and how omitted/blank optional values use the displayed defaults. It must include the date/time rules above and inherited image parameters. This does not settle download packaging.

## 2026-10-20 — Who chooses the WASM approach?

**Discover and evaluate it during implementation.**

In response to the WASM-approach question, the user said, “that will be for the implementation to discover” ([comment](https://github.com/knovak/siteprep/pull/609#discussion_r4323508279)).

The user does not need to select a library or runtime now. The browser-only WASM requirement remains; the specification can set the behavior and evaluation criteria while implementation establishes the approach through working evidence.
