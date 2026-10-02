---
kind: gotcha
applies-to: [phase 5+]
created: 2026-10-01T16:29:14-07:00
---

# `BoardInputs.workspaces` holds live worktrees only: test "gone" against `loadWorkspaces`

`scanWorkspaces` drops merged-and-clean worktrees, so `BoardInputs.workspaces` (`board/load.ts`) lists only
worktrees with unmerged spec changes. A claim whose worktree still exists but merged would read `gone` and
be taken over. Claim status checks `gone` against every path from `loadWorkspaces(git)`.

The caller's own view (`workspaces.find(w => w.path === currentPath)`) is still the right place for phase
ids that exist only on the branch.
