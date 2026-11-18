# Phase 5 recon — final PR and ship-alone groups (chunk: deliverables 1–5)

Read inline (the seam files are all under 120 lines); no explore agents.

## Seam

- `T/pr/groups.ts:21-31` `pickGroup(state, requested)`: groups from `prGroups` only; `default` is never a name there,
  so `pr open|status|merge <spec> default` refuses and `<spec>` with no group refuses "name one" in spec-branch mode.
  `specLayout` (`:55-74`) already has `finalPr { head, phases }` and `branchOf` (`:77`).
- `T/pr/resolve.ts:64` and `T/pr/actions/open.ts:45` compute the branch with `treeName(spec, group.name)` →
  `feat/<spec>-pr-default` for `default`. Both have `plans.joined(spec)?.spec.specBranch` (open already builds a
  layout for `laneHeadRefusal`).
- `T/trees/place.ts:70` `treeName(spec, prGroup)`; `:101-105` `wholeGroup` finds phases with `edges.pr === group`,
  none for `default`. `:85` `existingOnly` refuses a missing tree; base from `baseBranchOf` = default branch for
  `default` (layout.groups has no `default` key in spec-branch mode). `addTree` (`T/trees/acquire.ts:22`) takes over
  `origin/feat/<spec>` when it exists (it always does after `crew start --spec`), so base only matters when it's gone.
- `T/launch/place-for-launch.ts:19`: babysit → `existingOnly: true`, always.
- `T/claims/rules.ts:51-52` `takeRefusal`: `pr-<g>` accepted only when a phase has `edges.pr === g`. Caller
  `T/commands/claim.ts:119-124`, world from `loadBoardInputs` (has `nodes` → `specBranch`).
- `T/context/babysit-pack.ts:16-19`: groups from `edges.pr`; `default` unknown → "No PR group default". Caller
  `T/commands/context.ts:101` has `plans`.
- `T/board/tree-target.ts:20`: `treeName(spec, phase.edges.pr)`. A phase row never has group `default`; route through
  the same helper for one rule.
- `T/plan/pr-sync.ts:68-80` `prSyncPlan`: one `replace` per sighting. Mode end adds: lane docs `replace` + spec doc
  `update { specBranch: null }` (`mergePatch` deletes on null, `T/record/document.ts:30`). `isLaneGroup`
  (`T/plan/docs/spec-branch-rules.ts:37`) names the lane docs.
- Callers of `prSyncPlan`: `T/plan/pr-sync-send.ts:23` (`pr open|status|merge`), `T/board/load.ts:138` (board load).

## Reuse

- `prBranch(spec, group)` (`pr-doc.ts:54`) already maps `default` → `feat/<spec>`; add a `prTreeName` beside it so
  tree placement gets the folder too, and `branchOf` stays the layout's lookup.
- `isLaneGroup`, `specLayout.finalPr`, `laneHeadRefusal` exist; no new layout concept.

## Testing issues

- Pure: `pickGroup`, `wholeGroup`/`groupPhases` (via `placeTree` with fake deps), `takeRefusal`, `babysitPack`,
  `prSyncPlan` (record view fakes in `plan-pr-observed.test.ts`), `placeForLaunch`.
- `open.ts`/`resolve.ts` run on a `Runner` fake (`pr-open-base.test.ts`, `pr-resolve.test.ts`).
- Size: `place.ts` 105, `groups.ts` 95, `pr-sync.ts` 86: room. No file near 250.
