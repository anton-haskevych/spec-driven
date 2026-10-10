---
needs: []
pr: A
---

# Phase 1 — One green verdict and the full check table

**Goal:** One pure verdict over every check's real state, shared by `pr status` and the board, judged on the code head, and a `pr status` that lists every check as queued, running, passed, failed, cancelled or skipped.

**Outcome:** You and every agent see the same answer to "is this PR green?", and exactly which checks are waiting, running, failed or skipped · medium · risk: board and pr-status output change (goldens re-pinned in this phase).

**Files to touch:**
- `skills/spec/tools/pr/verdict.ts` (new), `pr/code-head.ts` (new)
- `skills/spec/tools/pr/checks.ts`, `pr/gh-records.ts`, `pr/rollup.ts`, `pr/report.ts`, `pr/render.ts`, `pr/types.ts`, `pr/gh.ts`
- `skills/spec/tools/board/joins.ts`, `board/model.ts` (if `PrCell` gains a status)
- `skills/spec/tools/commands/pr.ts` (new group; `pr status`), `spec.ts`, `commands/pr-status.ts` (alias)
- `skills/spec/tools/tests/stub-runner.ts`, `tests/factories.ts`, fixtures

## Implementation guidance

Start with test infrastructure: promote `sequencedRunner` into `stub-runner.ts` and add `prView()` / `checkRow()` factories (the five hand-built `PrView`s move to them — refactor commit first, green). Then `verdict.ts` as a pure module over `CheckRow[]` (technical.md → Check model): status mapping, `latestPerName`, `checksVerdict`. Both `gh-records.ts` (gh pr checks buckets/states) and `rollup.ts` (statusCheckRollup) map into `CheckRow`; don't merge the two mappers (craft: different vocabularies). `prState` delegates the check part; `board/joins.ts` `nextFromChecks` reads the verdict. Then the code head: a docs-only head reads checks from the newest code commit. Last, the renderer: the status-grouped table from design.md.

The verdict precedence and the "≥1 passed, zero checks is none" rule are the behaviour change; re-pin `pr-checks.test.ts:35`, `board-joins.test.ts:84-88,102-103`, `board-render.test.ts:89-115`, `board-attention.test.ts:9-28`, `pr-render.test.ts:23-59`, `pr-status.test.ts:25` in the same commit as the change they follow.

## Deliverables

- [ ] Test infra: `sequencedRunner` in `stub-runner.ts`; `prView()`, `checkRow()` factories; existing pr tests use them (refactor, no behaviour change)
- [ ] `pr/verdict.ts`: `CheckRow`, status mapping from gh states (QUEUED/IN_PROGRESS/… → six statuses), `latestPerName`, `checksVerdict` with precedence red > rerun > waiting > green, `none` on zero rows, green needs ≥1 passed; external rows excluded — table-driven tests incl. stale-rows and vercel-pending fixtures
- [ ] `gh pr checks` fields widened (`startedAt,completedAt,state`), `gh-records.ts` and `rollup.ts` map into `CheckRow`; run/job ids parsed from links
- [ ] `prState` and the board's `nextFromChecks` use `checksVerdict`; goldens re-pinned
- [ ] `pr/code-head.ts`: newest commit outside `docs/specs/`; `GhClient.checksAt(sha)` reads check-runs + statuses for it; report says `code head <sha>` when it differs
- [ ] `pr status` renders the grouped table (running with elapsed, failed with run/job, passed with durations folded after 4, skipped folded, external line) and a `verdict:` line; `--json` emits `{ verdict, rows, head, codeHead }`
- [ ] `commands/pr.ts` group (`ACTIONS` like `commands/phase.ts`) with `pr status`; `pr-status` stays an alias; `commands-table.test.ts` green

## Phase-local notes

- `gh pr checks --json` exits 0 even with failures, and "no checks reported" exits 1 with that stderr (`spec-loop-automation/ledger/domain-gh-actions-shapes`).
- Vercel StatusContexts have `workflow: ""` and no job id: no tail, no main comparison.
- Cancelled with a newer run of the same name is history, not a verdict input (`latestPerName` handles it).
