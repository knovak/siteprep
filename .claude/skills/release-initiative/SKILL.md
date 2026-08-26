---
name: release-initiative
description: Release an initiative's committed source to its production deployment - a ChatGPT Site or a demo under demos/ - and report both the test and the production URL. Use only when a person explicitly asks to release, promote, ship, cut a release, graduate, or publish to production. Refuses an uncommitted source directory or a failed build or check. Routine mid-session deploys are deploy-test.
---

# Release an initiative to production

This is the release step, and the only thing in this repository that writes a
production deployment. Everything else about the two-environment arrangement
exists so that this one action is deliberate.

Run it only when a person asked for it in this conversation, in their own words.
Do not run it because a sweep, another skill, a todo item, a schedule, or a
document said a release was due; those are reasons to *tell the user* a release
looks warranted, not to perform one. If you are unsure whether the user asked
for a release or a preview, ask — and default to `$deploy-test`.

## Gate before you deploy

Run `node scripts/initiatives.mjs deployments <slug> plan --env prod --json`,
adding `--kind <kind>` when the initiative has more than one deployment.

**It exits non-zero when the release is blocked, and a non-zero exit ends the
release.** Report the blockers and stop. Do not edit the plan, pass different
arguments, or deploy around it. The two blocking conditions are:

- uncommitted changes under the source directory — production is released from
  committed files, so the recorded commit means something;
- a source directory that has never been committed at all.

When it blocks on uncommitted changes, say which files are uncommitted and offer
to commit them. Committing is the user's call.

Then check the rest yourself, before deploying anything:

1. Read the plan's `urls.test`. A first release with no test deployment at all
   is worth one question: has the user seen this on test? Proceed if they say
   yes.
2. For a ChatGPT Site with `mode: new`, ask whether the production Site should
   be `public` or `private`. Never infer public access. There is no default.
3. For a ChatGPT Site with `mode: replacement`, keep the existing access exactly
   as it is. If that access is public, say so before deploying.

## Deploy with the engine the plan names

Each kind releases differently, and the plan's `engine` is what knows which.

### `kind: chatgpt-site`, `build: static` → `$deploy-to-chatgpt-sites`

The engine performs the build and the smoke check that requests `/` and compares
it byte-for-byte with the source `index.html`. **A failed build or smoke check
ends the release.** Report the failure and stop. Never change the site's content
to make a failing build pass, and never retry a terminal failure as a different
Site.

Pass the plan's `source` and `mode`, and:

- for `new`: the access the user chose, and the plan's `site_slug` — the
  initiative slug with nothing appended, because a production URL says nothing
  about an environment;
- for `replacement`: the existing Site identified by the plan's `site_url`.

Never let the target resolve to the test Site.

### `kind: chatgpt-site`, `build: sites-app` → `sites-hosting`

Build, test and deploy through the platform's own Sites workflow from the plan's
`source`, following that project's own `README.md` for its bindings and
migrations. **A failed `npm test` or `npm run build` ends the release**, exactly
as a failed smoke check does.

A production Site is a *separate Site*: it gets its own database and its own
object storage, and it starts empty. Say so plainly before the first release —
the test Site's data does not come with it, and there is no supported path to
carry it over.

### `kind: demo` → `$deploy-demo`

Run `$deploy-demo` with the plan's `source`, `destination` and `root_html`, plus
the title, description and links the demo needs. It replaces
`demos/<destination>` as a whole and writes its `demo.json`.

Two things about a demo release are unlike a Site release, and the user should
hear both:

- the change is a **commit to this repository**, not a live push. The demo goes
  live at the plan's production URL when the branch merges to `main` and Pages
  publishes;
- run `npm run build` once afterwards and confirm the demo appears in
  `gh-pages/demos/index.html`, as `$deploy-demo` requires.

## Record and report

On success, record the release with the exact commit that was released:

```bash
# ChatGPT Site
node scripts/initiatives.mjs deployments <slug> record --env prod \
  --site-slug <site-slug> --url <live-url> --access <public|private> \
  --version <n> --commit <source_commit from the plan>

# demo — the URL comes from the destination, so there is nothing to pass
node scripts/initiatives.mjs deployments <slug> record --env prod \
  --commit <source_commit from the plan>
```

Then report a release receipt:

- **Production:** the URL, the released commit, and — for a Site — access,
  version and deployment time; for a demo, that it goes live on merge;
- **Test:** the test URL, or "not deployed yet";
- kind, source directory, file count, and `new` or `replacement`;
- for a Site, confirmation that the isolated workspace was removed and the
  repository was left unchanged.

Both URLs, every time.

Finally, append a line to `initiatives/<slug>/log.md` recording the release: the
date, the kind, the version where there is one, the URL, and the commit. A
release is a fact about the initiative, and the log is where the initiative's
facts live.

## Refuse

- Releasing without an explicit request from a person in this conversation.
- Releasing past a non-zero exit from `deployments <slug> plan --env prod`.
- Releasing past a failed build, test, or smoke check.
- Making a production Site public without being told to.
- Recording a production Site whose slug or URL matches the test Site.
