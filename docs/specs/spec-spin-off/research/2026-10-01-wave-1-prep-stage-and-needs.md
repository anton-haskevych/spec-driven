---
date: 2026-10-01
wave: 1
lens: implementation
slug: prep-stage-and-needs
brief: product-brief.md
---

# Recon Wave 1 — prep-stage-and-needs

*Source of record — do not edit. explore-waves wave 1 (2 Explore agents), synthesized by the session.*

## Verified

- **Prep stage exists only in markdown.** No tool reads `product-brief.md` or `research/`. A spec is any
  `docs/specs/<name>/CLAUDE.md` not starting with `_` (`tools/core/spec-folders.ts:13,19-29`). The only
  file signal is `progress.md` (`core/spec-state.ts:43-45`); the context pack returns `""` without
  `progress.md` + `ledger/INDEX.md` (`commands/context.ts:41-43`). So a folder with `CLAUDE.md` + `seed.md`
  is already found, listed and doctored as a zero-phase spec.
- `prep.md:35-37` precondition has three branches (fresh / has brief or research / full spec); a folder
  with only `CLAUDE.md` + `seed.md` matches none. Stub template `prep.md:75-92`; idea promotion `:35,98`.
- `list` renders a prep spec as an ordinary row with its `status:` and Progress `—`
  (`portfolio/render.ts:37`); `list prep` filters by status already (`portfolio/order.ts`).
- **Phase-level whole-spec needs.** `ready/refs.ts:15-24` `resolvePhaseRef`: a bare ref naming a spec
  expands to all its phases; 0 phases → `unknown`, reason `<spec> has no phase`. Satisfied = each
  expanded phase ticked; status never read. Reached from the ready set (`ready/ready-set.ts:47-60`), the
  doctor (`doctor/phase-edges.ts:12-23`), the spec-file hook (`hooks/spec-file-check.ts:68`, blocking) and
  `phases/validate.ts:24`.
- **Spec-level whole-spec needs already work** on phase-less specs: `graph/neighborhood.ts:44-49` uses
  `isFinished` (`graph/nodes.ts:60-63`: done / good-enough / abandoned, or ≥1 phase and all ticked).
  `graph/checks.ts:28` only checks phases when the ref has `#`.

## Reuse

- `isFinished` for the phase-level rule (one definition for both layers).
- Factories `specNode`, `phaseState`, `phaseEdges` (`tests/factories.ts`) and `tests/ready.test.ts` style.

## Still open

- Where the mode files talk about creating another spec (none found yet) and every doc line for `needs`.
- How to name the slash command in a launched session; how to test a launcher.
