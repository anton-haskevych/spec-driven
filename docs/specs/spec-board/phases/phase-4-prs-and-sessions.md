---
needs: [3]
pr: B
---

# Phase 4 — PRs and sessions

**Goal:** In-flight rows show their PR (number, draft, CI pass/fail/pending) and the live session in that worktree (busy/idle and how long ago), and the needs-you lane lists PRs to merge or fix, deploys others wait on, and overdue work.

**Outcome:** The board answers "did this spec open its PR, is CI green, is anyone still on it" without opening GitHub or other terminals · two gh calls add ~2.3 s · risk: gh missing or offline degrades to `?` cells.

**Files to touch:**
- `skills/spec/tools/pr/gh.ts` (`prList`), `pr/gh-records.ts` (`toPrRows`, `rollupToChecks`), `pr/types.ts` (`PrRow`)
- `skills/spec/tools/sessions/live.ts` (new)
- `skills/spec/tools/board/inputs.ts`, `lanes.ts`, `render.ts`
- `skills/spec/tools/tests/fixtures/gh-pr-list-open.json`, `gh-pr-list-all.json`, `session-busy.json` (new)
- tests: `pr-gh.test.ts`, new `pr-rollup.test.ts`, `sessions-live.test.ts`; `board-lanes.test.ts`, `board-render.test.ts`

## Implementation guidance

`technical.md` → *prs* and *sessions*. `rollupToChecks` feeds the existing `summarizeChecks`, so the
external-check globs apply unchanged; don't touch `prState` (it needs `mergeable`, which lists return as
`UNKNOWN`). `loadLiveSessions(claudeHome, isAlive)` takes both as parameters — tests point `claudeHome`
at a `createTree` folder and pass `isAlive`. Session ↔ worktree: longest worktree path that prefixes
the session's `cwd`. Capture the gh fixtures from CRM, trimmed to a few PRs with CheckRun and
StatusContext items.

## Deliverables

- [ ] `rollupToChecks` table test (every CheckRun status/conclusion and StatusContext state) + `toPrRows` from fixtures
- [ ] `GhClient.prList` + two-call fetch in `loadBoardInputs`; gh failure → `prs: { ok: false }`, footer reason, `?` cells
- [ ] `loadLiveSessions`: parse, dead pid dropped, epoch-or-ISO `updatedAt`; session ↔ worktree by longest prefix
- [ ] In-flight row PR + session cells; PR join by branch and by `pr-opening.md` links
- [ ] Needs-you lane: merge, fix CI, deploy waited on (`needs-deployed`), overdue spec or phase

## Phase-local notes

- `--state all` doesn't list open PRs first; the open call is separate for that reason too.
- Merged PRs keep `headRefName` after the branch is deleted (wave 1), so merged rows still join.
