---
id: demos
title: Demos
order: 75
slide: true
slide_title: A demo is copied to the site unchanged
audience: both
---
A demo is a standalone web example in its own folder under the demos
directory. It owns its pages and assets, and it may carry the prompt history
that produced it. The build copies the folder to the site without rewriting
anything and adds one entry to the demos index, taken from a small JSON
manifest: a title, a description, the root HTML file, and optional links.

Most demos here are the graduated output of an initiative. The
`{{skills.deploy-demo.name}}` skill copies a complete folder from elsewhere in
the repository into the demos directory, replacing an existing demo in one
step, and writes the manifest. A demo can name the initiative that produced it,
which is how the index orders entries by recent activity.

This guide is itself a demo. Its three files are generated inside the
repo-guide initiative and released to the demos folder by hand when something
significant has changed.

Demo language stays separate from deck language, because the two have
different publishing structures and an agent asked to edit one shouldn't apply
the other's rules.
[The publishing contract is in the demos document](source:DEMOS_TECHDOC.md), and
[the copy-and-register procedure is in the deploy skill](source:.claude/skills/deploy-demo/SKILL.md).

---
## A demo is copied to the site unchanged

A self-contained folder with its own pages, assets, and optional prompt
history. The build copies it as it is and adds an index entry from a small
manifest. A deploy skill copies a finished folder into place in one step. This
guide is a demo.
