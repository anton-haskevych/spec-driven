---
kind: gotcha
paths: [skills/spec/tools/trees/**, skills/spec/tools/workspaces/**]
created: 2026-10-01T20:23:06-07:00
seen-in: [spec-board]
---

# A clean check across all worktrees stats every file: let `git worktree remove` refuse instead

Don't run `git status` in every worktree just to decide whether one is safe to remove. Run plain `git worktree remove <path>` (no `--force`): it refuses a tree with modified or untracked files, and you report the refusal.

CRM has 35,797 tracked files and 64 trees. Even `status -uno` refreshes the index by stat'ing every file:
- 0.06 s per tree on its own
- 9.2 s for all 64 at `-P8` (66 s system CPU)
- `core.preloadIndex=false` and running them one at a time didn't help

The untracked walk costs another 8× (0.49 s per tree). Dropping the check took `trees prune` from 9.8 s to 2.3 s.
