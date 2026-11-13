---
kind: gotcha
paths: [skills/spec/tools/workspaces/**]
created: 2026-11-12T02:43:21-08:00
seen-in: [live-board]
---

# `scanWorkspaces` skips a tree with no commits off base, even when it has uncommitted edits

To see every tree's uncommitted spec edits, pass all worktree paths as `forceLive` (`loadWorkspaces(git)` →
`new Set(paths)`). `classifyWorkspaces` calls a tree with zero commits ahead of base `merged` unless it is the
main checkout or forced live, and `workspaceSpecChanges` only queries live ones. Bit `join --tidy` in phase 4:
a fresh worktree with an edited phase file was not seen, so tidy would have rewritten that file under it.
