---
needs: []
pr: A
---

# Phase 1 — Groundwork: shared helpers, test factories, `list --local` fix

**Goal:** Move the eight helpers the focus work would otherwise copy a third time into shared, tested
homes. Give the suite one set of session/claim/PR factories. Stop `list --local` from printing an empty
table.

**Outcome:** No visible change except `list --local` works again and unknown `list --` flags print usage
· small, refactor-only · risk: a moved helper subtly changes a board row (caught by the existing
exact-text tests).

**Files to touch:**
- new: `skills/spec/tools/sessions/label.ts`, `sessions/by-workspace.ts`, `board/deploy-waits.ts`, `core/age.ts`, `launch/title.ts`
- `skills/spec/tools/trees/find.ts`, `claims/rules.ts`, `board/joins.ts`, `board/attention.ts`, `board/flight.ts`, `board/phase-keys.ts`, `portfolio/rows.ts`, `launch/command-line.ts`
- `skills/spec/tools/commands/list.ts`
- `skills/spec/tools/tests/factories.ts`, `tests/board-factories.ts` + the test files listed in the craft snapshot's *Create* section
- new tests: `sessions-label`, `sessions-by-workspace`, `board-deploy-waits`, `core-age`, `launch-title`, `list-route`; cases in `board-phase-keys.test.ts`, `portfolio.test.ts`

## Implementation guidance

Pure moves first, one per commit. Each gets its own unit test, and the existing suite must be green
after each. `technical.md` → *Extractions* names the source lines and targets.
- `sessionsByWorkspace` must return *all* sessions per tree, because phase 3 needs them. `joins.ts`
  keeps picking the newest itself, and `trees/find.ts` excludes the own session at the call site.
- `deployWaits` returns `{ waiter, target }` pairs. `attention.ts` keeps grouping by target, so
  `board-lanes.test.ts:86-98` and `board-render.test.ts:19,43` must not change.
- `olderThanDays(then: Date, now: Date, days)` keeps today's strict `<`. Test it at exactly N days
  (false) and at N days + 1 ms (true). `oldRemoteClaims` converts `claimedAt` with `new Date(...)`.
- `specSummary(node, today)` is split out of `specRow` in the same file (progress, priority, due,
  overdue). Leave `context/status-table.ts` alone.
- `toPrCell`: rename the private `prCell` in `joins.ts` (it collides with `cells.prCell`) and export it
  with `linkedPrs` (today's `byLinks` lookup, open first, newest first).
- `launch/title.ts`: `launchTitle` builds what `sessionLaunch` builds today; `parseLaunchTitle` inverts
  it (spec, sub in `SUB_COMMANDS`, phase via `isPhaseId`). Add a round-trip test against
  `sessionLaunch(...).title`.

**Factories.** `claim`, `heldClaim` and `liveSession` go in `tests/factories.ts`; `prRow` goes in
`tests/board-factories.ts`. Type them fully with `Partial<T>` overrides. Switch a hand-rolled copy over
only where the defaults fit. Where a local helper derives fields (e.g. `board-claims` derives
`sessionId` from the phase), keep it as a thin wrapper over the shared factory. Keep each test file's
intent: only the literals move.

**`list` routing.** Use a pure `listRoute(args)` (`technical.md` → *`list` fix*):
- `--local` alone → the board with `local: true`
- `table`, `all` or filter words → the table
- an unknown `--` flag → usage

Test it without git.

## Deliverables

- [x] `sessionLabel` in `sessions/label.ts`, used by `trees/find.ts` and `claims/rules.ts`, with a test
- [x] `sessionsByWorkspace` in `sessions/by-workspace.ts` (all sessions per tree), used by `board/joins.ts` and `trees/find.ts`, with a test
- [x] `splitKey` next to `rowKey`; `flight.ts` and `attention.ts` use it; cases in `board-phase-keys.test.ts`
- [x] `deployWaits` pairs in `board/deploy-waits.ts`; `attention.ts` groups them; test; existing deploy pins unchanged
- [x] `olderThanDays` in `core/age.ts` (strict; N days false, N days + 1 ms true); `attention.ts` uses it for remote claims
- [x] `specSummary` exported from `portfolio/rows.ts`; `specRow` uses it; cases in `portfolio.test.ts`
- [x] `toPrCell` + `linkedPrs` exported from `board/joins.ts`; in-flight output unchanged
- [x] `launchTitle` / `parseLaunchTitle` in `launch/title.ts`; `sessionLaunch` uses the builder; round-trip test
- [x] Shared `claim` / `heldClaim` / `liveSession` / `prRow` factories; fitting copies replaced
- [x] `listRoute`: `list --local` shows the board, unknown `--` flags print usage; test

## Phase-local notes

- `tests/board-render.test.ts` and `board-lanes.test.ts` assert exact text: any diff there means a move changed behavior.
- `gotcha-bun-test-runs-in-utc-but-spawned-children-do-not`: `olderThanDays` tests use fixed `Date`s, no child processes.
