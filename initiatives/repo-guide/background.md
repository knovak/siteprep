# Background

Researched 2026-08-17, before objectives were drafted. Findings only.

## Already being provided

### GitHub contributor guidelines — [GitHub Docs](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors)

GitHub supports repository-level contribution guidelines in `CONTRIBUTING.md` and surfaces them when a contributor opens an issue or pull request. This provides a familiar home for contribution instructions, but it does not describe this repository's initiative lifecycle or provide the requested set of web, slide, and simulation materials.

### GitHub Actions documentation — [GitHub Docs](https://docs.github.com/en/actions)

GitHub documents Actions as a way to automate repository workflows, including continuous integration and deployment. That reference explains the automation platform, while the Repo Guide wish concerns how this particular repository's event-driven workflows participate in its broader work process.

### Backstage TechDocs — [Backstage documentation](https://backstage.io/docs/features/techdocs/techdocs-overview)

Backstage TechDocs uses a docs-like-code model in which Markdown documentation lives with code and is rendered into a searchable site. Its scope is a documentation platform and software catalog rather than an account of this repository's human-and-agent initiative process.

### Diátaxis — [Diátaxis](https://diataxis.fr/)

Diátaxis distinguishes tutorials, how-to guides, reference, and explanation as four kinds of technical documentation. It supplies a vocabulary for separating reader needs, but it does not prescribe this repository's lifecycle or generate the requested deliverables.

### Learn Git Branching — [interactive site](https://learngitbranching.js.org/) and [source repository](https://github.com/pcottle/learnGitBranching)

Learn Git Branching combines an interactive visualization, guided levels, and a sandbox for practicing Git operations. It demonstrates an existing browser-based process simulator, though its simulated subject is Git's commit graph rather than an initiative lifecycle.

## Lessons from similar attempts

### Contribution instructions appear at the point of contribution — [GitHub Docs](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors)

GitHub automatically links repository contribution guidelines during issue and pull-request creation. This shows how process material can be exposed in the workflow where a reader needs it, instead of depending only on discovery through a standalone guide.

### Docs-like-code keeps material beside the system it describes — [Backstage documentation](https://backstage.io/docs/features/techdocs/techdocs-overview)

TechDocs describes a workflow in which documentation is authored in Markdown alongside code and published through the same ecosystem. This is evidence for one established response to documentation drift: keep source material in the repository and subject it to repository workflows.

### Interactive instruction can separate guided progression from free exploration — [Learn Git Branching](https://learngitbranching.js.org/)

Learn Git Branching presents sequenced exercises as well as a sandbox. Its structure shows that a process visualization can support both a prescribed path and experimentation without requiring those modes to be the same experience.

### Different documentation forms answer different reader needs — [Diátaxis](https://diataxis.fr/)

Diátaxis treats learning-oriented tutorials, goal-oriented how-to guides, information-oriented reference, and understanding-oriented explanation as distinct forms. The requested web description, slides, and simulator may therefore overlap in subject while serving different reading situations.

## Questions this raises

- Which moments in the initiative lifecycle need guided simulation, and which need a free-play sandbox?
- Should the web description primarily explain the process, guide a contributor through tasks, or provide a reference to repository controls?
- Which repository source should be authoritative when the guide, slides, and simulator describe the same lifecycle rule?
- Where should contributors encounter the guide during issue, pull-request, review, and initiative workflows?
