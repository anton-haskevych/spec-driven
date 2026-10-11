# Phase 3 recon — `pr wait` (2026-10-10)

Single wave, read inline: Stage B context and phase 4's code made the seam obvious.

## Seam
- `pr/babysit/poll.ts` — `pollUntil` + `systemClock` already landed in phase 4 (`tests/pr-poll.test.ts`). Deliverable 1 is done; reuse as is.
- `pr/checks/verdict.ts:14` `checksVerdict` + `externalMatcher` — the one verdict; wait settles on its kinds.
- `pr/checks/rollup.ts:39` `rollupToChecks` — dedupe already treats a zero-time queued re-run as newest; `Check.completedAt` is set only for real times (`timestamps`, rollup.ts:68).
- `pr/gh.ts:18` `PR_FIELDS` lacks `headRefName` (needed for the `--sha` default: HEAD only when this tree's branch is the PR's) and `mergeCommit` (needed for `merged as <sha>`). `gh-records.ts:13` `toPrView` maps them.
- `ghClient` has a 30-call budget and passes no timeout: a 25-min wait at 30 s polls 50×. Wait reads with its own `runner.run(["gh","pr","view",n,…], { timeoutMs: GH_TIMEOUT_MS })` (`pr/gh-lists.ts:5`), parsed by `toPrView`; target resolution still goes through `resolvePr` (`pr/resolve.ts:35`).
- `pr/babysit/log.ts` — `appendEvent`/`readEvents`; `EVENT_KINDS` has no `conflicting` kind.
- `commands/pr.ts` ACTIONS table; verb modules mirror `commands/pr/open.ts` (parseArgs, injected deps with `PollClock`).
- `pr/durations.ts` `clockDuration`, `spanMs` for `failed (9m03s)` / `running: E2E Tests 24m`.

## Reuse
pollUntil, checksVerdict/externalMatcher, rollupToChecks, toPrView, resolvePr, log append/read, stateDir, loadSettings, durations, fakeClock, sequencedRunner, prView/check factories, rollup fixtures (queued-rerun, all-skipped, vercel-pending).

## Testing issues
- Sync `Runner` (not AsyncRunner): `sequencedRunner` is sync and every pr/ module takes `Runner`; `systemRunner` honours `timeoutMs`. One process, nothing else runs during the wait, so blocking spawn is fine.
- Pure `waitStep` separate from the loop shell; time only via `fakeClock`, `now` injected.
- Log dir needs a git common dir: shell tests use `createTree` + a runner routing git to a real repo (`routeGh`) or stub `git rev-parse` replies.
- No file near 250 lines on the path (largest touched: rollup 95, log 111).
