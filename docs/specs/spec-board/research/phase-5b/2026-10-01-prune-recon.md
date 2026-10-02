# Phase 5b — `trees prune [--apply]`: recon

Paths relative to `skills/spec/tools/`.

## Seam

- Worktrees: `workspaces/list.ts:17` `loadWorkspaces` (skip `isMain`, `prunable` records, detached heads).
- Busy: `trees/find.ts` `busyHolder(tree, sessions, claims, paths, ownSessionId)`; claims from
  `claims/held.ts:17` `heldClaims(git, sessions, states)` (only live/unknown matter, so base states can be empty).
- Base: `publish/snapshot.ts:24` `pinDefault` / `originTip`.
- gh: `pr/gh-lists.ts:17` pattern (`asyncRunner`, `--json`, timeout, `parseJson` from `pr/gh-records.ts`).
- Parallel per-tree git: `core/run.ts:66` `runAll(runner, jobs, 8)`, never rejects.

## Merged, with squash merges (probe 2026-10-01)

- `feat/spec-board` (PR #8, squash-merged): `merge-base --is-ancestor feat/spec-board origin/main` → 1 (not an
  ancestor). Its head `c11853e` equals the merged PR's `headRefOid`.
- So: merged = head is an ancestor of `origin/<default>`, **or** head equals a MERGED PR's `headRefOid` on that
  branch. Either way every local commit is on origin: the "no unpushed commits" rule needs no separate check.
- `gh pr list --state merged --limit 100 --json headRefName,headRefOid`: 0.6 s on CRM (65 worktrees).
- gh unavailable → ancestry only, said in the output.

## Testing-issue estimate

- Real git covers ancestry, dirty, remove. gh is stubbed (`tests/stub-runner.ts` `cannedGh` runs real git, fakes gh).
- `git worktree remove` without `--force` refuses dirty trees: a second guard. Squash-merged branches need
  `branch -D` (`-d` refuses them).
