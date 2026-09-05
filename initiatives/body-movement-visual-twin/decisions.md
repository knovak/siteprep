# Decisions

Questions this initiative was waiting on, and how they were settled. Newest at
the bottom.

## 2026-08-19 — When does the public-release rights review apply?

**Only when a public successor release is being prepared. It does not apply to
private validation before then.**

The user's words: *"I confirm rights, licenses, attribution, and trademark will
not apply before a public successor release."*

### What this settles, and what it does not

- Private validation may continue without treating publication rights,
  licensing, attribution, or trademark review as a current gate.
- This does not establish the rights basis for a future public or commercial
  release. If a public successor is prepared, that release still needs the
  movement descriptions, recordings, names, anatomical assets, licences,
  attribution terms, and intended use reviewed before publication.

## 2026-08-20 — Which anatomy asset path can actually be hosted for private validation?

**Exclude SKEL and SMPL-Model from the hosted demo. Use the CC BY-SA
Open3DModel skeleton and upper-limb sources, public-domain Visible Human images
as reference only, and a project-authored surface and shared-rig fixture.**

The official SKEL and SMPL-Model licences are personal, single-user and
non-transferable, and prohibit making the data available to third parties
without prior written permission. An access-controlled page still makes its
packaged assets available to invited reviewers, so “private” does not cure that
restriction. No account agreement or model file is present in the repository.

SMPL-Body is different: Max Planck licenses that asset class under CC BY 4.0.
It remains an eligible later surface source when a concrete asset with that
provenance is supplied, but the licence page itself is not geometry and does
not turn a restricted SMPL-Model download into a distributable asset.

### Alternatives considered

| Option | Strengths | Weaknesses |
|---|---|---|
| **SKEL or SMPL-Model** | Best ready-made surface/skeleton correspondence and parameterisation | Current official terms prohibit third-party availability without written permission; unusable for invited hosting as-is |
| **A concrete SMPL-Body asset** | CC BY 4.0 expressly permits sharing with attribution; already includes mesh and rig | No concrete ledgered asset is present; excludes SMPL shape tools and is not the muscle source |
| **Open3DModel plus project-authored rig and surface** *(chosen)* | Official source permits hosting under CC BY-SA; July 2025 upper-limb model covers the chosen shoulder region; share-alike can be contained and audited | Requires selection, retopology and skinning; deep spine paths remain authored and unreviewed; procedural Phase 0 surface is not a production body |
| **Visible Human reconstruction from source imagery** | Public-domain, high-resolution anatomical reference for the chosen region | Segmentation and credible display geometry are substantial work; source imagery is subject-specific and is deliberately not redistributed here |

### What this settles, and what it does not

- The private demo has a permissible source path without relying on obscurity
  or a licence the project has not accepted.
- Share-alike geometry stays under `assets/anatomy/share-alike/` with its own
  manifest, attribution and modification history.
- The Phase 0 fixture proves shared hierarchy and attachment registration; it
  does not claim its landmarks or muscle paths are anatomically reviewed.
- A public successor still needs the separate rights and trademark review
  already recorded above.


## 2026-09-05 — KRN anatomy-display feedback and revision

**Revise the skeleton and muscle illustration in the existing private validation viewer.**

The user relayed feedback from reviewer **KRN** and authorized a revision:

- "model all the vertebra and ribs, not just a single line for the spine"
- "draw the muscles with more detail, in a style like an anatomy drawing (attached)"

The attachment shows a frontal anatomy illustration with distinct red muscle
bellies, visible fibre direction, shaded contours, and pale connective tissue.
It is a visual reference; its pixels are not incorporated into the viewer.
No instruction in the attachment supplies additional project requirements.

### What this settles, and what it does not

- KRN is the reviewer code name supplied by the user. Do not infer a real name,
  professional qualification, tradition, email address, or approval of a claim.
- The immediate revision is individual vertebral and rib geometry and more
  detailed, differentiated muscle illustration on the existing shared motion
  rig. This remains the Phase 6 corrective review loop.
- The implementation depicts C1-C7, T1-T12, L1-L5, five fused sacral segments,
  a typical four-segment fused coccyx, and 12 bilateral ribs. The sacral and
  coccygeal depiction does not imply separately mobile adult vertebrae.
- This feedback is evidence of a requested correction, not acceptance of the
  revised result. Geometry, landmark accuracy, muscle grouping, and all
  tradition-specific records remain unreviewed pending appropriate findings.
- The broader reviewer roles, remaining findings, invitation addresses, and
  report destination are still open. No access or public-release decision is
  implied by this feedback.
