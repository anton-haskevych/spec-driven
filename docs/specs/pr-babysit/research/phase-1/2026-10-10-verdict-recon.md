# Phase 1 recon — one green verdict

*Source of record — do not edit.* Paths under `skills/spec/tools/`. Single wave, read directly (seam is ~600 lines).

## Seam

- `pr/types.ts:1-9` — `Bucket` (gh's 5 buckets) + `Check {name,bucket,workflow,link}`; replaced by `CheckStatus`/`CheckRow`.
- `pr/checks.ts:13-20` `summarizeChecks(checks, patterns)` — counts + external glob match (inline `Bun.Glob`); `:22-31` `prState` (cancel ignored, zero checks = green); `:33-36` `actionsJob(link)`.
- `pr/gh-records.ts:27-35` `toChecks` maps `bucket`; `:61` `toBucket` (unknown → pending).
- `pr/rollup.ts:23-28` `checkBucket(state)`; `:37-53` `rollupToChecks` keeps newest per workflow+name by `startedAt`; `:59` `toPrRows` stores `summarizeChecks` on `PrRow.checks`.
- `pr/gh.ts:19` `CHECK_FIELDS = name,state,bucket,workflow,link`. `call` ignores exit code (fine: `gh pr checks` exits 1 on failures, 8 on pending).
- `pr/report.ts:33-43` `buildReport` → `summary.failing` → `failedCheck` (`actionsJob`, `compareOnMain`, tail).
- `pr/render.ts:6-29` header + `state:` + `checks:` count line + `FAIL` blocks.
- `board/joins.ts:46-52` `toPrCell` (failing = fail + cancel), `:72-76` `nextFromChecks` (≥1 pass, no pending, not draft → merge). Consumers: `board/attention.ts:31-36`, `board/cells.ts:71-79`, `board/focus.ts:82`.
- `commands/pr-status.ts:10-20`; `spec.ts:43` `"pr-status"`; group exemplar `commands/phase.ts:14-40`.

## Reuse

- gh `state` already carries the full vocabulary in both sources (`gh-pr-checks.json` has `state`), so one `statusFromState` serves both mappers; the field extraction per source stays separate.
- `actionsJob` → run/job ids for `CheckRow` in both mappers.
- `rollupToChecks`'s newest-per-key walk becomes `latestPerName` (shared by both paths; gh pr checks can return stale draft-era rows).
- `resolvePr`, `compareOnMain`, `failureTail` unchanged.

## Testing-issue estimate

- `sequencedRunner` is local to `tests/pr-report.test.ts:16-27` → promote (needed by code-head tests: several gh calls).
- `PrView` hand-built in 5 tests → `prView()` factory; `Check` literals in `pr-render.test.ts:7`, `pr-report.test.ts:64` → `checkRow()`.
- No fixture has CANCELLED / QUEUED / stale rows / vercel-pending → create the three fixtures in technical.md.
- Code head needs real git (`tests/git-repo.ts` `isolatedRunner`), ~1 s per test → keep pure parts pure.
- No file near 250 lines; `board/model.ts` 156. `pr/render.ts` will roughly double (grouped table) → split the table into `pr/check-table.ts` if it passes ~120.
- Re-pins listed in the phase file; also `pr-rollup.test.ts` (`checkBucket` → status), `pr-gh.test.ts:23` (bucket), `board-joins.test.ts:14` `checks()` helper.
