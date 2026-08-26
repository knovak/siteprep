---
name: deploy-test-site
description: Publish or refresh an initiative's test ChatGPT Site from the source directory recorded in its initiative.json, then report both the test and the production URL. Use whenever work in progress should be visible on the web during a session - "deploy the test site", "push this to test", "update the preview", "let me look at it" - including repeatedly within one session. Never deploys to production; that is release-site.
---

# Deploy an initiative's test Site

The test Site is disposable. Overwrite it as often as the work needs, without
asking, whenever the user wants to look at what has been built. It exists so
nobody has to run a local server to see a change.

Do not deploy to production here. If the user asks for production, stop and tell
them to run `$release-site`.

## Resolve the initiative and its plan

1. Determine the initiative slug from the request, or from the working directory
   when it sits under `initiatives/<slug>/`. If neither settles it, ask.
2. Run `node scripts/initiatives.mjs sites <slug> plan --env test --json`.

The plan gives you the source directory, `mode` (`new` or `replacement`), the
target Site slug, the current URLs of both environments, and the file count.

If the command fails because the initiative has no `sites` block, this
initiative has no ChatGPT Site yet. Offer to add one and, on agreement, add to
`initiatives/<slug>/initiative.json`:

```json
"sites": {
  "source": "initiatives/<slug>/work/<the directory with index.html>"
}
```

Set `source` to a directory that already contains a root `index.html` and its
assets. Never point it at a directory that has to be built first; build into a
static directory and record that. Then re-run the plan.

## Deploy

Deploy the planned source with `$deploy-to-chatgpt-sites`, which owns every
mechanical guarantee - the isolated workspace, the build, the smoke check, and
leaving the source repository untouched. Pass it:

- the `source` from the plan;
- `mode` from the plan;
- for `new`: `private` access and the plan's `site_slug`, which is
  `<slug>-test` so the URL says which environment it is;
- for `replacement`: the existing test Site identified by the plan's
  `site_url`. Never resolve a replacement target by title, and never let it
  resolve to the production Site.

A `new` test Site is always private. Do not make a test Site public; a Site the
user wants the world to see is a release.

## Record and report

On success, record the deployment:

```bash
node scripts/initiatives.mjs sites <slug> record --env test \
  --site-slug <site-slug> --url <live-url> --access private [--version <n>]
```

Then report, in this order:

- what was deployed: source directory, file count, `new` or `replacement`;
- **Test:** the live URL, access, version, and deployment time;
- **Production:** the recorded production URL, or "not released yet";
- when production exists and the plan's `source_commit` differs from the
  recorded production `commit`, one line saying test is ahead of production and
  that `$release-site` is what moves it.

Always report both URLs, even when only one of them exists. Whoever reads the
receipt should never have to go looking for the other environment.

## Refuse

- Deploying to production, under any wording short of running `$release-site`.
- Deploying a source directory with no root `index.html`.
- Recording a test Site whose slug or URL matches the production Site. The
  `record` subcommand refuses this too, and its refusal is not to be worked
  around.
