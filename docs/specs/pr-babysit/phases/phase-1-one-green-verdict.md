---
needs: []
pr: A
---

# Phase 1 — One green verdict and the full check table

**Goal:** One pure verdict over every check's real state from `statusCheckRollup` on the PR head, shared by `pr status` and the board, and a `pr status` that lists every check as queued, running, passed, failed, cancelled or skipped.

**Outcome:** You and every agent see the same answer to "is this PR green?", and exactly which checks are waiting, running, failed or skipped · medium · risk: board and pr-status output change (goldens re-pinned in this phase).

**Files to touch:**
- `skills/spec/tools/pr/` → subfolders `checks/`, `failures/` (move only); `pr/checks/verdict.ts` (new)
- `skills/spec/tools/pr/checks/rollup.ts`, `checks/checks.ts`, `checks/types.ts`, `pr/report.ts`, `pr/render.ts`, `pr/gh.ts`; `pr/gh-records.ts` (checks mapper deleted)
- `skills/spec/tools/board/joins.ts`, `board/model.ts` (if `PrCell` gains a status; decide on `BOARD_VERSION`)
- `skills/spec/tools/commands/pr.ts` (new `ACTIONS` table), `commands/pr/status.ts` (new), `spec.ts`; `commands/pr-status.ts` deleted, prose callers (`SKILL.md`, `execute.md` §10) switched to `pr status`
- `skills/spec/tools/tests/stub-runner.ts`, `tests/pr-factories.ts`, fixtures

## Implementation guidance

**Probe first** (before any code): on a live CRM PR with code changes, push a docs-only commit on top and record whether the head gets checks (GitHub evaluates `pull_request` `paths:` against the whole PR diff). Write the result as a `domain` ledger entry. Head gets checks → no checked-head fallback anywhere. Head gets none → add the narrow fallback deliverable below (technical.md → Docs-only heads). Never read checks from a commit that wasn't a push tip.

Then two refactor commits, green, no behaviour change: (1) move `pr/` files into `pr/checks/` (types, rollup, checks, gh-lists if it stays checks-only) and `pr/failures/` (log-tail, main-compare); (2) promote `sequencedRunner` into `stub-runner.ts` and add `prView()` / `check()` factories in `tests/pr-factories.ts` (the five hand-built `PrView`s move to them).

Then the source switch: `pr status` reads `gh pr view <n> --json …,statusCheckRollup` and maps it with `rollupToChecks` — the board's mapper — so `gh pr checks` and `gh-records.ts`' checks mapper go. `Bucket` splits `pending` into `queued`/`running`; `Check` gains timestamps and run/job ids. `rollupToChecks` stays the one dedupe (workflow + name); a row with no or zero-time `startedAt` counts as newest. Then `verdict.ts`: `checksVerdict(checks, isExternal)`, exhaustive, precedence red > cancelled > waiting > green, `none: no-checks` on zero rows, `none: skipped` when nothing passed or is pending. `prState` delegates the check part; `board/joins.ts` `nextFromChecks` reads the verdict. Last, the renderer: the status-grouped table from design.md.

The verdict precedence and the "≥1 passed; zero or all-skipped is none" rule are the behaviour change; re-pin `pr-checks.test.ts:35`, `board-joins.test.ts:84-88,102-103`, `board-render.test.ts:89-115`, `board-attention.test.ts:9-28`, `pr-render.test.ts:23-59`, `pr-status.test.ts:25` in the same commit as the change they follow.

## Deliverables

- [ ] Probe: docs-only push on a live CRM PR → does the head get checks? Result in a `domain` ledger entry
- [ ] Refactor: `pr/checks/`, `pr/failures/` subfolders; `stub-runner.ts`; `prView()`, `check()` in `tests/pr-factories.ts`; existing pr tests use them (no behaviour change)
- [ ] `pr status` reads `statusCheckRollup` via `gh pr view` through `rollupToChecks`; `Bucket` gains `queued`/`running`, `Check` gains `startedAt`/`completedAt`/`runId`/`jobId`; zero-time rows count as newest; `gh-records.ts` checks mapper deleted
- [ ] `pr/checks/verdict.ts`: `checksVerdict(checks, isExternal)` with red > cancelled > waiting > green, `none: no-checks | skipped`, green needs ≥1 passed — table tests over the rollup fixtures (states, vercel-pending, stale-rows, same-name-two-workflows, all-skipped, queued-rerun)
- [ ] `prState` and the board's `nextFromChecks` use `checksVerdict`; goldens re-pinned
- [ ] `pr status` renders the grouped table (running with elapsed, failed with run/job, passed with durations folded after 4, skipped folded, external line) and a `verdict:` line
- [ ] `commands/pr.ts` `ACTIONS` table + `commands/pr/status.ts`; `pr-status` removed and its prose callers updated; `commands-table.test.ts` green
- [ ] Only if the probe found no checks on a docs-only head: `pr/checks/checked-head.ts` (docs-only walk via `pathsOutsideSpecDocs`, `git log --name-only -z`; REST check-runs `per_page=100` + statuses into `Check`) — real-git round-trip test

## Phase-local notes

- Vercel StatusContexts have `workflow: ""` and no job id: no tail, no main comparison; dedupe key is the context name.
- Cancelled with a newer run of the same workflow + name is history, not a verdict input.
- `rollup.ts` already handles `context`/`targetUrl` for StatusContexts (`rollup.ts:47-51`).
