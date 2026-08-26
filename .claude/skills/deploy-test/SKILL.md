---
name: deploy-test
description: Refresh an initiative's test deployment from the source directory recorded in its initiative.json, then report both the test and the production URL. Use whenever work in progress should be visible on the web during a session - "deploy the test site", "push this to test", "update the preview", "let me look at it" - including repeatedly within one session. Handles every deployment kind; never deploys to production, which is release-initiative.
---

# Refresh an initiative's test deployment

A test deployment is disposable. Overwrite it as often as the work needs,
without asking, whenever the user wants to look at what has been built. It
exists so nobody has to run a local server to see a change.

Do not deploy to production here. If the user asks for production, stop and tell
them to run `$release-initiative`.

## Resolve the plan

1. Determine the initiative slug from the request, or from the working directory
   when it sits under `initiatives/<slug>/`. If neither settles it, ask.
2. Run `node scripts/initiatives.mjs deployments <slug> plan --env test --json`.
   Add `--kind <kind>` when the initiative has more than one deployment and the
   plan asks you to name one.

The plan gives you `kind`, `engine`, the source directory, `mode` (`new` or
`replacement`), the target, the file count, and both environment URLs. **Deploy
with the engine the plan names** — each kind is deployed differently, and the
plan is what knows which.

If the command fails because the initiative has no deployments, it is not
deployed anywhere. See *Adding a deployment* below.

## Deploy what the plan describes

### `kind: chatgpt-site`, `build: static`

Hand the plan's `source` to `$deploy-to-chatgpt-sites`, which owns every
mechanical guarantee — the isolated workspace, the build, the smoke check, and
leaving the source repository untouched. Pass it `mode` from the plan, and:

- for `new`: `private` access and the plan's `site_slug`, which is
  `<slug>-test` so the URL says which environment it is;
- for `replacement`: the existing Site identified by the plan's `site_url`.
  Never resolve a replacement target by title, and never let it resolve to the
  production Site.

A `new` test Site is always private. Do not make a test Site public; a Site the
user wants the world to see is a release.

### `kind: chatgpt-site`, `build: sites-app`

The project builds itself and brings its own `.openai/hosting.json`, bindings
and migrations, so the static-folder skill cannot deploy it. Use the platform's
own Sites build and hosting workflow (`sites-hosting`) from the plan's `source`
directory, and follow any deployment notes in that project's own `README.md` —
bindings and storage are the project's business, not this skill's.

Validate from the source directory before deploying, with whatever the project
declares (`npm ci`, `npm test`, `npm run build`).

### `kind: demo`

**There is nothing to deploy.** A demo's test environment is its branch
preview, published by pushing the branch. Report the plan's `note` and its test
URL, and — if the branch has unpushed commits — push it. Do not run
`$deploy-demo`: copying into `demos/` is a production release.

## Record and report

Record only a deployment you actually made:

```bash
node scripts/initiatives.mjs deployments <slug> record --env test \
  --site-slug <site-slug> --url <live-url> --access private [--version <n>]
```

A demo has nothing to record, and `record` refuses it — that refusal is correct,
not an error to work around.

Then report, in this order:

- what was deployed: kind, source directory, file count, `new` or `replacement`;
- **Test:** the URL, plus access, version and deployment time where they exist;
- **Production:** the production URL, or "not released yet";
- when production exists and the plan's `source_commit` differs from the
  recorded production `commit`, one line saying test is ahead of production and
  that `$release-initiative` is what moves it.

Always report both URLs, even when only one environment exists. Whoever reads
the receipt should never have to go looking for the other one.

## Adding a deployment

An initiative with no `deployments` is not deployed anywhere, which is the
normal state for most of them. Offer to add one, and on agreement add to
`initiatives/<slug>/initiative.json`:

```json
"deployments": [
  { "kind": "chatgpt-site", "build": "static", "source": "initiatives/<slug>/work/site" }
]
```

Ask which kind rather than guessing:

- **`chatgpt-site`, `build: static`** — a folder with a root `index.html` and
  its assets, served as-is. Never point it at a directory that has to be built
  first; build into a static directory and record that.
- **`chatgpt-site`, `build: sites-app`** — a project with a `package.json` that
  builds itself through the Sites toolchain, with server-side code, a database
  or storage bindings.
- **`demo`** — a folder copied into `demos/` and published with the rest of the
  site. Needs a `destination` folder name and, when the entry page is not
  `index.html`, a `root_html`.

A kind can be changed later, and often is: an initiative may develop for months
with no deployment and pick one at the end. Changing kind means editing this
entry — nothing else about the initiative moves.

## Refuse

- Deploying to production, under any wording short of running
  `$release-initiative`.
- Running `$deploy-demo`, which writes production.
- Deploying with an engine other than the one the plan names.
- Recording a test Site whose slug or URL matches the production Site. `record`
  refuses this too, and its refusal is not to be worked around.
