# The phase 0 probe site

A draft site that runs the probes in `../host-spike.md` §3 against ChatGPT Sites
and prints a table you can paste back into `decisions.md`.

**Locally exercised, not yet deployed.** The request router and browser verdict
logic have automated regression coverage, but a real Site is still required to
settle the host questions. Expect the server-side entry point and the D1 binding
syntax to need correcting if the Sites-generated scaffold differs; neither
changes what is being measured.

**Throwaway.** `plan.md` phase 0 says the spike's code is a probe, not the first
increment: it proves a row and is deleted. Nothing here should survive into
phase 1. If something does, it was not a spike.

## Using it

1. Create a Site, attach a **D1** database, and add a secret named
   `PROBE_SECRET` with any value in the Site's settings.
2. Deploy these files.
3. Open the site, sign in, and press **Run all**.
4. Press **Copy results** and paste the block into the pull request or into
   `decisions.md`.
5. For the isolation probe, open the site as a **second user** and press
   *Run isolation probe* there too. One user cannot prove isolation.

## Local regression check

Run `node --test initiatives/bookmark-sorter/probe/server.test.mjs`. The test
uses a small in-memory D1 stand-in and controlled `fetch`; it checks routing,
identity, input validation, row isolation, secret non-disclosure and the export
shape without pretending to answer any host-specific question.

## What each probe answers

The numbering matches `host-spike.md` §3, so a result can be read straight
against the row it settles.

| Probe | Row it settles | What a pass means |
|---|---|---|
| 3.1 | Streaming the whole pile out | 10,000 rows come back through our own endpoint, in one response, parseable |
| 3.2 | Signed-in identity | A stable per-user value reaches server-side code — and whether an opaque id exists beside the email |
| 3.3 | Per-user rows | User B gets nothing of user A's by any route tried |
| 3.4 | Outbound HTTP | Arbitrary URLs can be fetched server-side, with a timeout we control |
| 3.5 | Secret store | A secret is readable server-side and absent from what the browser receives |
| 3.6 | Cross-owner read | The platform does not prevent the app from serving one user another's rows when its own logic says to |
| 3.7 | Layout density | 8×2 at ~300 px is reachable on a widescreen viewport |
| 3.8 | Metering | The pile fits inside the plan's limits, with room |

Probe 3.7 runs entirely in the browser and needs no server. Probe 3.8 is partly
an observation — the code reports what it can measure, and the plan's stated
limits have to be read from the Site's settings by hand.

## The two that matter most

**3.4 comes first.** If arbitrary outbound `fetch` is not available server-side,
pass 1's metadata capture cannot run in-platform, and captures move behind the
same paid vendor as pass 2 — which changes what the project costs. Everything
else degrades; this one changes the design.

**3.1 is no longer able to fail the project**, which is a change from the first
draft of the spike. The app streams its own export (`decisions.md`, 2026-08-17),
so this probe now measures a ceiling rather than testing a permission. A failure
means export and import chunk, which is work, not a wall.

## What is deliberately not here

- **No pass-2 vendor call.** That needs a key and spends money; probe 3.5 proves
  only that a secret can be held and read server-side.
- **No capture pipeline.** Probe 3.4 fetches three fixed URLs to establish that
  outbound requests work at all. It is not a metadata parser.
- **No cleanup of the probe tables.** Delete the Site when finished; that is
  what makes it throwaway.
