# Deploy test site

Refresh an initiative's test ChatGPT Site so you can look at the work on the
web. Overwriting it is cheap and expected — that's what it's for.

```text
Deploy the test site for tide-here.
```

```text
Update the preview so I can look at it on my phone.
```

The skill reads the initiative's `sites.source` from `initiative.json`, hands
that directory to [`deploy-to-chatgpt-sites`](../deploy-to-chatgpt-sites/), and
records the result back into `initiative.json`. It reports both URLs — test and
production — every time, so you never have to go looking for the other one.

## What it will not do

It will not deploy to production. That is [`release-site`](../release-site/),
and it only runs when you ask for it by name.

## First time for an initiative

An initiative without a `sites` block has no ChatGPT Site. The skill offers to
add one:

```json
"sites": {
  "source": "initiatives/tide-here/work/site"
}
```

`source` must be a directory that already has a root `index.html`. If the
initiative builds its site, build into a static directory and point `source`
there — nothing in the deployment path runs your build.

The test Site is created private, with the slug `<initiative>-test`, so its URL
says which environment you are looking at.
