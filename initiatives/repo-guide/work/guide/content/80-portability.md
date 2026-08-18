---
id: portability
title: Taking this elsewhere
order: 80
slide: true
slide_title: Fork the process, not the travel content
audience: forker
---
Carry the process, not this repository's travel content. The process-bearing
set is the working instruction file, lifecycle scripts and tests, the sweep
prompt and configuration, the focused skills, and the workflows that schedule,
validate, and publish. Current protected paths are
{{sweep.protected_paths}}; they mark shared machinery a sweep cannot casually
rewrite.

The live workflow shapes are {{workflows.gh-pages}},
{{workflows.initiatives-digest}}, and {{workflows.sweep-scope}}. Focused helpers
include {{skills.new-initiative.description}},
{{skills.respond-to-review.description}}, and {{skills.merge-prs.description}}.
Those descriptions are resolved from the helpers themselves, so a fork sees
what it actually copied.

Decks, demos, and the present initiative directories are local content and
history. Copy them only when their subject matter belongs in the new repository.
[The vision document explains which mechanism is essential and why](source:INITIATIVES_VISION.md);
[the technical document explains how it is wired](source:INITIATIVES_TECHDOC.md).

---
## Fork the process, not the travel content

Carry the working instructions, lifecycle scripts and tests, sweep prompt and
configuration, focused skills, and workflows. Current protected paths are
{{sweep.protected_paths}}. Decks, demos, and existing initiative histories are
local content; copy them only when their subject matter belongs in the new
repository.
