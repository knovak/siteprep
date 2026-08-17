# Build techdoc

How the site is built, how the build is validated, and how a generated page is
provisioned for and captured in a browser. This is the reference for the npm
scripts in `package.json` and for the `build` job in
`.github/workflows/gh-pages.yml`.

`GITHUB_PAGES_DEPLOYMENT.md` covers what happens after the build - publishing
the output to `gh-pages` and recovering a failed Pages deployment.
`DEMOS_TECHDOC.md` and `INITIATIVES_TECHDOC.md` cover what the build generates
for those two content areas.

## Commands

| Command | What it does |
| :---- | :---- |
| `npm ci` | Installs the exact dependency tree in `package-lock.json`. |
| `npm run build` | Builds the site into `gh-pages/`, then validates it. |
| `npm run test:build` | Runs the build-time test suite against an existing `gh-pages/`. |
| `npm test` | Runs the Playwright suite against a server on the build output. |
| `npm run test:all` | `test:build` followed by `test`. |
| `npm run setup:browsers` | Installs Chromium for Playwright on a developer machine. |
| `npm run setup:browsers:ci` | Installs Chromium *and its system libraries*; needs root. |
| `npm run screenshot` | Captures a page to an image file. |

Use these rather than ad hoc downloads. `npx --yes some-package@version` fetches
a version nobody recorded and that CI will never install, so a result obtained
that way does not predict what the workflow does.

## Building

```sh
npm ci
npm run build
```

Run the build once, after the last source change - not after each edit.

`npm run build` is the canonical entry point; it runs `scripts/build.sh`, which
assembles `gh-pages/` and then, before reporting success:

1. runs `scripts/build_tests.sh`, the build-time test suite, which fails the
   build if the output is wrong;
2. runs `scripts/audit_shared_usage.sh`, an advisory report on shared-library
   adoption that never fails the build.

So **there is no need to run `scripts/build_tests.sh` or `npm run test:build`
separately after a build** - a build that succeeded has already passed them.
`npm run test:build` remains useful on its own for re-checking an existing
`gh-pages/` without rebuilding it.

CI relies on this: the workflow's `Build and validate deck outputs` step is just
`npm run build`, with no separate build-test step. That makes CI's build-test
coverage depend on one line inside `scripts/build.sh`, so `BUILD-20` in
`tests/build-pipeline.spec.js` asserts that the line is still there. It lives in
the Playwright suite because a guard inside `build_tests.sh` could not catch its
own suite no longer being called. If the invocation is ever removed on purpose,
restore an explicit build-test step in the workflow and update this document.

## Browser provisioning

Playwright's browsers are not part of `npm ci`; they are downloaded separately
and cached. Install Chromium once per machine or image:

```sh
npm run setup:browsers
```

Only do this when the environment has not already provisioned a browser - many
execution images ship Chromium preinstalled, and reinstalling costs minutes for
no benefit.

There are two scripts because there are two audiences:

- `setup:browsers` (`playwright install chromium`) downloads the browser into
  Playwright's own cache. It needs no special privileges and works on any
  supported platform.
- `setup:browsers:ci` (`playwright install --with-deps chromium`) additionally
  installs Chromium's shared-library dependencies through the platform package
  manager. That requires root and only supports certain Linux distributions, so
  it is meant for the GitHub Actions runner, not a laptop.

The workflow runs `setup:browsers:ci`, and only on a cache miss - the
`Install Playwright Browsers` step is skipped whenever the
`~/.cache/ms-playwright` cache restores. A green CI run is therefore *not*
evidence that this step works; changes to it need the cache key bumped, or a
local `--with-deps` run, to be exercised.

`npm ci` installs the `@playwright/test` version resolved in
`package-lock.json` (currently 1.57.0), not the newest release satisfying the
`^1.41.0` range in `package.json`. The `playwright` CLI these scripts invoke is
the project-local one from that install, so the browser, the test runner, and
the screenshot tool are always the same version. Plain `npm install` may move
within the range and update the lockfile; use `npm ci` when reproducibility
matters.

## Screenshots

Screenshots are for visual verification of a page that actually changed. Take
one **after** the final `npm run build`, so the image shows the built output
rather than a stale one.

```sh
npm run screenshot -- \
  --device="Desktop Chrome" \
  --full-page \
  "file://$PWD/gh-pages/demos/RMD%20calculator/prompts.html" \
  screenshots/rmd-prompts.png
```

Replace the input URL and output filename as appropriate. Notes on that command:

- Everything after `--` is passed through to the Playwright CLI by npm.
- The URL is built from `$PWD` rather than a fixed workspace path, so the
  command is portable across machines and checkouts.
- Spaces in the path must be percent-encoded (`RMD%20calculator`); a `file://`
  URL is a URL, not a shell path.
- `screenshots/` is git-ignored and is the place for these images. Writing to
  `/tmp` also works, but the file will not survive an environment recycle -
  which matters when the path is going to be quoted in a summary someone reads
  later.

The build output is static, so `file://` is enough for most pages. A page whose
behavior depends on an origin - service worker registration, `fetch` of a
sibling file - needs a server instead:

```sh
cd gh-pages && python3 -m http.server 8000
```

and then screenshot `http://localhost:8000/...`. That is the same server the
Playwright suite uses, configured in `playwright.config.js`.
