---
needs: []
pr: A
---

# Phase 1 — Groundwork: shared helpers, test factories, `list --local` fix

**Goal:** Pull the six helpers the focus work needs a third copy of into shared, tested homes, give the
suite one set of session/claim/PR factories, and stop `list --local` from printing an empty table.

**Outcome:** No visible change except `list --local` works again · small, refactor-only · risk: a moved
helper subtly changes a board row (caught by the existing exact-text tests).

**Files to touch:**
- new: `skills/spec/tools/sessions/label.ts`, `sessions/by-workspace.ts`, `board/deploy-waits.ts`, `core/age.ts`, `graph/progress.ts`
- `skills/spec/tools/trees/find.ts`, `claims/rules.ts`, `board/joins.ts`, `board/attention.ts`, `board/flight.ts`, `board/phase-keys.ts`, `portfolio/rows.ts`, `context/status-table.ts`
- `skills/spec/tools/commands/list.ts`
- `skills/spec/tools/tests/board-factories.ts` + the test files listed in the craft snapshot's *Create* section
- new tests: `sessions-label`, `sessions-by-workspace`, `board-deploy-waits`, `core-age`, `graph-progress`; cases in `board-phase-keys.test.ts`, `portfolio.test.ts`

## Implementation guidance

Pure moves first, one per commit, each with its own unit test, and the existing suite green after each.
The table in `technical.md` → *Extractions* names source lines and targets. `sessionsByWorkspace` must
return *all* sessions per tree (phase 3 needs them); `joins.ts` keeps picking the newest itself, and
`trees/find.ts` excludes the own session at the call site. `deployWaits` returns `{ waiter, target }`
pairs; `attention.ts` keeps grouping by target, so `board-lanes.test.ts:86-98` and
`board-render.test.ts:19,43` must not change.

Factories: add `liveSession`, `claim`, `heldClaim`, `prRow` to `tests/board-factories.ts` and switch
the hand-rolled copies over (craft snapshot lists file:line). Keep each test file's intent; only the
literals move.

`list --local`: consume `--local` (board `local: true`; the table ignores it) and drop any other
`--` flag from the filter. Pin with `portfolioTable(dir, ["table", "--local"], TODAY)` in
`portfolio.test.ts` (no git).

## Deliverables

- [ ] `sessionLabel` in `sessions/label.ts`, used by `trees/find.ts` and `claims/rules.ts`, with a test
- [ ] `sessionsByWorkspace` in `sessions/by-workspace.ts` (all sessions per tree), used by `board/joins.ts` and `trees/find.ts`, with a test
- [ ] `splitKey` next to `rowKey`; `flight.ts` and `attention.ts` use it; cases in `board-phase-keys.test.ts`
- [ ] `deployWaits` pairs in `board/deploy-waits.ts`; `attention.ts` groups them; test; existing deploy pins unchanged
- [ ] `olderThanDays` in `core/age.ts` (boundary at exactly N days); `attention.ts` uses it for remote claims
- [ ] `phaseProgress` in `graph/progress.ts`; `portfolio/rows.ts` and `context/status-table.ts` use it
- [ ] Shared `liveSession` / `claim` / `heldClaim` / `prRow` factories; hand-rolled copies replaced
- [ ] `list --local` / unknown `--` flags no longer filter the table; test

## Phase-local notes

- `tests/board-render.test.ts` and `board-lanes.test.ts` assert exact text: any diff there means a move changed behavior.
- `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not`: `olderThanDays` tests use fixed `Date`s, no child processes.
