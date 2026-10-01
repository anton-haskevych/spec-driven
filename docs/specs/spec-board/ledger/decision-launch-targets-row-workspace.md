---
kind: decision
applies-to: [phase 6]
created: 2026-10-01T14:01:46-07:00
---

# Launched sessions run in the row's workspace, or in a new `claude -w` worktree

Every board row carries a `target`, and `launch` acts on it:

| Row | Target | Launch |
|---|---|---|
| Continuing: wip, ticked, or ready in a workspace | that worktree | `cd <worktree> && claude …` |
| Fresh ready row | a new worktree | `claude -w <spec>-<phase> …` from the project dir |

`claude -w` creates the worktree through the user's WorktreeCreate hook (`~/claude-worktrees/<repo>/…`).
The phase goes in the session title, so `-n` names stay distinct.

Rejected: launching in the caller's checkout, which is today's `sessionLaunch(projectDir)`. "Start 1
and 2" from main would run two execute sessions in one working tree, and `only on <branch>` specs aren't
on main's disk (review L1). Not keyed on branch → spec mapping: the target comes from claims and the
workspace scan.
