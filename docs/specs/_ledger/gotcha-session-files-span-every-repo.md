---
kind: gotcha
paths: [skills/spec/tools/sessions/**, skills/spec/tools/board/**]
created: 2026-10-07T19:16:23-07:00
seen-in: [active-work-view]
---

# `loadLiveSessions` returns every Claude session on the machine: scope by this repo's worktree paths

`~/.claude/sessions/*.json` holds sessions from every repo, so anything that lists or matches sessions without a join must first keep only those whose cwd is inside one of this repo's `git worktree list` paths (`ownerOf(cwd, paths)`). Use every worktree, not the board's live-only `inputs.workspaces`.

Today's joins hide this because they attach sessions only by a claim's `sessionId` or a live worktree path (`board/joins.ts`). A footer of "other sessions" or a name-based match without the scope would show, say, claude-plugins sessions on CRM's board, or credit a same-named spec in another repo. Evidence: `sessions/live.ts` `loadLiveSessions` reads the whole directory; `claims/held.ts` `claimContext` already lists every worktree path.
