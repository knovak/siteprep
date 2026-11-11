# SBDC Night-Sky Simulator - beta

This folder is the beta line of the simulator. It has its own copy of the code,
it is published on every merge to `main`, and changing it cannot change the
released simulator.

| | Released | Beta |
| --- | --- | --- |
| Code | `../lib/` and `../work/` | this folder |
| Published at | `demos/SBDC Night Sky/` | `demos/SBDC Night Sky/beta/` |
| Changes when | someone asks for a release | a change to this folder merges |
| Label on the page | Released · changed *date* | Beta · changed *date* |

Live URLs:

- Released: <https://knovak.github.io/siteprep/demos/SBDC%20Night%20Sky/>
- Beta: <https://knovak.github.io/siteprep/demos/SBDC%20Night%20Sky/beta/>

A pull request's branch preview carries its own copy of both, under
`branch/<branch-name>/`, so a beta change can be looked at before it merges.

## What is here

`src/`, `data/`, `test/`, `tools/`, `build.js` and `package.json` started on
2026-11-11 as copies of the same files in `../lib/`. Two things differ from
`../lib/`:

- `build.js` accepts a directory: `node build.js <directory>` writes
  `<directory>/index.html`. Without an argument it writes
  `dist/sbdc-sky-simulator.html` as before. `dist/` is ignored by git here.
- `publish.mjs` is new. It is the step the site build runs.

The nine original documents (`README.md`, `TUTORIAL.md`, `SPECIFICATION.md`,
the plans and reports) are not copied. They stay in `../lib/` as the record of
the released simulator. Describe beta behavior that differs from them in this
file.

On the day it was created, the beta built a page byte-identical to the released
`demos/SBDC Night Sky/index.html`.

## Changing the beta

Edit files in this folder only. Then, from this folder:

```sh
node --test test/model.test.js test/scenarios.test.js test/golden.test.js test/render.test.js
node build.js          # writes dist/sbdc-sky-simulator.html to open locally
```

Commit the source change and push. There is no built page to commit: the site
build runs `publish.mjs`, which runs every `test/*.test.js` suite and then
builds the page into the published `beta/` folder. If a test fails, the site
build fails and the pull request's check goes red, so a beta that does not pass
its own tests is not published.

`test/smoke-browser.mjs` and the scripts in `tools/` are not run by the site
build. `tools/make-golden.mjs` rewrites `test/golden/golden.json`; run it only
when a model change is meant to move the golden values, and say so in the pull
request.

Do not edit `../lib/`, `../work/`, or `demos/SBDC Night Sky/` as part of beta
work. Those are the released line.

## The label

The site build adds "Beta · changed *date*" to the end of the credit line in
the sky view (the `#attribution` element), and "Released · changed *date*" to
the released page. The label is not in this code. The build derives it from the
path it publishes to, and the date from git: the last commit that changed this
folder, or `demos/SBDC Night Sky/` for the released page.

Because the label is added at publish time, the same code reads "Beta" at the
beta URL and "Released" at the released URL. Do not add channel wording to
`src/`. If a beta change removes or renames `#attribution`, the label falls
back to a small fixed line in the bottom-right corner; update `beta.stamp` in
`../initiative.json` to name the new element.

Saved PNG files are not affected. The exported image draws its own credit line.

## Promoting the beta to the released version

Promotion is a production release. Do it only when the user asks for it in
their own words.

1. Copy the beta's code over the released line's code, and rebuild the released
   snapshot from it:

   ```sh
   cd initiatives/sbdc-night-sky
   for part in src data test tools; do rm -rf "lib/$part" && cp -r "beta/$part" "lib/$part"; done
   cp beta/build.js beta/package.json lib/
   node lib/build.js work                     # writes work/index.html
   cp lib/data/sbdc-data.json work/sbdc-data.json
   ```

2. Commit, and check the test preview
   (`preview/initiatives/sbdc-night-sky/index.html` in the branch preview).
3. Run the `release-initiative` skill, which copies `work/` to
   `demos/SBDC Night Sky/` and records the release.

The beta folder stays as it is and continues from there. After a promotion the
two lines are identical again until the next beta change.

Promotion is the first change to `../lib/` since the adoption, so the SHA-256
values in `../adoption-manifest.json` stop matching the code files from then
on. The manifest still describes the package adopted on 2026-09-08, and git
history keeps those files. Record the promotion in `../decisions.md`.
