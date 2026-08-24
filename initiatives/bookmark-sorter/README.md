# Interactive Bookmark Sorter

Interactive Bookmark Sorter is a private, signed-in workspace for turning a
large browser-bookmark export into a pile you can review quickly. It keeps the
saved URL, title, folders, notes, tags, and verdict for each bookmark. It can
also group bookmarks with selection expressions so one decision can apply to a
whole set.

The current validation Site is owner-only:
<https://bookmark-sorter-end-user-test.ken-novak.chatgpt.site/>.

## Before importing

Export bookmarks from your browser as a Netscape bookmark HTML file. The import
stores the URLs, folder names, bookmark titles, notes, tags, and later decisions
in the private Site database. Import only a file whose contents are acceptable
to store there.

Re-importing the same file is safe: matching URLs are merged instead of
duplicated. Keep the original browser export until you have checked the item
count and downloaded an application backup.

## First use

1. Open the Site while signed in with ChatGPT.
2. Open **Import**, choose the exported HTML file and
   give the source a short name such as `safari-export`.
3. Check that the total item count looks plausible.
4. Open bookmarks, assign verdicts, or mark several cards and judge them as one
   set.
5. Open **Admin** and end the sitting when you want its elapsed time and
   judged-item count saved.
6. Open **Export**, choose **Current collection** and
   download a JSON backup before replacing the Site or making a large round of
   changes. Choose **Current selection** when you want only the open selection.

The four verdicts are **Keep**, **Junk**, **Archive**, and **Needs time**.
Unjudged bookmarks remain **Untriaged**. Applying a verdict changes the current
bookmark or marked set without reloading the page; **Undo** restores the last
whole action.

In a wide window, use **Page layout** to switch immediately among 3 × 3,
2 × 6, 2 × 8 (the default), and 3 × 12 cards. Tablet and phone windows keep
their compact layouts so the cards remain readable.

## Keyboard controls

| Key | Action |
|---|---|
| Arrow keys | Move focus between visible cards |
| Space | Mark or unmark the focused card |
| `K` | Keep |
| `J` | Junk |
| `A` | Archive |
| `N` | Needs time |
| `U` | Undo the last whole action |
| Enter | Advance |

The on-page Help panel is the authoritative shortcut reference for the deployed
version.

## Selections and group actions

A selection describes a reusable group. Expressions support `and`, `or`,
`not`, parentheses, bare tags, and a trailing `*` wildcard. Examples:

- `folder:Reading/*`
- `site:example.com`
- `folder:Reading/* and not topic:rust`
- `verdict:untriaged and site:example.com`

Verdict clauses are `verdict:keep`, `verdict:junk`, `verdict:archive`,
`verdict:needs-time`, and `verdict:untriaged`. Ordinary tags are written bare;
there is no `tag:` prefix.

Opening a selection makes it the visible working set and records the query in
the signed-in user's **Previous selections** list, newest first. A saved selection that
has not been opened first reports its affected count and asks for confirmation
before a bulk verdict. **Sweep untriaged** changes only the still-untriaged
cards in the visible page, then advances. Group actions are recorded as one
undoable action.

## Collections, captures, and backups

Each signed-in user has a private personal collection and may create additional
private collections. Import, Select, and Export share one collapsed row so the
bookmark cards keep most of the window; opening one closes the others and gives
it the available width. **Import** also loads a private copy of a demo template;
later template changes do not silently alter that copy. Collection names can be
edited inline. **Export** can erase the active collection after confirmation
without deleting the collection itself or its shared captures.

**Admin** contains End sitting, Capture metadata, Capture gaps, and controls to
add, remove, and display rows in the advisory authorized-user table. That table
does not restrict the Admin menu in this version.

When the deployment has image storage enabled, importing starts a metadata-only
capture pass. The grid never waits for a capture and never loads the saved page
just because a card is visible. The paid screenshot fallback remains a separate
feature and is off by default.

The `bookmark-sorter/v1` JSON export contains bookmark records, URLs, tags,
verdicts, and notes. It does not contain capture images. Treat it as a private
backup because it contains the bookmark data itself. The Import section accepts
that JSON text file as well as browser bookmark HTML, so either a complete
collection or an exported selection can be round-tripped through the page.

## Deploying a private copy

This is a full-stack ChatGPT Sites application, not a static HTML folder. The
source to deploy is `initiatives/bookmark-sorter/work/`. Its Worker supplies the
page and `/api/*`; D1 stores collections and decisions; the optional R2 binding
stores fixed-size image derivatives.

Prerequisites:

- ChatGPT Sites access with signed-in identity enabled;
- a D1 binding named `DB`;
- an R2 binding named `CAPTURES` when metadata images are wanted; and
- owner-only or otherwise explicitly approved Site access.

From the repository root:

```sh
cd initiatives/bookmark-sorter/work
npm ci
npm test
npm run build
```

The hosting declaration is `.openai/hosting.json`. The final schema is in
`db/schema.ts`, with generated migration files under `drizzle/` and the
step-by-step source migrations under `migrations/`. The Worker entry point is
`worker/index.ts`.

Deploy through the existing Sites project so the Site URL, privacy setting, and
database are preserved. Do not publish this directory with a static-folder
host: that would omit the API, identity, D1, and capture behavior. Before
replacing an existing version, download a complete collection from the Export
section, confirm the new build and migrations, deploy, wait for the deployment
to succeed, then verify import, collection switching, verdicts, selections,
export, and paging on the live private Site.

For implementation details see [`work/README.md`](work/README.md). For the
current end-user test script and deployment cautions see
[`work/END_USER_TESTING.md`](work/END_USER_TESTING.md).
