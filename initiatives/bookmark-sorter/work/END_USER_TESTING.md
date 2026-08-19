# End-user testing the bookmark sorter

## What this test Site is

This is a private, signed-in test of the real bookmark-sorter application. It
stores bookmark records, tags, verdicts, selections, and sitting measurements in
ChatGPT Sites D1. The first test version deliberately does not provision R2, so
it does not fetch or store page pictures and cannot measure metadata-image
coverage yet.

Do not upload a bookmark export unless its URLs and folder names are acceptable
to store in the test Site. The application export contains items, URLs, tags,
verdicts, and notes; it never contains capture images.

## First sitting

1. Open the private Site while signed in with ChatGPT.
2. Export bookmarks from the browser you want to test, then choose that HTML file
   under **Import a browser bookmark file**. Give the source a short name such as
   `chrome-export` or `safari-export`.
3. Confirm that the total count looks plausible. Re-importing the same file
   should not increase it.
4. For a blind baseline, work without adding a selection. Use the on-screen
   buttons or `K`, `J`, `A`, and `N`; Space marks exceptions and `U` undoes the
   last whole action.
5. End the sitting. Record the items judged, elapsed time, and displayed
   items-per-minute rate before closing the page.

## Selection sitting

1. Open a selection such as `folder:Reading/*`, `site:example.com`, or a
   combination such as `folder:Reading/* and not topic:rust`.
2. Mark the exceptions, choose the verdict for the rest, and use **Sweep
   unmarked**.
3. Try one saved selection without opening it first. It should show the affected
   count and ask before applying a verdict. A selection that is already open
   should sweep without that extra confirmation.
4. Record how many confirmations interrupted the sitting and how many sweeps you
   immediately undid.

## Backup before replacing the Site

Use `/api/export` in the same signed-in Site to download a
`bookmark-sorter/v1` JSON backup of the current collection. Keep that file until
the next Site version has been opened and the backup has been imported or the
existing D1 data has been confirmed intact.

## Not covered by this first deployment

- Page metadata and image capture, because R2 is intentionally disabled.
- The paid screenshot fallback, which remains switched off.
- A public multi-tester audience. The first Site is owner-only; broader access
  should be enabled only after its audience and the Sites metering limits are
  accepted explicitly.
