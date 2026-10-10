# Phase 6 preflight — failure facts, saved logs, pr rerun, gates.ci-triage

Paths under `skills/spec/tools/`. Inputs: phase entry, `2026-10-10-triage-rerun-recon.md`, principles.md.

## Findings that change the plan

1. **The phase note was wrong about `RUN_FIELDS`.** It lists the fields for main's `run list` (`pr/gh.ts:19,47`), which main-compare reads. Rerun and triage need the PR's own run: its `status`, `conclusion`, `attempt` and `jobs`. → Add a new `GhClient.run(runId)` and leave `RUN_FIELDS` alone. (The phase entry is already corrected.)
2. **Cancelled rows get no failure facts today.** `failing` is only the `fail` bucket (`pr/checks/checks.ts:23`, `pr/report.ts:38`), and cancelled rows are rendered separately (`pr/check-table.ts:28`). But rerun needs triage on cancelled rows. → The report covers both the `fail` and `cancel` buckets, and the table renders both from the report, labelled by bucket.
3. **Downloads are capped at 3** (`pr/report.ts:38,58-62`). Saving every log spends one gh call per failure out of a budget of 30 (`pr/gh.ts:17`). Main-compare reads are cached per run and per workflow (`pr/gh.ts:43-47`), so ≤8 failures fit. Past that, a fact reads `unavailable (gh call budget …)`. That's acceptable; no new budget.
4. **Several infra jobs in one run can't each be re-run with `--job`.** After the first, the run is in progress, and GitHub refuses the next (`ledger/gotcha-rerun-leaves-a-stale-failed-row.md`). → One write per run: `--job <id>` for a single job, `--failed` for several. This is safe because the command refuses if any non-external row is a test failure (all-or-nothing).
5. **`compareOnMain` takes the whole `GhClient`** (`pr/failures/main-compare.ts:11`), so adding a method grows the hand-built fake in `tests/pr-main-compare.test.ts:13-22`. → Triage and rerun take `Pick<GhClient, "run">` (the idiom from `pr/actions/ready-race.ts:7`). Add `run: unused` to the main-compare fake.

## Clean Code against phase 6

| Rule | Verdict | Consequence |
|---|---|---|
| Functions do one thing | Bites | `infraFact` is pure over `(jobId, RunDetail, log)`. Download and save stay in `job-logs.ts`. |
| No flag arguments | Bites | Drop the `withTail` boolean in `failedCheck` (`pr/report.ts:49`). The log is always read; only the render limits tails to `TAILS_SHOWN`. |
| Errors are values | Bites | The log reader returns `Result<SavedLog>`. A failed write still returns the text, just without a path. |
| Names | Bites | Rename `mainLine` output to `fails on main too: yes/no/unknown`, matching design.md. |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule / humble object | Bites | `buildReport` gets a `JobLogs` reader injected (`ReportOptions`). Only `commands/pr/status.ts` and `pr/actions/rerun.ts` build the fs-backed one, so report tests stay runner-only. |
| Component cohesion | Inert | Everything stays under `pr/failures/` and `pr/actions/`, as technical.md's file tree says. |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | `triage.ts` is about classification, owned by the babysit procedure. `job-logs.ts` is about storage. Keep them apart. |
| OCP | Bites | Signatures go in one constant list `[text, reason]`. The next signature is a one-line add. |
| ISP | Bites | Finding 5: `Pick<GhClient, "run">`. |
| DIP | Bites | Finding above: inject the `JobLogs` reader. |
| LSP | Inert | — |

## DDD

| Rule | Verdict | Consequence |
|---|---|---|
| Ubiquitous language | Bites | Use technical.md's words: `infra`, `failsOnMain`, `tail`, `rerun`. Rerun's result line starts `Rerun:`; refusals start `pr rerun:`. |
| Invariant ownership | Bites | GitHub enforces the attempt cap through `attempt` (`decision-flaky-tests-strict`). Nothing reads the babysit log for it. |
| Aggregates, events | Inert | — |

## Guard blindness

None claimed. The doctor's missing-gate error covers `gates.ci-triage` once it joins `named` (`doctor/settings.ts:21`).

## Seam / testability deltas

- `SHORT_SHA` is defined twice (`pr/render.ts:6`, `pr/actions/merge.ts:36`). Rerun imports render's. Out of scope.
- Log files are tested in a temp dir; inject the dir, never `stateDir`.

## Amendments

1. Add `GhClient.run(runId)` → `RunDetail { status, conclusion, attempt, jobs }` from one `gh run view --json status,conclusion,attempt,jobs` call, cached per client.
2. The report covers `fail` and `cancel` rows. The table renders both from `report.failures`.
3. The `withTail` flag goes: the log is always read through the injected reader, and the render shows tails for the first `TAILS_SHOWN` only.
4. Rerun makes one write per run (`--job` or `--failed`), and refuses everything if any counted row isn't infra.
5. Triage and rerun take `Pick<GhClient, "run">`.

## Decisions for you

None.
