---
kind: decision
applies-to: [phase 5b, 6]
created: 2026-10-01T20:03:50-07:00
---

# Spec-driven places worktrees itself: one per spec PR group, personal root detected

- **One tree per spec PR group.** The branch is `feat/<spec>-<pr>`, cut from a freshly fetched
  `origin/<default>`, at `<root>/<spec>-<pr>`.
- **Found before created.** `git worktree list` by branch first, then the workspace scan. An
  `origin/feat/<spec>-<pr>` with no local tree is taken over, not recreated.
- **One live session per tree.** A busy tree is refused, never shared.
- **Set up before the session opens:** `.worktreeinclude` files, then the project's `gates.bootstrap`.
- **Shared rules live in the repo** (`_playbook/settings.md`). The only personal setting, `worktrees.root`,
  sits in `<git-common-dir>/spec-driven/local.md` and is detected from where that person's trees already
  are. A teammate or customer is onboarded by their first `/spec execute`; nobody sends a file.
- **Launch is always `cd <tree> && claude`.**

**Why:**
- Anton's words: "it shouldn't be spawning stuff on the same work tree" (2026-10-01).
- CRM history 09-01..10-01:
  - Sessions overrode the WorktreeCreate hook's HEAD base and `worktree-*` branch almost every time.
  - Fresh trees missing the built `crm-api` were re-learned 5 times.
  - Trees got lost after a restart.
  - Taras has no hook; his trees go to Claude Code's in-repo `.claude/worktrees/`.
  - The hook silently reuses an existing tree name, which would put two sessions in one tree.

Supersedes `decision-launch-targets-row-workspace.md` (`claude -w <spec>-<phase>`, one tree per phase).
