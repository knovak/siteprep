---
id: deployments
title: Getting the work in front of someone
order: 75
slide: true
slide_title: Two environments, and only one is yours to release
audience: both
---
Everything so far is about how work gets decided and recorded. This is the part
where somebody outside the repository can see it: an initiative that makes
something you can open in a browser declares where it publishes.

@figure deployment-environments

Every deployment has two environments, split by who may write them. The first is
disposable. Any agent may overwrite it, without asking, whenever you say you
would like to look at what has been made — mid-session, several times an hour,
in whatever state the work happens to be. It keeps no history and marks nothing,
which is what makes it cheap enough to use.

The second is the copy other people see. Only a person moves it, by asking for a
release in their own words. A schedule saying one is due, an item on a list, or
an agent's own judgment that the work looks ready are reasons to *mention* a
release to you, never to perform one.

That distinction is enforced rather than requested. A release reads from
committed files and refuses a source folder with uncommitted changes, so the
recorded commit is something you can go back to. And the procedure an agent
reaches for to refresh a preview has no way to reach the released copy at all —
a stronger guarantee than an instruction, which can be argued with.

What a deployment publishes to is its kind:

@fact deployments.kinds as chips

The kind decides which environments exist, what the source folder has to
contain, and which engine does the copying, so another way of publishing means
describing one more kind rather than rewriting any of the above.
[The working rules are in the instructions](source:AGENTS.md); [the schema, the
release gate, and the release history are in the technical
document](source:INITIATIVES_TECHDOC.md).

---
## Two environments, and only one is yours to release

Anything an initiative publishes gets a disposable copy any agent may overwrite
whenever you want to look at the work, and a released copy that moves only when
a person asks for it. Keeping them apart is what makes previewing cheap and
releasing deliberate.

@figure deployment-environments

---
## A release is enforced, not requested

It reads from committed files and refuses a source folder with uncommitted
changes, so the recorded commit is something to go back to. The two environments
may never point at the same place, and the procedure that refreshes a preview
cannot reach the released copy at all. Both of them exist for whatever kind of
thing the deployment publishes to:

@fact deployments.kinds as chips
