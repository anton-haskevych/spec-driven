# Phase 6 — PR status recon

Inline wave against live, read-only `gh` 2.93.0 output from CRM-Dance/crm (PRs 871, 874, 875; run 36796809320; job 110162211428), plus the tools tree.

## Seam

- **New:** `tools/pr/` (no such folder yet), `commands/pr-status.ts`, a `pr-status` row in `COMMANDS` (`spec.ts:21-32`; `commands-table.test.ts` pins usage-starts-with-name).
- **Reuse:** `Runner`/`systemRunner`/`defaultBranch` (`core/run.ts`), `stubRunner` keyed by argv prefix (`tests/stub-runner.ts`), `loadSettings(...).checks.external` (`playbook/settings.ts`), `findSpecs` (`core/spec-folders.ts`), `parseArgs` idiom (`commands/gates.ts:43-49`), `tests/tree.ts` for the spec-links case. `tests/fixtures/` exists and is empty.
- **Prose:** execute.md §10 (PR gate), SKILL.md *Tools* (*Remote* bullet).

## What the live data says (vs the plan)

1. **The raw job-log tail is cleanup noise.** The jobs-API log for a failed job ends with ~130 lines of post-job steps (`Post job cleanup.`, checkout post step, runner hook). The failure sits just before the first `##[error]Process completed with exit code 1.` (line 21230 of 21362), followed by `##[group]Run actions/upload-artifact`. Tail rule: end at the first `##[error]` line, inclusive; no `##[error]` → last lines of the log. Line 1 starts with a BOM; every line has `<ISO>Z ` (7-digit fraction).
2. **Map run → workflow by id, not name.** CRM has two workflows named "E2E Tests" (`e2e-fargate.yml`, `e2e.yml`), so `gh workflow list` name→file is ambiguous. `gh run view <run> --json workflowDatabaseId` gives the id, and `gh run list --workflow <id>` accepts it. No `gh workflow list` call.
3. **Job id is in the check link for Actions jobs:** `…/actions/runs/<run>/job/<job>`. Check runs posted by reporter actions link as `…/runs/<checkRunId>` (e.g. "Backend Test Results") — no job, name only. Vercel links are `vercel.com/…`, `workflow: ""`.
4. **`gh pr checks --json` exited 0** with failures present on 2.93.0 (the wave-2 note says 1). Treat stdout as data whatever the code; only empty/invalid JSON is an error.
5. **`mergeable` is UNKNOWN** on all three PRs, open and merged alike. One re-poll, as planned; merged/closed PRs need none (state wins).
6. **Main walk-back, real example:** ci.yml on main: run 36715144973 (success, job "Backend Tests" skipped) → 36715049457 (cancelled) → 36379694472 (job failed, 09-28). One `run list` per workflow, one `run view --json jobs` per main run; cache both across failed jobs.
7. **Spec links** in CRM `pr-opening.md` are written `PR #779`; accept `/pull/<n>` URLs too.

## Testing-issue estimate

- All gh access goes through `Runner`; `stubRunner` covers it. Fixtures: trimmed real JSON (`checks`, `pr view`, `run view` jobs, `run list`) and a ~40-line log sample built from the shape above (BOM, ISO prefixes, ANSI, `##[error]`, cleanup lines) — not a raw 21k-line log.
- `stubRunner` matches by prefix and returns the first match: re-poll of `pr view` needs a sequence. Add a small queued variant in the test, or key the second call by a different argv (it is the same argv) → test-local sequencing runner.
- Pure modules (`checks`, `log-tail`, `render`) take no runner. `main-compare` takes a gh-call function + budget, not a raw runner, so the cap is testable without argv matching.
- Size: orchestration (resolve PR → view → checks → per-job log + main) must not land in `commands/pr-status.ts` past 50-line functions; give it `pr/report.ts`.
