# Phase 1 preflight — one green verdict (after review 634db36)

*Source of record — do not edit.* Inputs: phase-1 entry as reviewed, `2026-10-10-verdict-recon.md`
(seam still holds; its `gh pr checks` reuse notes are superseded by the rollup source), `principles.md`.
Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **Probe settled without a push.** CRM #921 / #919 docs-only heads got `pull_request` checks
   (`ledger/domain-docs-only-head-gets-checks.md`). The conditional `checked-head.ts` deliverable is dropped.
2. **The report needs the check list, not only counts.** The grouped table (running with elapsed, passed
   with durations) needs every `Check`; `CheckSummary` (`pr/checks.ts:3-7`) has counts + failing only. Keep
   `summarizeChecks` as the one place that applies `checks.external` (`pr/checks.ts:14-15`) and have it carry
   `verdict` too, so report and board (`pr/rollup.ts:59`) read one object; `PrReport` keeps `checks`.
3. **The rollup rides on `prView`.** `resolvePr` (`pr/resolve.ts:36-44`) and `settledView`
   (`pr/report.ts:45-50`) already call `gh pr view`; adding `statusCheckRollup` to `PR_FIELDS`
   (`pr/gh.ts:18`) and `checks` to `PrView` makes the source switch zero extra calls. `prChecks` and
   `toChecks`/`toBucket` (`pr/gh-records.ts:27-35,61`) go.
4. **Elapsed time needs a clock.** "running 7m12s" depends on now; `renderReport` takes `now: Date`
   (house idiom: `commands/board.ts` passes `now`).
5. **`gh-lists.ts` stays at the top** — it lists PRs, not only checks (technical.md says so).

## Clean Code

| Rule | Verdict | Consequence |
|---|---|---|
| One word per concept | Bites | design's words: queued, running, passed, failed, cancelled, skipped; buckets stay gh's (`pass`, `fail`, `queued`, `running`, `skipping`, `cancel`) only inside the model |
| Small functions / files | Bites | table rendering in `pr/check-table.ts`; `pr/render.ts` keeps header, verdict line, failures |
| Exhaustive | Bites | `checksVerdict` switch-free precedence chain; `PrState` union includes verdict kinds |
| Errors as values | Inert | — |

## Clean Architecture / SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `board/joins.ts` imports `pr/checks/verdict.ts` types only |
| SRP | Bites | one actor decides green: `checksVerdict`; `prState` adds PR-level states; `nextFromChecks` maps kinds |
| ISP | Bites | dropping `GhClient.prChecks` shrinks every fake (`pr-main-compare.test.ts:13-20`) |
| OCP | Bites | phases 3/5 read the same `Verdict` |
| LSP, DIP | Inert | — |

DDD pass skipped (tooling).

## Guard blindness

`commands-table.test.ts:5-13`: `pr` usage must start with `pr`; group usage `pr status [<pr> | <spec>]` passes. `skill-wiring.test.ts` may pin `pr-status` in prose — grep before deleting.

## Seam and testability (deltas)

- `board-joins.test.ts:14` `checks(counts)` builds a summary by counts; with `verdict` on the summary it needs real checks → use `check()` factory + `summarizeChecks`.
- `pr-rollup.test.ts:16-22` pins `checkBucket` against gh's own buckets; with `queued`/`running` replacing `pending`, that oracle maps gh `pending` → either; re-pin as a state table.

## Amendments

1. Drop the checked-head deliverable (probe result).
2. `PrView.checks: Check[]` from `statusCheckRollup`; `PR_FIELDS` + `statusCheckRollup`; `prChecks` removed.
3. `CheckSummary` = `{ counts, external, failing, verdict }`; `summarizeChecks(checks, patterns)` builds the external predicate once and calls `checksVerdict`.
4. `PrCell.verdict?: VerdictKind` (additive, `BOARD_VERSION` stays 1); `nextFromChecks` reads it.
5. `renderReport(report, now)`; table in `pr/check-table.ts`.

## Decisions for you

None.
