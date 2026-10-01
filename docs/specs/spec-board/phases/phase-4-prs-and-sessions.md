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
- `skills/spec/tools/pr/gh.ts` (`openPrs`, `recentPrs`), `pr/gh-records.ts` (`toPrRows`, `rollupToChecks`), `pr/types.ts` (`PrRow`)
- `skills/spec/tools/sessions/live.ts` (new)
- `skills/spec/tools/board/inputs.ts`, `joins.ts`, `attention.ts` (new), `render.ts`
- `skills/spec/tools/tests/fixtures/gh-pr-list-open.json`, `gh-pr-list-all.json`, `session-busy.json` (new)
- tests: `pr-gh.test.ts`, new `pr-rollup.test.ts`, `sessions-live.test.ts`, `board-attention.test.ts`; `board-joins.test.ts`, `board-render.test.ts`; the `GhClient` fake gains `openPrs` / `recentPrs`

## Implementation guidance

See `technical.md` → *prs*, *sessions* and *Joins*.

**Checks.** `rollupToChecks` reproduces gh's state→bucket mapping, then feeds the existing
`summarizeChecks`, so the external-check globs apply unchanged. Check it with a parity test against the
`state`/`bucket` pairs in `tests/fixtures/gh-pr-checks.json`, plus a re-run fixture (failed, then
passed) that must come out green. Don't touch `prState`: it needs `mergeable`, which lists return as
`UNKNOWN`.

**Sessions.** `loadLiveSessions(claudeHome, procStarts)` takes both as parameters, and returns a
`Result`. Tests point `claudeHome` at a `createTree` folder and pass a `procStarts` map. A session counts
only when its pid's start time matches the file's `procStart`.

**Joins.**
- Session → row: by claim `sessionId` first (Phase 5 fills claims), then by path-segment prefix.
- PR → row: by branch (OPEN first, then newest) and by `pr-opening.md` links from the base cache.

**Fixtures.** Capture the gh fixtures from CRM, trimmed to a few PRs that have both CheckRun and
StatusContext items.

## Deliverables

- [ ] `rollupToChecks`: parity test against gh's `bucket` + latest-run-per-name dedupe; `toPrRows` from fixtures
- [ ] `GhClient.openPrs` / `recentPrs` with timeout; gh failure → `prs: { ok: false }`, footer reason, `?` cells; `--local` skips gh
- [ ] `loadLiveSessions`: parse, pid alive with matching `procStart`, stale-file fixture dropped, duplicate `sessionId` → newest, epoch-or-ISO `updatedAt`, unreadable dir → `Result` failure → `unknown` cells
- [ ] Joins: session by path-segment prefix (`/crm/foo` ≠ `/crm/foo-bar`); PR by branch and by `pr-opening.md` links; a linked PR not in either list → `?`
- [ ] `needsYou`: merge (≥ 1 check, all pass, not draft), fix CI, joined PRs only

## Phase-local notes

- `--state all` doesn't list open PRs first, which is another reason the open call is separate.
- Merged PRs keep `headRefName` after the branch is deleted (wave 1), so merged rows still join. A
  reused branch name prefers the OPEN PR.
- Session files are an undocumented Claude Code internal (ledger). `sessions/live.ts` is their only
  reader.
