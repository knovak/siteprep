---
id: start
title: Starting an initiative
order: 20
slide: true
slide_title: An initiative starts with a wish
audience: both
---
You start an initiative by describing what you want. The
`{{skills.new-initiative.name}}` skill turns that into a folder with two files:
your wish, in your own words, and a small JSON record holding the title, a
one-line summary, a value rating, the lifecycle stage, and a todo list with one
item on it: draft the objectives.

@figure initiative-birth

The skill asks three questions and no more. How valuable is this compared to
your other work? What's the one-line summary for the index page? And should it
look around before starting?

That last question is the optional **background** step. If you say yes, the
agent does a short web search for prior art and for lessons from similar
attempts, and writes what it found as a background document beside the wish.
The document carries links for every claim, lists the questions the research
raised, and makes no recommendations. Finding nothing is a legitimate result
and gets written down as one.

The initiative arrives as a pull request. While that pull request is open, the
wish can be tidied freely. Once it merges, the wish is fixed. If your intent
changes later, the new version goes at the top of the file with a date, and the
old text stays below it.

Two things the agents never do here: they never create an initiative on their
own, and they never edit a wish.
[The skill's own instructions are the authority](source:.claude/skills/new-initiative/SKILL.md).

---
## An initiative starts with a wish

The wish is written in your words and stays that way. A skill scaffolds the
folder, asks three questions, and optionally researches prior art into a
background document. The initiative arrives as a pull request; after the merge
the wish is fixed, and later changes are added above it with a date.

@figure initiative-birth
