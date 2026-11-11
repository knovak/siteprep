# Decisions

## 2026-09-08 — Adopt the existing SBDC simulator as an initiative

The user requests an initiative for the working SBDC Night-Sky Simulator in
`demos/`, with its attached code, markdown documents, and tutorial materials.
The request says: "It should not require code changes, just file migrations."
The reference to "migration map" is interpreted as referring to the named
SBDC simulator and the supplied SBDC wish and archive.

The supplied wish is retained verbatim. `sbdc-night-sky`, medium value, and the
index summary are implementation defaults for review, not answers attributed
to the user. The existing demo is recorded as a published output. Once the
adoption checks finish, the initiative rests at `dormant` pending user testing
and production authorization; no new development work is inferred.

### Alternatives considered

| Option | Consequence |
| --- | --- |
| Preserve a development package and an independent preview snapshot | Retains the working demo, makes its source and history discoverable, and permits testing before release; chosen for this adoption. |
| Move or replace the production demo now | Would publish before the testing requested by the user; excluded. |
| Rewrite the supplied documents into new lifecycle prose | Would risk altering historical content and requires permission; excluded. |

## 2026-09-08 — Preserve all supplied documentation

The user instructs: "all the attached documentation files should be adopted
with minimal modification. ask me for permission if you need to modify them."
They also permit changing the README provided its contents are preserved in
the appropriate documents.

All nine originals remain byte-identical under `lib/`. The supplied
specification and implementation plan are copied unchanged to `spec.md` and
`plan.md`. The initiative README adds navigation, then includes the original
README and tutorial verbatim. `notes.md` adds provenance and reading context,
then includes the phase reports, final report, and upgrade plan verbatim.
This uses the existing document renderer without changing application or
repository code. Historical inconsistencies remain visible and are explained
outside the originals. No document modification permission is needed or assumed.

Instructions and open questions inside the supplied documents belong to the
historical record. They do not authorize upgrades, new research, changed
defaults, source downloads, or rewritten documentation in this PR.

## 2026-09-08 — Test preview first; production only after testing

The user instructs: "proceed to do a test deployment as part of this PR.
we'll do a prod deployment only after testing".

The existing output uses the repository's demo hosting, so `deploy-test`
publishes the adopted `work/` snapshot through the branch preview. This is a
public GitHub Pages preview under the existing hosting arrangement. No new
hosting service is introduced. The existing production files are untouched.

The two existing demo files are preserved in `work/`; the supplied assumptions
sidecar is added there. A later release would publish that sidecar alongside
the unchanged simulator and earlier demo snapshot. Production's empty `prod`
record acknowledges the pre-initiative release without inventing deployment
dates or currency metadata.

### What remains open

- User findings from real devices, including pointer/pinch feel, PNG downloads,
  and performance on older phones.
- Explicit production-release authorization after testing.
- Any application or document corrections discovered during that testing,
  which need a separately agreed scope.

## 2026-09-08 — Remove the duplicate archive and keep the initiative dormant

The user asks to remove `notes/sbdc-sim-final-source.zip` if it is unnecessary,
"to limit the use of binary files and duplicate files", and to set the
initiative's status to dormant.

All 29 regular files in the source ZIP were compared with their adopted
`lib/` destinations and found byte-identical, with matching manifest hashes.
The ZIP contains no additional source or documentation, so its 161,551-byte
binary copy is removed. Its original size, checksum, and complete file inventory
remain recorded in `adoption-manifest.json`. The original documents and all
extracted source files remain unchanged.

The initiative was already `dormant` and remains so, now explicitly confirmed
by the user. User testing, any separately authorized fixes, and production
release remain open under their existing blockers.

## 2026-09-11 — Satisfactory user testing; optional mobile follow-up; remain dormant

The user reports that `user-test-preview` had a satisfactory outcome and
instructs that the item is complete. This settles the pending user-test
outcome; no device-by-device findings were supplied.

The user asks to convert `mobile-sky-follow-up` to an optional later todo and
record it in `notes.md`. The inherited mobile sky positioning observation
remains available for a later revisit. The item is retained as requested, but
stays blocked on explicit user permission to resume it, so it cannot be
selected by the sweep. No mobile correction is currently committed to.

The user instructs: "remain in dormant state, no additional releases".
The initiative remains `dormant`. Completing testing does not authorize a
release; `release-after-testing` remains permission-blocked, with no release
currently planned. Any later mobile work or release requires a new explicit
instruction from the user.

## 2026-11-11 — Add a beta version beside the released simulator

The user asks to "introduce another released version of SBDC as a beta
version", whose "code would exist side-by-side with the prod version, in the
main branch", deployed "with every merge". The stated purpose: "I could
guarantee that source and code would be stable in the current URLs, and the
beta version could progress and be substantially modified without destabilizing
the current version. Some day, months from now, I could copy the beta code into
the released version, and continue to make further modifications to the beta
version."

The user also asks that the beta be "easy to access, from both the demos page
and the SBDC initiative page", that it "be identical to the current version",
and adds: "It would be nice if the simulator itself had a subtle annotation of
whether it's beta or released, and when it was last changed."

**Decided:** the beta's code is `beta/`, a copy of the code in `lib/`. The site
build builds it and publishes it at `demos/SBDC Night Sky/beta/` on every
build. `lib/`, `work/` and `demos/SBDC Night Sky/` are unchanged. The build adds
the "Released" or "Beta" label and the last-changed date to each copy's credit
line at publish time.

### Alternatives considered

| Option | Consequence |
| --- | --- |
| Build the beta from `beta/` during the site build, and commit no built page | The published beta always matches its source, and a beta pull request shows only source changes. The site build runs the beta's tests and builder (about two seconds). Chosen. |
| Commit a built beta page, as `work/` does for the release | A third 245 KB copy of the page in the repository, and it can fall behind its source unless a check rebuilds it anyway. |
| Commit the beta under `demos/SBDC Night Sky/beta/` | `demos/` holds releases, and `deploy-demo` replaces the demo folder as a whole, so the next release would delete the beta. |
| Treat `work/` as the beta, since the build already publishes it as the test preview | The released source would no longer be at its current paths once the beta changed, which is the stability the user asks for. |
| Write "beta" and a date into the simulator's code | The label would have to be changed by hand at promotion, and a released page could ship reading "Beta". The date would be typed rather than derived. |

### What this settles, and what it does not

- The 2026-09-11 instruction "remain in dormant state, no additional releases"
  still governs the released copy. Publishing the beta does not release
  anything to `demos/SBDC Night Sky/`, and `release-after-testing` stays
  blocked.
- The released page as served now ends its credit line with "Released ·
  changed 2026-07-20". The file in `demos/SBDC Night Sky/` is byte-identical to
  before; the build adds the label when it publishes. This is the one visible
  change to the released URL, made because the user asked for the annotation
  on both copies.
- The beta is identical to the released simulator on 2026-11-11 apart from its
  label. No beta change is planned or authorized by this decision; the
  initiative stays `dormant` until the user asks for one.
- Promotion (copying the beta's code into `lib/` and `work/`, then releasing)
  needs a new explicit instruction. `beta/README.md` has the steps. It will be
  the first change to `lib/` since adoption, so the adoption manifest's hashes
  for those code files stop matching from then on.
- The nine supplied documents are not copied into `beta/`. Whether the beta
  gets its own tutorial or specification is open until the beta differs enough
  to need one.
