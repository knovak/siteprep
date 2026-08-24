# End-user testing the bookmark sorter

## What this test Site is

This is a private, signed-in test of the real bookmark-sorter application. It
stores bookmark records, tags, verdicts, selections, and sitting measurements in
ChatGPT Sites D1. The first test version deliberately did not provision R2. The
user accepted the Sites storage limits and authorised the capture bucket on
2026-08-20 (`decisions.md`), so the next Site version provisions R2 as
`CAPTURES` and pass 1 fetches and stores page pictures. Until that version is
deployed, the running Site still has no captures.

Do not upload a bookmark export unless its URLs and folder names are acceptable
to store in the test Site. The application export contains items, URLs, tags,
verdicts, and notes; it never contains capture images.

## First sitting

1. Open the private Site while signed in with ChatGPT.
2. Export bookmarks from the browser you want to test, then choose that HTML file
   under **Import**. Give the source a short name such as
   `chrome-export` or `safari-export`.
3. Confirm that the total count looks plausible. Re-importing the same file
   should not increase it.
4. Work however you actually would. Use the on-screen buttons or `K`, `J`, `A`,
   and `N`; Space marks exceptions and `U` undoes the last whole action.
5. If your email is listed as an administrator, open **Admin** and end the
   sitting. The items judged, elapsed time, and items-per-minute rate are
   recorded automatically. **Show sitting** displays the latest sitting and its
   verdict/tag actions; **Export sitting data** downloads the same durable record
   as `bookmark-sorter/sitting-v1` JSON. An unfinished sitting resumes after a
   reload. Non-admin users do not see this menu.

## Selection sitting

1. Open a selection such as `folder:Reading/*`, `site:example.com`, or a
   combination such as `folder:Reading/* and not topic:rust`.
2. Choose a verdict and use **Sweep untriaged** to change only untriaged cards
   on the visible page and advance. Use the arrow on that control to switch to
   **Sweep all selected** when every item in the current open selection should
   receive the verdict.
3. **Sweep all selected** should show the affected count and ask for
   confirmation before applying the verdict.
4. Under **Select → Automatic proposals**, confirm that the Verdict group appears
   above Folder and includes **not junk** and **untriaged or needs-time**.
5. Optionally note how many confirmations interrupted the sitting. Sweeps you
   immediately undo are recorded automatically; confirmations are not. Neither
   is required — see `notes.md`.

## Backup before replacing the Site

Open **Export**, choose **Current collection**, and
download the `bookmark-sorter/v1` JSON backup. The same section can export the
open selection instead. Keep that file until the next Site version has been
opened and the backup has been imported through **Import**, or the
existing D1 data has been confirmed intact.

## Not covered by this first deployment

- Page metadata and image capture, until the R2-enabled Site version replaces
  this one. Authorised on 2026-08-20; not yet deployed.
- The paid screenshot fallback (pass 2), which remains switched off. Enabling R2
  turns on pass 1 only — the anonymous, no-JavaScript metadata fetch. The paid
  vendor is a separate authorisation and is unchanged.
- A public multi-tester audience. The first Site is owner-only; broader access
  should be enabled only after its audience and the Sites metering limits are
  accepted explicitly.
