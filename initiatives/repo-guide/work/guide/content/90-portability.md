---
id: portability
title: Taking this elsewhere
order: 90
slide: true
slide_title: Fork the process, leave the content
audience: forker
---
If what you want from this repository is the process rather than the content,
the process is a small set of files, and the sweep configuration already names
most of them.

@figure fork-boundary

The protected paths are the folders a sweep may never write to. They're
protected because everything in them is shared machinery, which makes the
list a good inventory of what a fork needs.

Four workflows run in GitHub Actions:

@fact workflows.* as cards

The skills are single-purpose procedures an agent runs by name. Each is one
markdown file with a short frontmatter description, and that description is
how an agent decides which skill a request matches.

@fact skills.* as cards

The decks, the demos, and the existing initiatives are this repository's own
content. Leave them behind unless they belong in your fork too. The initiative
folder can start empty; the first skill you run will create the first one.

You'll also need a scheduler that can check out the repository with full
history, run a Node script, and open pull requests. A Claude routine is what
this repository uses. The setup notes list what any runner has to provide.
[The vision document explains which mechanism is essential](source:INITIATIVES_VISION.md),
[the technical document explains how it's wired](source:INITIATIVES_TECHDOC.md),
and [the sweep setup notes say what a scheduler needs](source:initiatives/sweep-setup.md).

---
## Fork the process, leave the content

The process is the instruction file, one Node script and its tests, the sweep
prompt and configuration, the skills, and four workflows. The protected paths
in the sweep configuration are the inventory. Decks, demos, and existing
initiatives stay behind.

@figure fork-boundary

---
## What a fork carries

Four workflows build and publish the site, clean up branch previews, post the
digest, and enforce the sweep's write scope. The skills are one markdown file
each.

@fact workflows.* as cards
