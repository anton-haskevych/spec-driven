---
kind: decision
applies-to: [phase 4+]
created: 2026-10-01T15:19:41-07:00
---

# In flight is built from activity; "ready in a workspace" is a readySet overlay

How phase 3 landed, for phases 4–6 to build on (preflight 2026-10-01):

- **In-flight lane** = `flightRows(phaseActivity(...), inputs)` in `board/flight.ts`: every activity key
  whose spec is on the board (not finished, not paused). Those keys leave ready and blocked. One row per
  phase: `workspace` = first worktree, `alsoIn` = other worktrees where it is ticked.
- **`next`** is `ticked on branch, not merged` or `executing` (any wip). `executing` is a placeholder:
  phase 4 refines it from sessions (busy/idle) and PRs (fix CI, merge), and adds `joins.ts` for that.
- **Ready in a workspace** = `readyInWorkspaces`: rerun `readySet` on a copy of base with one worktree's
  ticks marked done. Same-spec needs only; a phase ready in two copies stays blocked. Base maps are never
  touched (`decision-branch-ticks-never-satisfy-needs-from-main`).
- **★** = `markSafe` in `board/rank.ts`, after lanes and before `rankReady`. Overlap nodes include
  branch-only specs; readiness nodes never do.
- **Board facts**: `Board.here` (realpath of `--show-toplevel`) and `Board.mainCheckout`. Claims (phase 5)
  and session cwds must compare against realpath'd paths too.
- A failed `scanWorkspaces` leaves the board on base alone, silently. If that hides real failures,
  add a footer line like `sessions` / `prs` have.
