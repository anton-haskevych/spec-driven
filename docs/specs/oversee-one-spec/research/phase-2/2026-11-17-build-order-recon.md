# Phase 2 recon — build order, specLayout (2026-11-17)

T = `skills/spec/tools`. Inline recon (seam small, read directly).

## Seam
- `T/ready/ready-set.ts:39-42` `phaseNeeds`: declared → `edges.needs` (no frontmatter → every earlier phase); linear → previous phase only. `readySet` linear waits on the *first earlier open* phase (`:33-36`): they differ when a done phase follows an open one. Build order must use readySet's rule for linear specs.
- `T/ready/ready-set.ts:67-74` same-files rule: a WIP phase never waits; otherwise the later (progress order) of an open pair waits, and a phase waits on a WIP sibling.
- `T/board/phase-keys.ts:11-17` `resolvedPhaseKeys` → canonical `spec#id` keys with done/deployed; drops unknown refs silently. `T/ready/refs.ts:15` `resolvePhaseRef` gives the unknown reason.
- `T/board/rank.ts:22-35` `unblockCounts`: the composition to mirror (`phaseNeeds` + `needsDeployed` → keys).
- `T/board/deploy-waits.ts:10-19`: needs-deployed targets via `resolvedPhaseKeys`.
- `T/core/phase-edges.ts:36` `needsCycle(needsOf, start)`: `needsOf(id) === undefined` = not a node; skipped.
- `T/pr/groups.ts` `prGroups`/`pickGroup` (28 lines): home of `specLayout` + `branchOf`.
- `T/plan/docs/pr-doc.ts:12,54-56` `DEFAULT_PR_GROUP`, `prBranch(spec, group)` (default → `feat/<spec>`): `branchOf` reuses it.
- `T/plan/docs/spec-doc.ts` `SpecDoc` reader; `T/plan/read-plans.ts:113` `recordFieldsOf`; `T/graph/spec-fields.ts` `RecordFields`/`SpecFields`; `T/graph/nodes.ts:56-69` `loadNode` → `SpecNode`. Path for `specBranch`: SpecDoc → RecordFields → SpecFields → SpecNode; `ready` already loads nodes.
- `T/commands/ready.ts` (15 lines) + `T/spec.ts:57` dispatch, usage string inline. House parseArgs: `T/commands/ship.ts:43-49`.
- `T/ready/render.ts` (25 lines): add `renderBuildOrder`.

## Reuse
- Keys/resolution: `resolvedPhaseKeys` + `resolvePhaseRef`; cycle: `needsCycle`; branch names: `prBranch`.
- No new graph lib: layering is a memoised longest-path over a handful of phases.

## Testing-issue estimate
- All pure: `phaseState`/`specNode`/`phaseEdges` factories in `T/tests/factories.ts`; nodes map built by hand like `ready.test.ts`.
- `ready-build-order.test.ts` new; `readyReport` has a git test (`record-readers.git.test.ts:83,106`) — its default output must not change.
- No file near the 250-line cap; `build-order.ts` new (keep < 150 lines, split render to `render.ts`).
