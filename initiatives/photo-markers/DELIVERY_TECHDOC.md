# Desktop delivery validation

`work/pipeline/test/delivery-browser.mjs` serves the built app under
`/nested/photo-markers/` with no-store responses. It launches the installed
Google Chrome binary with an isolated headless profile and the repository's
Playwright WebKit. Branded native Safari checks are a separate manual receipt;
WebKit automation must never be relabeled Safari or physical iOS.

## Reproduce

Install locked root dependencies with `npm ci`, then in `work/pipeline`:

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run test:delivery
python3 test/verify-delivery.py
```

Chrome and the locked WebKit browser must be present; the harness does not
install another browser or alter a user profile. The final verifier needs
native Pillow. Exact source hashes and the actual local oracle interpreter
are in `evidence/delivery/tested-source.json`.

Each engine records three context-cold ready-to-draft starts, five warm
2000-pixel single exports and draft changes, three ten-row packages, a 4096
export and a default-size 100-record run. Input-response sampling and keyboard
Cancel run separately. Deliberate download/acknowledgement time is excluded
from the approximate active 100-row time and reported separately. Browser
metadata/image read-back is included in generation; native Pillow is a later
external oracle. These are observations on a shared desktop, not process-
isolated or physical-device performance guarantees. OS/WASM caches are not
reset between fresh browser contexts.

HTTP requests are inspected for local static assets and absent posted data.
After preparation, Chrome uses context-offline emulation plus denied HTTP;
WebKit uses denied HTTP. WebKit context-offline emulation independently fails
file-input reads in this environment, including in-memory payloads supplied
through the input. Its failed receipt and focused probe remain visible.
Native Safari separately loads a local font and produces one-marker and batch
files with the local origin server stopped. OS networking is not disabled by
that check, so it is not physical-disconnection acceptance.

Tab/Option-Tab focus lists are recorded. Option-Tab is the Safari alternative
for clickable items described by [Apple's keyboard guide](https://support.apple.com/en-ie/guide/safari/cpsh003/mac).
The test changes no global keyboard setting. Focus reaching a control,
automated axe results and native visual zoom samples are supplementary to a
complete native keyboard and real screen-reader journey.

## Evidence ownership

`browser.json` retains timings, requests, target outcomes and failures.
Downloaded ZIPs contain original JPEG bytes and manifests; the native verifier
reads members directly through Python's independent ZIP reader and Pillow.
Hashes are checked against both file-byte evidence and fixed expected EXIF
values. Redundant extracted JPEG copies are not retained. Individual downloads
remain separate files. `safari-native.json` records native-window observations
and real Downloads files; no entered personal photos or account data are used.

The [dated acceptance receipt](notes/desktop-delivery-20261022.html) maps
T1–T12 to passed, partial and unrun evidence. It preserves physical iOS/Files,
400-percent/native text zoom, real screen-reader, total process memory and
remaining acceptance gaps. It does not complete the parent delivery milestone,
create a deployment, graduate an output or authorize production release.
