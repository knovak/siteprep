---
id: deployments
title: Deploying to test and production
order: 80
slide: true
slide_title: Two environments, and only a person releases
audience: both
---
An initiative with something to publish declares it in its JSON record as a
deployment. Every deployment has two environments, and the difference between
them is who may write.

@figure deployment-environments

**Test** is disposable. Any agent may overwrite it, without asking, whenever
you want to look at the work: several times in a session, in whatever state
the work is in. It keeps no history. The `{{skills.deploy-test.name}}` skill
does this and reports both URLs.

**Production** is the copy other people see. Only a person asks for a release,
in their own words. A todo item, a schedule, or an agent's own judgment that
the work looks ready are reasons to tell you, never reasons to release. The
`{{skills.release-initiative.name}}` skill writes production, and only from
committed files: it refuses a source folder with uncommitted changes, records
the commit it shipped, and appends an entry to the initiative's releases
document.

The split is enforced, not requested. The test and production targets may
never be the same, the release plan exits non-zero when the source is dirty,
and the skill an agent reaches for to refresh a preview has no way to reach
production.

Two kinds of website are supported, and the kind decides how each environment
works:

- **A ChatGPT Site.** A full website hosted on the ChatGPT Sites platform, with
  backend services, storage, and a database available. Test and production are
  two separate Sites with separate data, and a Site is private unless you say
  otherwise.
- **A demo.** A folder of static pages under this repository's demos
  directory. Its test environment is the branch preview that GitHub Pages
  publishes for any pushed branch, and its production copy goes live when the
  branch merges to main.

Adding a third kind means adding one entry to the kinds table and one skill.
The validator, the plan, the record, and the overview page don't change.
[The rules are in the instruction file](source:AGENTS.md); [the schema, the
release gate, and the release history are in the technical
document](source:INITIATIVES_TECHDOC.md).

---
## Two environments, and only a person releases

Test is disposable and any agent may overwrite it whenever you want a look.
Production moves only when you ask, from committed files, with the commit
recorded. The two can never be the same target, and the preview skill can't
reach production.

@figure deployment-environments

---
## Two kinds of website

A ChatGPT Site is a full hosted website; test and production are separate
Sites, private by default. A demo is a static folder in this repository; its
test copy is the branch preview and its production copy goes live on merge to
main. A third kind is one table entry and one skill.
