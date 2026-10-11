# Phase 6 recon — failure facts, saved logs, pr rerun, gates.ci-triage

Paths under `skills/spec/tools/`. Read directly (seam named by the phase entry; one pass).

## Seam

- `pr/report.ts:32-62` `buildReport` → `failedCheck` per `summary.failing` (bucket `fail` only); `jobTail` downloads the log via `gh.jobLog` for the first `TAILS_SHOWN` (3) failures, keeps 30 lines, discards the rest. Cancelled rows get no facts.
- `pr/check-table.ts:22-54` renders `failed` rows (`failedRow`, `mainLine`) and `cancelled` rows separately (`inBucket("cancel")`, line 28). `mainLine` prints `last ran MM-DD (run N) → failure — main fails too`; design wants `fails on main too: yes|no`.
- `pr/gh.ts:8-50` `GhClient`: `runJobs` (`gh run view --json jobs`, cached) has no `status`/`attempt`/run `conclusion`. `RUN_FIELDS` is main's `run list` only.
- `pr/gh-records.ts:37-45` `toJobs` mapper; jobs carry lowercase `conclusion`.
- `pr/actions/gh-writes.ts:25-69` `GhWrites` — exit-code-aware, own budget; rerun joins as `rerunJob`.
- `pr/babysit/log.ts:41-46` `babysitLogger(git, now)`; `rerun` is already an `EventKind`. `core/git.ts:48` `stateDir(git, ...segments)` → `<common>/spec-board/...`.
- `commands/pr.ts:12-18` `ACTIONS`; `commands/pr/status.ts` builds the report.
- `playbook/settings.ts:16,26-30,54-58,64-75`; `doctor/settings.ts:20-22`; `commands/context.ts:101` (pack line via `describeSettings`).

## Reuse

- Rollup dedupe already puts a queued re-run ahead of the old failure (`pr/checks/rollup.ts:48-51`), so `pr rerun` and `pr status` never see the stale row as failing.
- `babysitLogger` for the `rerun` event; `pr wait --since` already keys on the last `rerun` event.
- `resolvePr` for the target; `externalMatcher` to skip external rows.
- `sequencedRunner`/`stubRunner` (`tests/stub-runner.ts`), `prView`/`check` factories (`tests/pr-factories.ts`), fixtures `gh-run-jobs.json`, `gh-job-log.txt`.

## Testing-issue estimate

- Triage is pure over (job id, run detail, log text): table tests, no I/O.
- Log saving touches the filesystem: test against a temp dir; inject the dir, not `stateDir`.
- `buildReport` gains an injected job-log reader so report tests stay runner-only.
- New fixtures: run detail with `status/conclusion/attempt/jobs` (completed, in progress, attempt 3, fail-fast sibling), a cancelled-by-timeout job log, a runner-lost log.
- Sizes fine: report 62, check-table 86, gh-writes 90, settings 124 lines.
- `pr-main-compare.test.ts` and `pr-ready-race.test.ts` hand-build `GhClient`s: a new `run` method needs adding to the main-compare fake (ready-race uses `Pick`).
