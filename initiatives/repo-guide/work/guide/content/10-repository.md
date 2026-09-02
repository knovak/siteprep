---
id: repository
title: What this repository is
order: 10
slide: true
slide_title: SitePrep Repo Guide
audience: both
---
SitePrep is one person's GitHub repository, worked mostly by AI agents. It
publishes a static website through GitHub Pages, and it keeps a record of every
piece of software work in a form that an agent can pick up months later without
being told what was going on.

Three kinds of content live in the repository, each in its own top-level
folder with its own vocabulary.

@figure repo-map

**Decks** are static web content organized into collections, one folder per
deck with pages or sections under it. In this repository the decks hold travel
information: places, dates, attractions, events, and maps.

**Demos** are standalone web examples. Each one owns its pages and assets and is
copied to the site as it is.

**Initiatives** are where software gets made. An initiative starts as a wish in
your own words, grows a set of documents that say what it is and how it gets
built, and produces something: a deck, a demo, a website hosted elsewhere, or a
reusable script or skill. Most of this guide is about initiatives, because that
is where the process lives.

The rest of the repository is machinery: build scripts, shared web libraries,
GitHub Actions workflows, and a set of skills that agents run by name. If you
fork this repository, the machinery is what you're taking.

Here are the initiatives in this copy of the repository, with the lifecycle
stage each one is at. The stage names are explained in the sections that
follow.

@fact initiatives.live as initiatives

This table is a snapshot as of the date in the footer.
[The working conventions for agents are in the instruction file](source:AGENTS.md),
and [the design of the initiative system is in the vision document](source:INITIATIVES_VISION.md).

---
## SitePrep Repo Guide

One person's repository, worked mostly by AI agents. This deck explains how a
piece of work starts, moves through a fixed lifecycle, gets reviewed, gets
published, and rests until the next version. It's written for a developer
seeing the repository for the first time and deciding whether to use the same
process.

---
## Three kinds of content, three vocabularies

Decks are static web content in collections; here they hold travel information.
Demos are standalone web examples copied to the site unchanged. Initiatives are
where software gets made, and where the process lives.

@figure repo-map
