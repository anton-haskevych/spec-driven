---
needs: [7]
pr: C
---

# Phase 10 — Background shells don't hold a tree

**Goal:** a session whose turn has ended but whose background shell is still running (a local stack left up
for the next phase) reads as finished, not mid-task. It holds the tree only through a claim or uncommitted
changes, like an idle one.

**Outcome:** the session that handed off can leave the local CRM stack running for the next phase, and the
next phase starts in that tree instead of refusing · small tool change · low risk.

**Evidence** (CRM 2026-10-02 17:11–17:15): academy-ballroom-migration phase 4 handed off with "1 shell still
running" (the local CRM copy with the imported people, kept so phase 5 could check its SQL counts) and
launched phase 5 into its tree. Phase 5 refused: "The Phase 4 session … is running a shell command right now."
The phase 4 session file said `"status":"shell"`. `sessions/live.ts` `parseSessionFile` maps every status but
`idle` to `busy`, and phase 7's `treeHolder` treats `busy` as mid-turn. Values seen in `~/.claude/sessions`
that day (CLI 2.1.288): `busy`, `idle`, `shell`.

**Files to touch:**
- `skills/spec/tools/sessions/live.ts` (`LiveSession.status`, `parseSessionFile`)
- `skills/spec/tools/trees/find.ts` (`treeHolder`: only `busy` is mid-turn)
- `skills/spec/tools/board/model.ts` (`SessionCell` status), tests

## Implementation guidance

Map `shell` explicitly; keep every unknown value failing toward `busy` (the gotcha on undocumented session
files). The board's session cell shows `shell 3m`, which tells the user a background process is up.

## Deliverables

- [x] `parseSessionFile` reads `shell` as its own status; unknown values stay `busy`
- [x] `treeHolder`: a session with only a background shell running holds a tree like an idle one (claim or uncommitted changes only); the board cell shows `shell`
