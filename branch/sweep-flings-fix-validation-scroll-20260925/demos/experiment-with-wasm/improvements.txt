# Optional improvements

Recorded September 7, 2026. These are proposals for review, not approved work. Each keeps the experiment's local-first boundary and avoids changing the original hosted Bookmark Sorter or Tide Here applications.

## Suggested order

| Priority | Improvement | Why it may help | Cost or tradeoff | Acceptance evidence |
|---|---|---|---|---|
| 1 | Physical-iPad acceptance sheet | Closes the only remaining browser/device claim: opening each download from Files, editing, cold reopening, backup/restore, touch layout and Tide Here startup on real hardware. | Requires an iPad and human observations; automation cannot supply this evidence. | Record iPad model, iPadOS/Safari version, file-opening route, cold-start time, persistence and restore results. |
| 2 | One-page use and recovery guide | Gives a first-time user a short path for download, import, backup, moving between browser origins and recovery without reading the full technical findings. | Documentation can drift unless the browser matrix and screenshots have an owner. | A new user completes sample use and a fresh-copy restore without help. |
| 3 | Installable offline website | A service worker and manifest could make the static site reliably reopen from the Home Screen after its first load, while keeping calculation and data local. | Cache invalidation, large Tide Here updates and browser storage eviction need explicit UX; “Add to Home Screen” alone is not enough. | Install, enter airplane mode, cold-open both apps, edit, restart, restore and update on physical iPad plus desktop browsers. |
| 4 | Storage and backup health panel | Show approximate database/history size, last successful save, last backup date and a warning before the 100 MB cap or likely quota pressure. | A browser cannot prove future eviction or know whether a downloaded backup is still available. | Inject quota/save failures and confirm every warning is accurate, actionable and non-blocking. |
| 5 | Faster Tide Here startup edition | Offer an optional multi-file package or regional data packs for older mobile devices while retaining the current single-file global edition. | Splitting data weakens the “one file, every coast” simplicity and complicates provenance and offline packaging. | Compare cold-start time and peak memory on representative desktop and iPad hardware without changing forecast parity. |
| 6 | More efficient Bookmark Sorter persistence | Move from full-database snapshots after every action toward bounded or incremental persistence for picture-heavy collections. | Considerably more synchronization and recovery complexity; exact rollback and stale-tab protection must not regress. | Stress a large picture-backed collection across failures, two tabs, restart, backup and restore. |

## Recommendation

Do the physical-iPad sheet and concise recovery guide first. They are the least speculative and determine whether an installable offline website solves a real use problem. Pursue the Home Screen package next only if cold offline reopening matters more than preserving the current download-and-open workflow. Treat the two performance proposals as evidence-led experiments, not assumed upgrades.
