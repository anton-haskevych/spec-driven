---
kind: gotcha
applies-to: [phase 5b, 6]
created: 2026-10-01T21:21:59-07:00
---

# EnterWorktree {path} reaches any tree only from the launch directory

Claude Code's `EnterWorktree` with `path` switches the session into any tree that `git worktree list` shows,
but only on the first entry from the directory the session was launched in. A session that is already inside
a worktree can switch only into trees under that repo's `.claude/worktrees/`. Trees under a personal root
(`~/claude-worktrees/<repo>`) are refused from there.

- Execute §1 handles it: if `EnterWorktree` refuses, run `cd <path> && spec.ts launch execute <spec>` and stop.
- Phase 6 (launch wiring): a session never moves itself between two worktrees. The launched one starts in the
  tree (`cd <tree> && claude`), which is what `decision-trees-placed-by-spec-driven.md` already says.

Source: the tool's own description, read 2026-10-01 (section *Entering an existing worktree*).
