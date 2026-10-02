---
kind: decision
applies-to: [phase 5+]
created: 2026-10-01T16:15:49-07:00
---

# PRs and sessions: how phase 4 landed, for claims and loop wiring to build on

- **Sources.** `pr/gh-lists.ts` `fetchPrLists` (async, `AsyncRunner`) starts before `loadMainline` and is
  awaited after the scan; the sync `GhClient` (pr-status) is untouched. `pr/rollup.ts` holds
  `checkBucket`, `rollupToChecks` (latest run per name **and workflow**, gh's key) and `toPrRows`.
  `sessions/live.ts` + `sessions/proc-starts.ts` (`ps` in `TZ=UTC`).
- **Inputs.** `BoardInputs.sessions` / `prs` are `Result<…> | "local"`; `prLinks` unions base and
  worktree `pr-opening.md` links (a branch links its PR before the docs reach main).
  `BoardRunners.claudeHome` (`CLAUDE_CONFIG_DIR` or `~/.claude`) is wired in `commands/board.ts` only.
- **Joins** (`board/joins.ts`, run in `buildBoard` right after `flightRows`). Sessions go to the
  deepest worktree whose path is a segment prefix of the cwd; phase 5 adds the claim-`sessionId` join
  in `attachSessions` ahead of it. A row's `next` becomes `fix CI` (failing or cancelled checks) or
  `merge` (not draft, ≥ 1 pass, 0 pending) from the joined PR.
- **Needs you.** `prAttention` reads the joined rows' `next`, so the merge/fix rule lives only in
  `joins.ts`. Phase 5's closed-claim rows go in `needsYou` beside it.
- **Cells.** `FlightRow.pr` may be `"unknown"` (gh failed → `?`); `PrCell.state` shows merged/closed;
  `✓` needs `passing > 0`.
- **Tests.** Any test that runs `loadBoard` without `--local` must pass a temp `claudeHome` and route
  gh through `cannedGh` (`tests/stub-runner.ts`), or it reads the real machine and reaches GitHub.
- CRM warm: 2.3 s full vs 1.8 s `--local`. CRM sessions mostly start in the main checkout, so worktree
  rows show `—` until claims join by `sessionId`.
