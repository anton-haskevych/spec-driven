# Phase 1 recon — whole-spec needs

*Immutable. Seam from explore-waves wave 1 (`../2026-10-01-wave-1-prep-stage-and-needs.md`), re-read by the session.*

## Seam
- `tools/ready/refs.ts:15-24` `resolvePhaseRef` — the no-`#` branch at :17-23 expands to `node.phases`; 0 → unknown.
- `tools/graph/nodes.ts:60-63` `isFinished` — status test inline; extract `hasFinishedStatus`.
- Callers unchanged: `ready/ready-set.ts:55`, `doctor/phase-edges.ts:19`, `hooks/spec-file-check.ts:68`, `phases/validate.ts:24`.

## Patterns to mirror
- `Resolution` mark shape `{ label, done, deployed }`; labels `<spec>#<id>` for phases → `<spec>` for a whole spec.

## Reuse
- `isFinished` (spec-level rule) — no second definition.

## Testing-issue estimate
- No fixture gaps: `tests/ready.test.ts` builds nodes with `specNode`; doctor path via `phaseEdgeIssues` (same file).
- Sizes fine: refs.ts 31, nodes.ts 63, ready.test.ts 91 lines. Pure functions throughout.
