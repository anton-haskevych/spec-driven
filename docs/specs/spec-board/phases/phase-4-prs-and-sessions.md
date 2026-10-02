---
needs: [3]
pr: B
---

# Phase 4 — PRs and sessions

**Goal:** In-flight rows show their PR (number, draft, CI pass/fail/pending) and the live session in that
worktree (busy or idle, and how long ago). The needs-you lane lists PRs to merge or fix.

**Outcome:** The board answers "did this spec open its PR, is CI green, is anyone still on it" without
opening GitHub or other terminals · two gh calls add ~2.3 s · risk: if gh is missing or offline, the PR
cells show `?`; if the session files are unreadable, session cells show `unknown`.

**Files to touch:**
- `skills/spec/tools/pr/gh-lists.ts` (new: async `openPrs`, `recentPrs`), `pr/rollup.ts` (new: `checkBucket`, `rollupToChecks`, `toPrRows`, `PrRow`)
- `skills/spec/tools/sessions/live.ts`, `sessions/proc-starts.ts` (new)
- `skills/spec/tools/commands/board.ts` (`claudeHome` in `BoardDeps`), `tests/stub-runner.ts` (`cannedGh`)
- `skills/spec/tools/board/inputs.ts`, `joins.ts`, `attention.ts` (new), `render.ts`
- `skills/spec/tools/tests/fixtures/gh-pr-list-open.json`, `gh-pr-list-all.json`, `gh-pr-checks-by-pr.json`, `session-busy.json` (new)
- tests: new `pr-gh-lists.test.ts`, `pr-rollup.test.ts`, `sessions-live.test.ts`, `board-joins.test.ts`, `board-attention.test.ts`; `board-cells.test.ts`, `board-render.test.ts`, `board-command.test.ts` (stub gh, temp `claudeHome`)

## Implementation guidance

See `technical.md` → *prs*, *sessions* and *Joins*.

**Checks.** `rollupToChecks` reproduces gh's state→bucket mapping, then feeds the existing
`summarizeChecks`, so the external-check globs apply unchanged. gh keeps the latest run per
**name + workflow**, not per name (preflight 2026-10-01). Check it with the `state`/`bucket` pairs in
`tests/fixtures/gh-pr-checks.json`, a real pair from CRM (PR 566's rollup against its `gh pr checks`
output), plus a re-run fixture (failed, then passed) that must come out green. `cancel` counts as
failing on the board.

**gh lists** are async (`pr/gh-lists.ts`, `AsyncRunner`) so they overlap the worktree scan; the sync
`GhClient` stays as it is. Don't touch `prState`: it needs `mergeable`, which lists return as
`UNKNOWN`.

**Sessions.** `loadLiveSessions(claudeHome, procStarts)` takes both as parameters, and returns a
`Result`. `procStarts` runs `ps` with `TZ=UTC` (ledger). `BoardDeps` carries `claudeHome`. Tests point `claudeHome` at a `createTree` folder and pass a `procStarts` map. A session counts
only when its pid's start time matches the file's `procStart`.

**Joins.**
- Session → row: by claim `sessionId` first (Phase 5 fills claims), then by path-segment prefix.
- PR → row: by branch (OPEN first, then newest) and by `pr-opening.md` links from the base cache.

**Fixtures.** Capture the gh fixtures from CRM, trimmed to a few PRs that have both CheckRun and
StatusContext items.

## Deliverables

- [x] `rollupToChecks`: parity test against gh's `bucket` + latest run per name and workflow; `toPrRows` from fixtures
- [x] `ghLists` `openPrs` / `recentPrs` with timeout; gh failure → `prs: { ok: false }`, footer reason, `?` cells; `--local` skips gh
- [x] `loadLiveSessions`: parse, pid alive with matching `procStart`, stale-file fixture dropped, duplicate `sessionId` → newest, epoch-or-ISO `updatedAt`, unreadable dir → `Result` failure → `unknown` cells
- [x] Joins: session by path-segment prefix (`/crm/foo` ≠ `/crm/foo-bar`); PR by branch and by `pr-opening.md` links; a linked PR not in either list → `?`
- [x] `needsYou`: merge (≥ 1 check, all pass, not draft), fix CI, joined PRs only

## Phase-local notes

- `--state all` doesn't list open PRs first, which is another reason the open call is separate.
- Merged PRs keep `headRefName` after the branch is deleted (wave 1), so merged rows still join. A
  reused branch name prefers the OPEN PR.
- Session files are an undocumented Claude Code internal (ledger). `sessions/live.ts` is their only
  reader.
