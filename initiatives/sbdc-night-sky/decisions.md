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
