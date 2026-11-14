# Phase 12 preflight — record export keeps labels in place

## Findings that change the plan

1. The guidance's "the default branch's frozen `progress.md`" stops holding the list once `join --tidy` runs:
   `plan/banner.ts:29` `progressStub` keeps title, banner and read line only. The labels (and the CRM spec's
   success metrics and thin-index note) survive only in the default branch's history. Read the newest version
   in history that still has phase lines.
2. `plan/export.ts:39-50` removes phase lines and re-inserts the whole list under the heading: the label loss is
   a positional rewrite, not a missing field. Rewriting each line in place by pointer (`PHASE_POINTER`,
   `core/progress.ts:22` = `PhaseDoc.file`) fixes the untidied case with no record change.
3. `commands/record-export.ts` has no test. The history read goes in its own module with a `repoWithOrigin`
   test (`tests/git-repo.ts:80`, `isolatedRunner`), keeping the command thin.

## Canon
| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions / small functions | Bites | `progressText` stays pure; the base choice (`hasPhaseLines`) is pure; git only in the reader |
| SRP | Bites | history read is git I/O: `plan/frozen-progress.ts`, not in `export.ts` |
| Size caps | Inert | export.ts 68 lines, test 76 |
| DIP / DDD | Inert | |

## Amendments
1. `planExport(plan, files, unjoin, frozen?)`: base is the tree's `progress.md` when it has phase lines, else `frozen`.
2. In place: each file phase line → its record line; record phases absent from the file follow their record
   predecessor (leading ones go before the first); file phase lines not on the record are dropped.

## Defaults applied
- History walk is capped at the last 50 commits touching the file on `origin/<default>`.
- Offline or no history: export falls back to today's behavior (list under `## Phases`).

## Forks for you
None.
