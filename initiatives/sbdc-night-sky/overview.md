# Existing simulator, adopted with its history

SBDC Night-Sky Simulator is a standalone exploration of how a large assumed
space-based data-center constellation might appear in the sky. The supplied
July 2026 package includes its tutorial, specification, implementation and
upgrade plans, phase reports, full source, tests, and assumptions.

The adoption preserves the working demo and all supplied material. Since
2026-11-11 there is also a beta simulator, published from its own copy of the
code in `beta/` on every merge. The released simulator and its source do not
change when the beta does. Each copy shows "Released" or "Beta" and the date it
last changed at the end of its credit line. The [README](README.html) describes
the arrangement, and the [test plan](test-plan.html) separates adoption checks
from real-device testing.

The initiative remains dormant at the user's request, with no release of the
beta planned. The mobile sky positioning follow-up is an optional later todo,
recorded in the [notes](notes.html).

## History

| Date | What happened | Where to read more |
| --- | --- | --- |
| July 2026 | The simulator was built outside this repository in three versions: v1 (closed July 9), v2 with the long-exposure camera and French, v3 (July 18) with clustering, the brightness slider and real-time playback. The package was finished as the "draft for review 2026-07-20" | [Released documents](https://drive.google.com/drive/folders/16PhbeOYaiJ0jW0xzjBQepQEtJHVmfPRc), [slide tutorial](https://docs.google.com/presentation/d/1s5RMg8Ek9pe_ytUlJmQ_ldRwIZpm_apK7Mjhm_pCsC8/edit) |
| 2026-09-08 | The package was adopted unchanged, with a manifest of every file's checksum, and published as the demo | [Log](log.html), [plan](plan.html) |
| 2026-09-11 | The user tested the preview with a satisfactory outcome; the initiative went dormant | [Notes](notes.html) |
| 2026-11-11 | The beta line was created, with settings export, import and presets | [knovak/siteprep#643](https://github.com/knovak/siteprep/pull/643) |
| 2026-11-15 | Five units of upgrade to the beta, after a comparison with the sdross0 simulator: faults corrected, settings and presets for that simulator's setups, a corrected twilight sky, ambient light, the Moon and moonlight, the ratio of SBDC light to the Moon's, the hours of significant light, a perspective view | [Decisions](decisions.html), [knovak/siteprep#652](https://github.com/knovak/siteprep/pull/652) to [#656](https://github.com/knovak/siteprep/pull/656) |
| 2026-11-16 | The beta page kept at a phone's width | [knovak/siteprep#661](https://github.com/knovak/siteprep/pull/661) |
| 2026-11-20 | An independent review of the published beta, and all four packages of its fixes | [Review](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/notes/beta-audit-2026-11-20.md), [implementation](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/notes/beta-audit-implementation-2026-11-20.md), [knovak/siteprep#671](https://github.com/knovak/siteprep/pull/671) |
| 2026-11-26 | The beta's control panel shows a few controls per group with the rest under Details; presets gained descriptions and a preset browser; the Moon is on by default | [knovak/siteprep#687](https://github.com/knovak/siteprep/pull/687) |
| 2026-11-26 | Documents for the beta: README, tutorial, specification, report and a slide tutorial, in the repository and in Drive | [Beta documents](https://drive.google.com/drive/folders/1x0nnagEYqlsBVhjR4IMs3tkTjnjSChgU) |

The [log](log.html) has every step, and [Decisions](decisions.html) the
reasons for each choice.

## Links

**Simulators**

- [Released simulator](../../demos/SBDC%20Night%20Sky/) — the July package, as adopted
- [Beta simulator](../../demos/SBDC%20Night%20Sky/beta/) — the beta line, updated on every merge
- [Test preview](../../preview/initiatives/sbdc-night-sky/index.html) — the released line's source, rebuilt on every build

**For the released simulator**

- [Documentation and code folder](https://drive.google.com/drive/folders/16PhbeOYaiJ0jW0xzjBQepQEtJHVmfPRc) in Drive
- [Slide tutorial](https://docs.google.com/presentation/d/1s5RMg8Ek9pe_ytUlJmQ_ldRwIZpm_apK7Mjhm_pCsC8/edit)
- [README and tutorial](README.html) in this initiative

**For the beta**

- [Beta documentation folder](https://drive.google.com/drive/folders/1x0nnagEYqlsBVhjR4IMs3tkTjnjSChgU) in Drive: the documents as Google Docs, the page, its data file and its source
- [Beta slide tutorial](https://docs.google.com/presentation/d/1aKs2W20J9ixJlvAotCNw85hKo_v_U1MPxK2g_xvOCt4/edit)
- The documents in the repository: [README](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/beta/docs/README.md), [tutorial](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/beta/docs/TUTORIAL.md), [specification](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/beta/docs/SPECIFICATION.md), [report](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/beta/docs/BETA_REPORT.md)
- [The beta's developer reference](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/beta/README.md) and its [upgrade plan](https://github.com/knovak/siteprep/blob/main/initiatives/sbdc-night-sky/beta/PLAN.md)
