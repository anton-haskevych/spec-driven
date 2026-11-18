# Phase 4 recon — close-out and prune on the spec branch

T = `skills/spec/tools`. Single inline wave: the seam was named by technical.md → *Phase 4*.

## Seam

**Close-out**
- `T/crew/close-out-run.ts:37-57` `closeOut(entry, world)`: execute workers run `isDirty` (`status --porcelain`),
  `isPushed` (`fetch -q origin <b>`, `rev-parse HEAD`, `rev-parse origin/<b>`), `hasHandoffSince`
  (`log origin/<b> --since=<at> --grep=^\[handoff\] --format=%H -1`), Crew line from `lastTurnText` only.
- `T/crew/close-out.ts:14-25` `closeOutVerdict(facts)`: the missing list; `pushed` false → `commits not on origin`.
- `T/crew/tick-step.ts:41` `afterCloseOut`: `crew.prGroupReady` → `PR group ready: … → the PR moment`.
- Callers: `T/commands/crew/tick-ports.ts:37` (tick port, world has `layouts` at :32) and
  `T/commands/crew/check.ts:21` (no record read). `TickPorts.closeOut(entry, agents, claims)` at `tick.ts:45`,
  called from `closeOutLaunched` (`tick.ts:136`). Test overrides use `(entry) => …`, so an extra param is safe.
- Record evidence: `T/plan/record-tick.ts:54` writes `<sha> on origin/<branch>[ · note]`; tasks live on
  `PhaseDoc.tasks` (`T/plan/docs/phase-doc.ts:9-21`), reachable from `PlanSource.joined(spec).phases`
  (`T/plan/read-plans.ts:24`), which the tick's `loadBoardInputs` already holds (`inputs.value.plans`).
  `T/board/joined-activity.ts:14` has the only evidence regex (`/\bon origin\/(\S+)/`, the branch only).
- Lane lookup: `specLayout` / `branchOf` in `T/pr/groups.ts` (95 lines); a phase's group is `layout.groups`
  entry whose `phases` hold it; `shipsAlone` groups are not lanes.

**Prune**
- `T/trees/prune-rules.ts:24-31` pure `pruneCandidates(trees, mergedHeads, defaultBranch)`.
- `T/trees/prune.ts:37-53` `findPrunable`: pins default, `merge-base --is-ancestor <head> <base>` per tree
  (async batch), `gh pr list --state merged`. No record read today.
- Layout source for prune: `loadMainline(git, branch, { local: true })` (`T/mainline/load.ts:39`) gives `states`,
  `nodes` (with `specBranch`) and `plans` (`prs(spec)` → PR documents) after the pin already fetched main.
- Spec-doc test: `isSpecDocPath` (`T/core/spec-folders.ts:74`); `pathsOutsideSpecDocs` (`T/publish/push.ts:34`).

## Reuse

- `specLayout` for lane/branch/base (ledger `principle-one-spec-layout`); never parse `feat/<spec>-pr-<g>`.
- `isSpecDocPath` for "adds only spec-doc commits"; `-z` name lists (`gotcha-git-name-only-quotes-non-ascii-paths`).
- `findCrewLine` reads a `[handoff]` commit body as is (it scans lines for `Crew:`).
- Test helpers: `strictRunner` (exact argv, throws otherwise), `sequencedRunner`, `fastCrewDeps` not needed
  (closeOut takes a `Runner` directly). `trees-prune-rules.test.ts` is the pure prune test to extend.

## Testing-issue estimate

- `close-out-run.ts` has no direct test; `lastTurnText` reads `claudeHome/projects/*/<id>.jsonl` — a temp dir
  via `createTree` with a one-line transcript, or a missing home (returns undefined). Check the transcript
  format in `T/sessions/transcript.ts` before writing a fixture.
- `findPrunable` is tested only through real git (`trees-prune.git.test.ts`); the new lane facts are git reads
  that belong in a small adapter (`laneFacts(git, lane, …)`) tested with `sequencedRunner`, while the rule
  stays in `prune-rules.ts`. `findPrunable`'s record load is wiring; the real-git test keeps covering a repo
  with no record (lanes empty), so no real-git cap change.
- Sizes: all six files are well under 250 lines (`prune.ts` 102, `close-out-run.ts` 80, `tick.ts` 194).
- `--since` stays the launch `at` (ISO); tests use a date near now (`gotcha-git-since-ignores-a-date-it-cannot-parse`).
