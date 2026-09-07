# Objectives

Adopted 2026-09-07 from the user's wish and the supplied July 2026 specification, implementation plan, and README. This is an existing working atlas entering the initiative lifecycle; these objectives do not restart its implementation.

## Product objectives

- Explain historical migrations and diasporas from 1000 AD onward, including forced enslavement, oppression, displacement, imperial collapse, and voluntary migration, with sources, counts, reasons, destinations, and uncertainty.
- Show population-scaled flows and persistent settlement/diaspora circles, with meaningful type and source-region colors and an optional legend.
- Support automatic playback, exact movement backward and forward through time, year selection, speed controls, unrestricted pan, and zoom.
- Make detail panels, filters, search, focus, the accessible data table, keyboard controls, and the data caveats usable on desktop and touch layouts.
- Preserve the Ocean Blueprint presentation and the E1–E7 refinements recorded in the supplied documents and prompt history.
- Keep a self-contained offline HTML artifact and a data-driven path for adding researched movements, with the original validation and editorial requirements preserved.

The exact requirements, alternatives, acceptance criteria, and phased work remain in [spec.md](spec.html) and [plan.md](plan.html). The specification describes an initial 44-movement dataset; the supplied README and repository dataset contain the later 48-movement version. Neither count is silently rewritten in its source document.

## Adoption acceptance

1. The supplied specification and implementation plan are preserved byte for byte under the lifecycle names `spec.md` and `plan.md`.
2. The wish retains the user's wording and links to the original prompt history.
3. Every file from `demos/world_migration_atlas/` is preserved byte for byte in `work/`; the existing demo stays intact as the released output.
4. The complete supplied README is retained, with current navigation and clear distinctions between historical build claims and newly verified adoption results.
5. The initiative documents and test preview build successfully, and the deployed preview receives a browser check.
6. Production release remains a separate action after user testing and explicit authorization. No application code, dataset, shared library, or deployment script is changed by this adoption.
