# Objectives

Drafted 2026-10-20 from the [wish](wish.html) and [supplied background](background.html). Revised after the user's [review of PR #609](https://github.com/knovak/siteprep/pull/609#pullrequestreview-5583172159); the choices and remaining questions are recorded in [decisions](decisions.html).

## Purpose

Let someone create square photo markers, choose when each marker belongs in a photo timeline, and download the finished JPEGs from a browser. A marker can serve as a divider, section marker, title card, or chapter image between groups of photos.

The first useful release combines an interactive editor with individual and batch delivery. The supplied Python generator establishes the initial image parameters. The web application adds the selected shapes, interactive controls, and CSV workflow while keeping image processing in the user's browser.

## What done means

| Objective | Observable acceptance evidence |
| --- | --- |
| **1. Create square JPEG markers.** Generate JPEG files that open and display correctly, with the chosen appearance and readable title text when supplied. Offer the existing donut, a star, and a solid-color square with no inner shape. | Export all three designs with several color combinations, including a plain solid-color marker without a title. An independent image reader opens each file and confirms JPEG format and equal width and height. Short and long titles fit without unintended clipping; unsupported text or an unfit title produces a correction request. |
| **2. Make design interactive.** Let the user choose among the three shapes and change their applicable colors, including the background and text, without code or command-line steps. Show a preview that represents the eventual image. | Changes appear in the preview, and the exported image matches its layout, shapes, colors, and text within normal JPEG compression differences. Controls are labeled, keyboard accessible, and usable in Chrome and Safari on desktop and iOS. |
| **3. Preserve intentional photo timing.** Allow date/time to be entered or omitted using the defaults below. Show the effective timezone and write the resulting date/time consistently into the JPEG. A successful export must contain the required metadata. | Independent metadata read-back verifies `DateTimeOriginal`, `DateTimeDigitized`, and `DateTime` for individual and batch exports. Cover both fields blank, a date with no time, explicit date/time, a date boundary, and a selected timezone different from the browser's. Nonblank invalid values and failed metadata writing are visible errors; a file without required timestamps is never presented as a successful marker. |
| **4. Make one image easy to obtain.** A user can enter a title, choose appearance and time or accept their defaults, inspect the preview, and save a JPEG in one workflow. | Complete this workflow in a supported browser without Python, a local command-line tool, an account, credentials, or a processing service. The saved file contains the intended image and metadata. |
| **5. Make CSV batches complete and understandable.** A user can import and review a CSV, generate multiple markers, reuse a style, and adjust individual entries. Optional columns and blank optional values use sensible, visible defaults. | A batch with at least ten entries covers repeated titles, explicit dates/times, date-only rows, omitted date/time, omitted style columns, and an invalid nonblank value. Every successfully generated marker is identifiable and obtainable, filenames are distinct, and no item is silently dropped or overwritten. Invalid entries are identified before generation; runtime failures identify the affected entry and allow recovery without losing the user's batch. |
| **6. Process locally using WASM.** Use WASM for a substantive part of generating the actual exported images or their required metadata, with all image processing performed in the user's browser. The implementation will discover and evaluate the WASM approach. | Inspection and a repeatable browser test show that the export path uses WASM and makes no processing requests or uploads of entered text, batch data, or images. After the application's required static assets have loaded, editing and generation work with the network disconnected. Loading static assets initially is allowed; offline installation and caching are separate choices. |
| **7. Ship as a portable static demo.** The finished application can graduate into `demos/` and work under the repo's static hosting arrangement. | Serve the final output from its intended subdirectory, load its WASM and other assets successfully, and complete single and batch exports. All runtime dependencies are in the published demo or graduated shared libraries. No runtime URL points into `initiatives/`, and no application backend, API key, or server-side image generator is required. |

## Date, time, and timezone defaults

| User input | Effective date/time |
| --- | --- |
| Date and time both blank | The current date and time when generating the marker, shown in the effective timezone. |
| Date supplied, time blank | Midnight, `00:00:00`, on that date in the effective timezone. |
| Date and time supplied | The supplied local date and time in the effective timezone. |

Show the effective timezone to the user. Default to the browser's timezone, with a visible UTC fallback if it cannot be determined, and allow the user to choose another timezone for photos from elsewhere. Display the interpreted date/time so the default is not hidden.

The user suggested optional location entry to work out the timezone. Assess it as a convenience during specification, including how it can work locally; it is not a requirement to provide a location or a first-release acceptance gate. Handling a time without a date, daylight-saving ambiguities, and the precise EXIF timezone representation remain details for specification and implementation.

## Initial designs and inherited parameters

The first release offers exactly the three requested designs: donut, star, and solid color. Further shapes belong to future versions. A solid-color marker can have no title; when a title is supplied, the ordinary text controls apply.

Use the legacy Python image parameters wherever applicable:

| Parameter | Legacy behavior to preserve |
| --- | --- |
| Image dimensions | Square; default 2000 × 2000 pixels, with the reference's size parameter retained. |
| JPEG quality | 95. |
| Donut geometry | Outer circle touches the midpoints of all four sides; inner radius is 78% of the outer radius. |
| Default colors | Black background/corners, red ring, light-green center (`#b6d7a8`), black title, white outline. |
| Text | Bold, centered, automatically sized to fit, with outline thickness scaled to the font size. |
| Other applicable controls | Preserve the reference's color, font, text-color, outline-color, and size options using browser-appropriate controls. Date/time defaults follow the reviewed rules above. |

Star geometry and the mapping of inherited color controls to star and solid-color designs will be specified without adding new shape families.

## Verification and delivery

Verify exported images and their metadata directly. Photo-library application validation, import/order tests, and selecting a primary photo-library compatibility target are not required now. No application-specific sorting guarantee is claimed.

The browser target is Chrome and Safari on desktop and iOS. Record the versions and devices used when testing. Maximum tested batch size and acceptable generation times will be named in the specification and test plan; the ten-entry example is a minimum workflow check, not an assumed maximum batch size.

During longer work, show progress and keep the interface responsive enough to communicate status and recover from failure. Oversized or otherwise unsupported requests must be explained before they exhaust the browser. Packaging must preserve each JPEG's bytes and metadata and allow the user to retrieve the complete set despite browser download restrictions.

A first release needs brief user instructions covering the single-image workflow, CSV columns and defaults, date/time meaning, and downloads, plus reproducible build/deployment instructions and evidence for the acceptance checks above.

## Boundaries and next step

The initial goal is creating marker images. It does not require uploading or reorganizing an existing photo library, editing original photos, cloud accounts or synchronization, direct integrations with photo services, or a general-purpose drawing application.

The next lifecycle step is a specification applying the recorded decisions: define the editor, star geometry, CSV columns/default precedence, download packaging, and timezone behavior. It can evaluate the optional location input and set performance targets. WASM library/runtime selection is implementation discovery, not a question the user must answer before the specification can proceed.
