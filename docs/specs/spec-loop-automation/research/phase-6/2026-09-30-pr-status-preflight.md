# Phase 6 — PR status preflight

Inputs: phase entry, `technical.md` → *pr-status*, recon `2026-09-30-pr-status-recon.md`, `principles.md`. Pass D (DDD) skipped: a CLI adapter over gh, no domain model.

## Findings that change the plan

1. **"Last 30 lines" of the jobs-API log shows cleanup, not the failure** (`technical.md` *pr-status* step 5; phase entry *Failed-job logs*). Live log for job 110162211428: failure output ends at line 21230 `##[error]Process completed with exit code 1.`, then 132 lines of post steps. The tail must end at the first `##[error]` line.
2. **`gh workflow list` name→file mapping is ambiguous** (`technical.md` step 6). CRM has two workflows named "E2E Tests". `gh run view <run> --json workflowDatabaseId` + `gh run list --workflow <id>` is exact and saves a call.
3. **`gh pr checks --json` exit code is not a failure signal** (exit 0 with failures on gh 2.93.0; wave 2 saw 1). Parse stdout whatever the code; only unparsable output is an error.
4. **The plan's four modules leave orchestration nowhere.** `commands/` are thin adapters (`technical.md` *Conventions*), and resolve → view (+ re-poll) → checks → per-job log + main walk-back is well over one 50-line function. Add `pr/gh.ts` (runner-backed fetchers that parse gh JSON once at the edge and count calls against the 30-call budget) and `pr/report.ts` (orchestration).

## Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| Functions do one thing | Bites | `pr/checks.ts` splits `summarizeChecks` (counts + failing list) from `prState` (precedence); `log-tail.ts` is one pure `failureTail(raw)`. |
| Boundaries: wrap third-party | Bites | gh is the boundary: only `pr/gh.ts` calls `runner.run(["gh", …])`; the rest sees typed records (`PrView`, `Check`, `RunJob`, `MainRun`). |
| Errors are values | Bites | gh failures become a reason string in the report (`checks: unavailable (<stderr first line>)`), never a throw; command always exits 0 (`spec.ts:56-60` already prints any throw). |
| Tests F.I.R.S.T | Bites | No live gh in tests; fixtures in `tests/fixtures/gh-*.json`, trimmed from captured output. |

## Clean Architecture

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `checks`, `log-tail`, `render` import nothing from `core/run.ts`; `main-compare` takes a `GhClient`-shaped dependency, not a raw `Runner`. |
| Humble object | Bites | `pr/gh.ts` is the humble edge: argv + JSON parse only, no decisions. |

## SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | Actors: GitHub's data shape (`gh.ts`), our state policy (`checks.ts`), the reader's output format (`render.ts`). |
| OCP | Bites | Next variant: phase 7/10 adding fields to the header (e.g. `behind main`). Render takes one `PrReport` record. |
| DIP | Bites | `report.ts` depends on a `GhClient` interface built from a `Runner`; tests pass a stub runner. |
| LSP, ISP | Inert | — |

## Seam and testability (deltas from recon)

- `stubRunner` returns the first prefix match, so the `mergeable` re-poll (same argv twice) needs a test-local sequenced runner. Small; stays in the test file.
- The budget is a counter inside the `GhClient`; tests assert it with `calls.length`.

## Amendments

1. Tail: from the log's first `##[error]` line back 30 lines (inclusive); no marker → last 30 lines. Strip BOM, ANSI, `<ISO>Z `.
2. Main comparison: workflow id from `gh run view <run> --json workflowDatabaseId` (once per run, cached); `gh run list --branch <default> --workflow <id> --limit 15`; `gh run view <main run> --json jobs` cached per run.
3. Add `pr/gh.ts` and `pr/report.ts`; `commands/pr-status.ts` only parses args and resolves the PR.
4. `unknown` outranks only `green`: with `mergeable` still UNKNOWN after the re-poll and no failing or pending checks, state is `unknown`.
5. Correct `technical.md` steps 5–6 and the phase entry to match 1–2.

## Decisions for you

None.
