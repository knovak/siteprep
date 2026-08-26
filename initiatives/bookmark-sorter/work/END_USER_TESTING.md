# End-user testing the bookmark sorter

## What this test Site is

This is a public-entry test of the real bookmark-sorter application. Anyone can
reach the address, but the application requires ChatGPT sign-in and an
`authorized_user` match before it opens or creates bookmark data. It stores
bookmark records, tags, verdicts, selections, selection history, and sitting
measurements in ChatGPT Sites D1. R2 is provisioned as `CAPTURES`; pass 1 fetches
metadata anonymously and stores only fixed-size derivatives. The paid screenshot
fallback remains off.

Do not upload a bookmark export unless its URLs and folder names are acceptable
to store in the test Site. The application export contains items, URLs, tags,
verdicts, and notes; it never contains capture images.

## First sitting

1. Open the public Site. In a signed-out or private browser window, confirm the
   polite **Sign in with ChatGPT** page appears. Choose it and complete sign-in.
2. With a signed-in email that is not in `authorized_user`, confirm the polite
   **You’re not authorized yet** page shows that email and offers sign-out. No
   user or collection should be created.
3. Have an administrator add the email as `user` or `admin`, choose **Check
   again**, and confirm the bookmark workspace opens. An administrator row also
   exposes **Admin**; a `user` row does not.
4. Export bookmarks from the browser you want to test, open **Import**, then
   choose that HTML file or drop it onto **Drop a file here** beside the chooser.
   Give the source a short name such as `chrome-export` or `safari-export`, then
   choose **Import file**. Dropping selects the file and does not submit it.
5. Confirm that the total count looks plausible. Re-importing the same file
   should not increase it.
6. Work however you actually would. Use the on-screen buttons or `K`, `J`, `A`,
   and `N`; Space marks exceptions and `U` undoes the last whole action.
7. If your email is listed as an administrator, open **Admin** and end the
   sitting. The items judged, elapsed time, and items-per-minute rate are
   recorded automatically. **Show sitting** displays the latest sitting and its
   verdict/tag actions; **Export sitting data** downloads the same durable record
   as `bookmark-sorter/sitting-v1` JSON. An unfinished sitting resumes after a
   reload. Non-admin users do not see this menu.
8. Administrators can also enter a name under **Admin → Create template**. The
   new empty template becomes the current collection; import the desired HTML
   or Sorter JSON into it. Other users can then use **Import → Demo templates →
   Load a copy**.

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
5. With no proposal, saved selection, or previous selection chosen, confirm its
   Open action is black on white. Choose an option and confirm only the paired
   Open action changes to white on blue.
6. Optionally note how many confirmations interrupted the sitting. Sweeps you
   immediately undo are recorded automatically; confirmations are not. Neither
   is required — see `notes.md`.

## Backup before replacing the Site

Open **Export**, choose **Current collection**, and download the
`bookmark-sorter-<collection-name>.json` `bookmark-sorter/v1` backup. The same section can export the
open selection instead. Keep that file until the next Site version has been
opened and the backup has been imported through **Import**, or the
existing D1 data has been confirmed intact.

## Not covered by this test

- The paid screenshot fallback (pass 2), which remains switched off. Enabling R2
  turns on pass 1 only — the anonymous, no-JavaScript metadata fetch. A paid
  vendor remains a separate authorization.
- General collection sharing. Every admitted user receives owner-scoped private
  collections; public Site reachability is not a shared bookmark collection.
