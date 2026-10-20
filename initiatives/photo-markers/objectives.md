# Objectives

Drafted 2026-10-20 from the [wish](wish.html) and [supplied background](background.html).

## Purpose

Let someone create recognizable square photo markers, choose when each marker belongs in a photo timeline, and download the finished JPEGs from a browser. A marker can serve as a divider, section marker, title card, or chapter image between groups of photos.

The first useful release combines an interactive editor with reliable individual and batch delivery. The supplied Python circular-divider generator is a reference for appearance and metadata, not a limit on the design or a required implementation language.

## What done means

| Objective | Observable acceptance evidence |
| --- | --- |
| **1. Create clear square JPEG markers.** Generate decodable square JPEGs with the chosen appearance and readable title text when supplied. Preserve the familiar circular-ring design as a starting preset and offer at least one visibly different shape. | Export the reference-style design and another shape with several color combinations. An independent image reader confirms JPEG format and equal width and height. Short and long titles fit without unintended clipping; unsupported text or an unfit title produces a clear correction request. |
| **2. Make design interactive.** Let the user choose a shape and change its applicable colors, including the background and text, without code or command-line steps. Show a preview that represents the eventual image. | Changes appear in the preview, and the exported image matches its layout, shapes, colors, and text within normal JPEG compression differences. Controls are labeled, keyboard accessible, and usable on the agreed touch-device test set. |
| **3. Preserve intentional photo timing.** Accept a date and time for every marker, make the timezone interpretation clear, and embed the intended capture time consistently in the JPEG. A successful export must contain the required metadata. | Independent metadata read-back verifies `DateTimeOriginal`, `DateTimeDigitized`, and `DateTime` for individual and batch exports. Invalid dates/times and failed metadata writing are visible errors; a file without required timestamps is never presented as a successful marker. Tests cover a date boundary and a browser timezone different from the intended photo time. |
| **4. Make one image easy to obtain.** A user can enter a title, choose appearance and time, inspect the preview, and save a JPEG in one workflow. | Complete this workflow in a supported browser without Python, a local command-line tool, an account, credentials, or a processing service. The saved file contains the intended image and metadata. |
| **5. Make batches complete and understandable.** A user can prepare, review, and generate multiple markers, each with its own title and timestamp, while reusing a style and adjusting individual entries. | A batch with at least ten entries, repeated titles, different dates/times, and an invalid entry demonstrates review, correction, progress, and delivery. Every successfully generated marker is identifiable and obtainable, filenames are distinct, and no item is silently dropped or overwritten. Invalid entries are identified before generation; runtime failures identify the affected entry and allow recovery without losing the user's batch. |
| **6. Process locally using WASM.** Use WASM for a substantive part of generating the actual exported images or their required metadata, with all image processing performed in the user's browser. | Inspection and a repeatable browser test show that the export path uses WASM and makes no processing requests or uploads of entered text, batch data, or images. After the application's required static assets have loaded, editing and generation work with the network disconnected. Loading static assets initially is allowed; offline installation and caching are separate choices. |
| **7. Ship as a portable static demo.** The finished application can graduate into `demos/` and work under the repo's static hosting arrangement. | Serve the final output from its intended subdirectory, load its WASM and other assets successfully, and complete single and batch exports. All runtime dependencies are in the published demo or graduated shared libraries. No runtime URL points into `initiatives/`, and no application backend, API key, or server-side image generator is required. |

## Verify the reason for making it

Correct metadata is necessary, but it is not by itself proof of correct placement in a photo collection. Before calling the first release complete:

1. Identify at least one primary photo-library application and record its version, import path, and chronological sorting mode.
2. Import two known-time photos and a generated marker whose intended capture time falls between them.
3. Verify that the marker displays between those photos in that workflow, with the expected date and time.
4. Repeat using an image from a batch and a case near a date boundary.
5. Record the exported files' independently read metadata and the observed library result. Document any import step or limitation that changes ordering.

This acceptance claim applies to the workflows actually checked. Manual album order, import-date order, filename order, and untested applications must not be described as verified capture-time sorting.

## Usable delivery and bounded work

The supported desktop and touch-browser set, image sizes, maximum tested batch size, and acceptable generation times will be named in the specification and test plan. The ten-entry acceptance example is a minimum workflow check, not an assumed maximum batch size.

During longer work, show progress and keep the interface responsive enough to communicate status and recover from failure. Oversized or otherwise unsupported requests must be explained before they exhaust the browser. Packaging must preserve each JPEG's bytes and metadata and allow the user to retrieve the complete set despite browser download restrictions.

A first release needs brief user instructions covering the single-image workflow, batch preparation, date/time meaning, downloads, and the verified photo-library import workflow. It also needs reproducible build/deployment instructions and evidence for the acceptance checks above.

## Boundaries of the first release

The initial goal is creating marker images. It does not require uploading or reorganizing an existing photo library, editing original photos, cloud accounts or synchronization, direct integrations with photo services, or a general-purpose drawing application.

The user is free to choose colors and shapes beyond the reference's bold-ring/pastel-center convention. Exact geometry controls, typography choices, and additional shapes should earn their place through the specification rather than inheriting every suggestion in the reference README.

## Questions to settle in the specification

- Which photo-library application and import workflow should be the primary compatibility target? Apple Photos, Google Photos, and Lightroom are examples in the supplied reference, not yet a user-selected support promise.
- Which desktop and touch browsers should be supported first?
- How should a user express a photo's local time and timezone, including ambiguous or nonexistent times around daylight-saving transitions?
- Which initial shapes, image sizes, title-layout controls, and color controls make the editor useful without making it a drawing tool?
- How should users enter or import batches, override a shared style, and collect the results? The reference's CSV example is a candidate, not a settled format.
- Which WASM approach meets the local-processing requirement with acceptable loading time, memory use, output quality, and metadata support?

These questions do not block drafting the objectives. The next lifecycle step is a specification with alternatives and explicit proposals for unresolved preferences. Ordinary product and implementation defaults can be chosen in that reviewable specification; questions that genuinely need the user's preference or authority should be asked and recorded through the initiative's decision workflow.
