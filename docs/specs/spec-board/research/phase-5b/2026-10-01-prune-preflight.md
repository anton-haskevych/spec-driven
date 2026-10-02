# Phase 5b — `trees prune [--apply]`: preflight

## Findings that change the plan

1. **"Merged into origin/<default>" misses squash merges** (recon probe: PR #8). → merged = ancestor, or head ==
   merged PR `headRefOid`. That equality also proves "no unpushed commits", so no upstream comparison (squash
   merges usually delete the remote branch anyway).
2. **Detached trees (Codex) have no branch to judge by PR.** → only the ancestry rule applies to them; never
   delete a branch for them (there is none).
3. **Removing the branch.** The phase says nothing about it. Leaving squash-merged branches piles them up
   (117 trees before the 09-17 purge). → `--apply` removes the tree (`worktree remove`, no `--force`) and then
   deletes the branch with `-D`, only after the merged rule held.

## Canon (deltas only)

| Rule | Verdict | Consequence |
|---|---|---|
| Pure core | Bites | `pruneCandidates(trees, facts)` pure over `{ ancestor, mergedPrHead, clean, busy }`; IO gathers facts |
| Errors as values | Bites | `--apply` reports per tree; one failure doesn't stop the rest |
| Size caps | Bites | `trees/prune.ts` (rules + IO) ≤ 150 lines; command text in `commands/trees.ts` (now 50) |

## Amendments

1. Merged rule as finding 1; detached trees by ancestry only.
2. `--apply` = `git worktree remove <path>` then `git branch -D <branch>`; a failed remove skips the branch delete.
3. Output lists each candidate with its evidence (`#8 merged` or `in origin/main`); without gh, the footer says
   PR merges were not checked.

## Decisions for you

None.
