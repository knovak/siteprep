---
name: release-site
description: Release an initiative's committed source to its production ChatGPT Site, creating that Site on the first release, and report both the test and the production URL. Use only when a person explicitly asks to release, promote, ship, cut a release, or publish to production. Refuses an uncommitted source directory or a failed build or smoke check. Routine mid-session deploys are deploy-test-site.
---

# Release an initiative to production

This is the release step, and the only thing in this repository that writes a
production Site. Everything else about the two-Site arrangement exists so that
this one action is deliberate.

Run it only when a person asked for it in this conversation, in their own words.
Do not run it because a sweep, another skill, a todo item, a schedule, or a
document said a release was due; those are reasons to *tell the user* a release
looks warranted, not to perform one. If you are unsure whether the user asked
for a release or a preview, ask - and default to `$deploy-test-site`.

## Gate before you deploy

Run `node scripts/initiatives.mjs sites <slug> plan --env prod --json`.

**It exits non-zero when the release is blocked, and a non-zero exit ends the
release.** Report the blockers and stop. Do not edit the plan, pass different
arguments, or deploy around it. The two blocking conditions are:

- uncommitted changes under the source directory - production is released from
  committed files, so the recorded commit means something;
- a source directory that has never been committed at all.

When it blocks on uncommitted changes, say which files are uncommitted and offer
to commit them. Committing is the user's call.

Then check the rest yourself, before touching Sites:

1. Read the plan's `urls.test`. A first release with no test Site at all is
   worth one question: has the user seen this on the test Site? Proceed if they
   say yes.
2. If the plan's `mode` is `new`, ask whether the production Site should be
   `public` or `private`. Never infer public access. There is no default here.
3. If `mode` is `replacement`, keep the existing access exactly as it is. If
   that access is public, say so before deploying.

## Deploy

Release with `$deploy-to-chatgpt-sites`, which performs the build and the smoke
check that requests `/` and compares it byte-for-byte with the source
`index.html`. **A failed build or smoke check ends the release.** Report the
failure and stop. Never change the site's content to make a failing build pass,
and never retry a terminal failure as a different Site.

Pass it:

- the `source` from the plan;
- `mode` from the plan;
- for `new`: the access the user chose, and the plan's `site_slug`, which is the
  initiative slug with nothing appended - the production URL says nothing about
  an environment;
- for `replacement`: the existing production Site identified by the plan's
  `site_url`.

Never let the target resolve to the test Site.

## Record and report

On success, record the release with the exact commit that was released:

```bash
node scripts/initiatives.mjs sites <slug> record --env prod \
  --site-slug <site-slug> --url <live-url> --access <public|private> \
  --version <n> --commit <source_commit from the plan>
```

Then report a release receipt:

- **Production:** live URL, access, version number, deployment time, and the
  released commit;
- **Test:** the test URL, or "not deployed yet";
- source directory, file count, and `new` or `replacement`;
- confirmation that the isolated workspace was removed and the repository was
  left unchanged.

Both URLs, every time.

Finally, append a line to `initiatives/<slug>/log.md` recording the release:
the date, the version, the URL, and the commit. A release is a fact about the
initiative, and the log is where the initiative's facts live.

## Refuse

- Releasing without an explicit request from a person in this conversation.
- Releasing past a non-zero exit from `sites <slug> plan --env prod`.
- Releasing past a failed build or smoke check.
- Making a production Site public without being told to.
- Recording a production Site whose slug or URL matches the test Site.
