# Phase 4 preflight — close-out and prune on the spec branch

Inputs: phase entry, technical.md → *Phase 4*, `2026-11-17-close-out-prune-recon.md`, principles.md. T = `skills/spec/tools`.

## Findings that change the plan

1. **A lane test already exists for record documents**: `isLaneGroup(specBranch, group)`
   (`T/plan/docs/spec-branch-rules.ts:37-39`). The close-out and prune work from a `SpecLayout`, so the new
   `laneOfPhase(layout, phase)` in `T/pr/groups.ts` must answer from `layout.groups` (`mode === "spec-branch"`,
   `!shipsAlone`) and not re-derive membership from `specBranch`; the two must agree, which a test pins
   (`default` and ship-alone groups are not lanes).
2. **Join's evidence is a bare sha** (`T/board/joined-activity.ts:16-18`), a tick's is `<sha> on origin/<b>[ · note]`
   (`T/plan/record-tick.ts:54`). `recordedCommit(tasks)` reads the leading hex sha of the last done task with
   evidence, in either form; a task with a non-sha evidence (task phases, gates) is skipped. No sha → not merged back.
3. **The tick port signature**: `TickPorts.closeOut(entry, agents, claims)` (`T/commands/crew/tick.ts:45`) has no way
   to reach layouts or tasks. Pass the scoped `TickWorld` instead of `claims`; the two test overrides
   (`tests/crew-tick-fast.ts:33`, `tests/crew-tick.git.test.ts:37`) take `(entry)` only, so they keep compiling.
4. **`crew check`** (`T/commands/crew/check.ts:21`) reads no record, so it keeps today's checks for a lane worker.
   Out of this phase's files; recorded as a default, not widened.

## Clean Code / Clean Architecture / SOLID against Phase 4

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Functions do one thing | Bites | `closeOut` (`close-out-run.ts:37-57`) branches babysit / execute; the lane path is a third: split `laneFacts(git, lane, entry)` into `crew/lane-close-out.ts` so `closeOut` stays a dispatcher under 50 lines |
| No flag arguments | Bites | the lane verdict marks `lane: true` on the ok result (data), not a boolean param to `afterCloseOut` |
| Pure core, I/O at seams | Bites | prune: `laneTreeFacts` (git reads) in `trees/prune.ts`, the merged rule in `trees/prune-rules.ts` (pure, `TreeFacts` gains optional `lane`) |
| DIP / one layout | Bites | prune reads branches through `specLayout` + `branchOf`, never parses `feat/<spec>-pr-<g>` (ledger `principle-one-spec-layout`) |
| OCP | Inert | — |
| LSP / ISP | Inert | — |
| Errors are values | Bites | an unreadable git answer counts as "not merged" (close-out) and "keep" (prune), as `isDirty` already does |
| DDD | Skipped | tooling, no domain model |

## Seam and testability (deltas from recon)

- `lastTurnText` with a missing `claudeHome` returns undefined (`T/sessions/transcript.ts:11`): the close-out-run
  test passes `/nonexistent` and gets an empty last turn without fixtures; a transcript fixture is only needed for the
  "Crew line from the last turn" case (one `.jsonl` line with an assistant text block, `parseLastTurn` :28-38).
- `findPrunable`'s new record load runs in `trees-prune.git.test.ts` against a repo with no specs: lanes empty, so
  no new real-git test and no cap change.

## Amendments

1. `laneOfPhase(layout, phaseId)` in `T/pr/groups.ts` returns `{ group, branch }` for a lane only; tested beside
   `specLayout`.
2. `recordedCommit(tasks)` in `T/plan/docs/task-evidence.ts`, accepting a bare sha or `<sha> on origin/<b>`.
3. `TickPorts.closeOut(entry, agents, world)`; `TickWorld.phaseTasks?(spec, phase)` filled in `tick-ports.ts` from
   `inputs.value.plans.joined`.

## Defaults applied

- `crew check` keeps today's close-out (no record read); a lane worker checked by hand may still read "not on origin".
- Prune loads specs with `loadMainline(git, branch, { local: true })` after its own pin: no second fetch of main and
  no record fetch; a stale record only keeps a tree longer.
- "Only spec-doc commits beyond" = non-merge commits in `<head> ^origin/<lane> ^origin/<default>` touch only
  `isSpecDocPath` paths (commits already on main, like the docs snapshot, aren't the tree's own).
- The lane-document-merged rule also requires only spec-doc commits beyond `origin/<lane>`: nothing unpushed is pruned.

## Forks for you

None.
