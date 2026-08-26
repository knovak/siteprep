# Interactive Bookmark Sorter

Interactive Bookmark Sorter is a signed-in workspace for turning a large
browser-bookmark export into a pile that can be reviewed quickly. It keeps the
saved URL, title, folder path, note, tags, and verdict for each bookmark. It can
also open reusable groups of bookmarks so one decision can be applied to a
page, a marked set, or a whole selection.

The production Site is public to anyone with its link, while bookmark
collections and actions remain scoped to the signed-in ChatGPT user:
<https://bookmark-sorter.ken-novak.chatgpt.site/>.

Pre-release testing continues on the separate public test Site:
<https://bookmark-sorter-end-user-test.ken-novak.chatgpt.site/>.

## What it can do

- Import Netscape bookmark HTML from Safari, Chrome, Firefox, or Edge.
- Import its own `bookmark-sorter/v1` JSON backup format.
- Merge a repeated or overlapping import by URL instead of creating duplicate
  bookmarks.
- Keep several private collections and switch, create, or rename them inline.
- Show a bounded page of bookmark cards even when the collection contains
  thousands of items.
- Assign **Keep**, **Junk**, **Archive**, or **Needs-time** to one bookmark or a
  marked set, then undo the last whole action.
- Sweep untriaged bookmarks on the visible page, or deliberately apply one
  verdict to an entire open selection after confirming its count.
- Open typed, automatic, saved, or recently used selections and apply tags to
  the resulting group.
- Download either a whole collection or the open selection as portable JSON.
- Let administrators manage sittings, metadata captures, demo templates, and
  the administrator/user list.

The three large **Import**, **Select**, and **Export** controls share one row.
None or one may be open at a time; opening one closes the others and gives the
open panel most of the available width.

## Important cautions

- **Treat every import and export as private data.** URLs, folder names, notes,
  tags, and verdicts may reveal interests or personal information. Import only
  a file whose contents are acceptable to store in the Site database, and
  protect downloaded JSON like the original browser export.
- **Keep the original browser export until the import is verified.** Check the
  collection count and download an application backup before relying on the
  Site as the only copy.
- **Export before replacing a deployment or making a large change.** The Site
  normally preserves its D1 data across versions, but a portable collection
  backup is the recovery copy controlled by the user.
- **Erase current collection cannot be undone.** It removes every bookmark
  from the active collection after confirmation. The empty collection remains,
  and shared capture images remain available, but the bookmarks and their
  collection-specific tags, notes, and verdicts are gone.
- **A JSON import merges; it is not a forced restore.** Matching uses the
  normalized URL. Imported tags are added, but an existing note or verdict is
  not overwritten by conflicting imported data.
- **Capture images are incomplete by design.** The metadata pass is anonymous,
  uses no JavaScript or signed-in browser state, and may leave blank cards. The
  paid screenshot fallback is off.
- **This is not live browser synchronization.** It does not read open tabs,
  modify browser bookmark folders, or push selected links back into a browser.

## Main concepts

**Collection**
: A named, private bookmark pile. Every item, verdict, tag, saved selection,
  backlog count, import, and export belongs to the current collection.

**Bookmark card**
: The working view of one saved link. A card can show a stored metadata image,
  site, title, note, tags, current verdict, a mark control, and a copy-URL
  control. Opening the title visits the saved URL in a new tab; simply viewing
  the card does not request the saved page.

**Verdict**
: **Keep**, **Junk**, **Archive**, or **Needs-time**. A bookmark with no verdict
  is **Untriaged**, and untriaged bookmarks make up the backlog.

**Selection**
: A reusable expression that describes a group in the current collection. A
  typed expression, an automatic proposal, a named saved selection, and a
  previous selection all enter the same evaluator.

**Sitting**
: A period of triage work. The app records elapsed time, changed verdicts, and
  the number of items judged. Administrator controls can end, inspect, and
  export the durable sitting record.

## First-use workflow

1. Export bookmarks from the browser as a Netscape bookmark HTML file.
2. Open the Site while signed in with ChatGPT.
3. Open **Import**.
4. Choose the HTML file with **Choose File**, or drag it onto **Drop a file
   here** beside the file chooser.
5. Give the HTML import a short source tag such as `safari-export` or
   `chrome-export`, then choose **Import file**.
6. Check that the total collection count looks plausible. Re-importing the same
   file should merge the matches and leave the total unchanged.
7. Open several bookmark titles and check that the cards correspond to the
   expected data.
8. Open **Export**, choose **Current collection**, and download a JSON backup.
9. Begin triage with the on-screen controls or keyboard shortcuts.
10. If you are an administrator, open **Admin** and end the sitting when you
    want its elapsed time and judged-item count saved.

Import accepts one file at a time, up to 20 MB. The source tag is applied to an
HTML import only. Dropping a file selects it for import; the import begins only
after **Import file** is chosen.

## Everyday triage

The four verdict controls change the focused card, or every marked card when at
least one card is marked. The page updates in place and then advances focus.
**Undo** reverses the most recent verdict or tag action as one operation,
including an action that changed a group.

A practical page-by-page workflow is:

1. Review the visible cards.
2. Mark the exceptions that should share a verdict and apply it once to the
   marked set.
3. Choose the usual verdict in **Sweep verdict**.
4. Use **Sweep untriaged** to apply it to the remaining untriaged cards on that
   page and advance.
5. Use **Previous** and **Next** when you want to inspect pages without writing
   a verdict.

The arrow attached to **Sweep untriaged** changes its scope to **Sweep all
selected**. That second mode applies the chosen verdict to every item in the
current open selection and therefore shows the affected count for confirmation
first. It is intentionally broader than the default page sweep.

### Page layouts

In a wide window, **Page layout** switches immediately among:

- 3 × 3 — 9 larger cards;
- 2 × 6 — 12 cards;
- 2 × 8 — 16 cards, the default; and
- 3 × 12 — 36 dense cards with extra title space.

Tablet windows choose 4 × 3 or 3 × 3 automatically. A narrow phone window shows
one large card at a time and supports horizontal swiping. The wide-layout menu
is hidden when an automatic tablet or phone layout is active.

### Keyboard controls

| Key | Action |
|---|---|
| Arrow keys | Move focus between visible cards |
| Space | Mark or unmark the focused card |
| `K` | Keep |
| `J` | Junk |
| `A` | Archive |
| `N` | Needs-time |
| `U` | Undo the last whole action |
| Enter | Advance focus |

Keyboard verdict shortcuts do not fire while typing in an input or select
control. The on-page **Help** panel is the authoritative shortcut reference for
the deployed version.

## Finding and grouping bookmarks

Open **Select** to use any of four routes:

1. Type an expression and choose **Open selection**.
2. Choose an **Automatic proposal**, then choose **Open proposal**.
3. Choose a named **Saved selection**, then choose **Open saved**.
4. Choose a recent query from **Previous selections**, then choose **Open
   previous**.

The three chooser actions provide a visual check before opening anything. With
no proposal or selection chosen, its **Open…** control is black on white. After
one is chosen, that control is white on blue.

Opening a selection makes it the visible working set and records its expression
in **Previous selections** for the signed-in user, newest first. History is
deduplicated and follows the user across collections. To make a reusable named
selection, open an expression, enter a selection name, and choose **Save**.

Enter comma- or space-separated tags in **Tags to apply** and choose **Tag
selection** to add them to the marked set, or to the current open selection when
nothing is marked. Imported and existing tags are preserved; tagging adds
rather than replaces.

### Selection expressions

Expressions support `and`, `or`, `not`, parentheses, and a trailing `*`
wildcard. Operators are evaluated with `not` before `and`, and `and` before
`or`. Ordinary user tags are written directly; there is no `tag:` prefix.

Examples:

- `folder:Reading/*`
- `site:example.com`
- `folder:Reading/* and not topic:rust`
- `(src:safari-export or src:chrome-export) and verdict:untriaged`
- `title:court-drama*`
- `image:none`

Useful generated or synthetic values include:

- `src:<source>` — the source name attached during HTML import;
- `in:<yyyy-mm-dd>` — the import date;
- `folder:<path>` — the browser folder path;
- `site:<host>` — the saved URL's host;
- `title:<normalized-title>` — a title key, with `*` useful for prefixes;
- `image:none`, `image:failed`, or `image:present`; and
- `verdict:keep`, `verdict:junk`, `verdict:archive`,
  `verdict:needs-time`, or `verdict:untriaged`.

Automatic proposals group the current collection by source, exact tag,
verdict, folder, site, image state, and near-identical title. They are computed
from current collection data, so imports and tag changes can change the offered
groups.

## Collections and demo templates

Every signed-in user receives a personal collection and may create more private
collections with **New**. **Rename** edits the current collection name inline.
Switching collections clears the open expression and loads that collection's
counts, cards, saved selections, and proposals.

**Import → Demo templates → Load a copy** creates a new private demo copy. It is
independent of the template: later template changes do not alter the copy. A
demo copy can be refreshed by taking another fresh copy, and can be deleted
without removing the shared capture cache.

Administrators can create an empty demo template under **Admin** and then
import the desired HTML or Sorter JSON into it. Templates are readable for
copying by signed-in users, but ordinary users cannot edit the template itself.

## Export, backup, and restore

Open **Export** and choose one scope:

- **Current collection** downloads every bookmark in the active collection.
- **Current selection** downloads only the bookmarks matched by the open
  selection. With no expression open, this scope is the whole collection.

Downloads are named `bookmark-sorter-<collection-name>.json` and use the
`bookmark-sorter/v1` format. They include URLs, titles, notes, saved dates,
tags, verdicts, and verdict times. They do not include capture images, user
identity, or sitting records.

To restore or copy data, switch to the destination collection, open **Import**,
choose or drop the JSON file, and choose **Import file**. A round trip through
the same collection should be a no-op. Importing into another collection copies
the portable bookmark data while leaving the source untouched.

See [`JSON_IMPORT.md`](JSON_IMPORT.md) for the complete field reference, URL
matching and merge rules, a tag-enrichment example, and the behavior of partial,
redundant, and fresh data.

## Administrator controls

The **Admin** menu appears only when the normalized signed-in email has type
`admin` in `authorized_user`. The same server-side role check protects its APIs;
hiding the menu is not the security boundary.

Administrators can:

- start or end the current collection's sitting;
- show the latest durable sitting and its verdict/tag action log;
- export that sitting as `bookmark-sorter/sitting-v1` JSON;
- add, update, display, or remove `authorized_user` rows;
- create a demo template;
- run the bounded metadata capture catch-up; and
- inspect the disabled capture-gap action while the screenshot fallback is off.

Adding a person with type `user` records them in the table but does not give
them the Admin menu. Adding type `admin` does. Collection ownership still uses
the opaque signed-in user id rather than email.

## Anticipated workflows

### Clean up one browser export

Import the HTML into a new collection, back it up, work page by page, and use
**Sweep untriaged** for the common verdict after marking exceptions. Export the
collection again at the end of the sitting.

### Review one folder or site

Open `folder:<path>*` or `site:<host>`, save it if it will be reused, then page
through just that group. Use a selection-scoped export when the group needs to
move elsewhere.

### Separate “decide later” work

Open `verdict:needs-time`, add topic tags where useful, and use saved selections
for the topics that deserve their own later sitting.

### Add tags outside the app

Export a selection, edit or enrich its tags in another trusted tool, and import
the JSON into the same collection. Tags union while existing notes and verdicts
remain protected. Validate the edited file against `JSON_IMPORT.md` before using
it as the only copy.

### Give a tester a safe starting pile

An administrator creates and fills a demo template. The tester loads a private
copy, triages it freely, and cannot change the source template or another user's
copy.

### Replace the Site safely

Export a complete collection, preserve the Site's privacy and existing Sites
project, deploy the new version, wait for it to succeed, then verify collection
switching, import, verdicts, selections, export, and paging before discarding
the backup.

## Troubleshooting

- **Import does nothing:** confirm a file name appears either in the file input
  or in the drop area, then choose **Import file**. Dropping selects the file;
  it does not submit automatically.
- **An import fails:** read the inline error. For JSON, validate the format and
  each URL against `JSON_IMPORT.md`; imported URLs must be usable HTTP or HTTPS
  URLs unless they match the documented legacy compatibility case.
- **The total grew after a repeated import:** the new file probably contains
  URLs whose meaningful query strings differ. URL matching removes known
  tracking parameters but deliberately preserves other query parameters.
- **An Open button stays white:** choose a non-placeholder value in the select
  beside it. White on blue means that proposal or selection is ready to open.
- **A selection is empty:** check spelling and case, open **Help**, and simplify
  the expression one clause at a time. A malformed expression reports an error;
  an unknown but valid tag returns an empty set.
- **Cards have no picture:** that is an expected capture gap, not evidence that
  the bookmark was lost. Use its title, note, tags, and saved URL.
- **Admin is absent:** the current signed-in email is not an administrator in
  `authorized_user`, or the Site did not receive a usable signed-in email.
- **Page layout is absent:** the window is using an automatic tablet or phone
  layout. Widen the window to use the explicit layout menu.

## Deploying or replacing a copy

This is a full-stack ChatGPT Sites application, not a static HTML folder. Its
source is `initiatives/bookmark-sorter/work/`; the Worker supplies the page and
`/api/*`, D1 stores collections and decisions, and R2 stores fixed-size capture
derivatives when enabled.

Deploy through the existing Sites project so the Site URL, access setting, D1
database, and R2 bucket are preserved. Do not use a static-folder publisher:
that would omit the API, identity, collections, and import/export behavior. Do
not broaden Site access without explicit approval. Test and production are
separate Sites with separate databases and capture buckets; a production
release starts empty and does not copy test data.

For implementation and validation details see
[`work/README.md`](work/README.md). For the current test procedure and
deployment cautions see [`work/END_USER_TESTING.md`](work/END_USER_TESTING.md).
