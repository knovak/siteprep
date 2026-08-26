# Deploy test

Refresh an initiative's test deployment so you can look at the work on the web.
Overwriting it is cheap and expected — that's what it's for.

```text
Deploy the test site for tide-here.
```

```text
Update the preview so I can look at it on my phone.
```

The skill reads the initiative's `deployments` from `initiative.json`, asks
`initiatives.mjs` what a test deployment would do, and uses the engine that plan
names. It reports both URLs — test and production — every time, so you never
have to go looking for the other one.

## What it does per kind

| Kind | Test deployment |
| --- | --- |
| `chatgpt-site`, `build: static` | Deploys the folder through [`deploy-to-chatgpt-sites`](../deploy-to-chatgpt-sites/) to a private `<slug>-test` Site |
| `chatgpt-site`, `build: sites-app` | Builds and deploys the project through the Sites hosting workflow |
| `demo` | Nothing to deploy — a demo's test environment is its branch preview, which appears once the branch is pushed |

## What it will not do

It will not write production. That is
[`release-initiative`](../release-initiative/), and it only runs when you ask
for it by name. In particular it will not run `deploy-demo`, because copying
into `demos/` *is* the production release.

## Initiatives with no deployment

Most initiatives are not deployed, and that is the normal state. An initiative
can develop for months and pick a deployment kind at the end — or change kind
late. The skill offers to add one when there is nothing to deploy, and adding
or changing it means editing a single `deployments` entry.
