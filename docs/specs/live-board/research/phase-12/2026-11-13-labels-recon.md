# Phase 12 recon — record export keeps labels in place

## Seam
- `skills/spec/tools/plan/export.ts:39` `progressText`: drops every top-level phase line, then writes the whole
  record list right under `## Phases`. Every non-phase line inside the list (`v1:`, `v2:`) is pushed below it.
  This is the 2026-11-12 symptom on `explicit-charge-handling` (untidied `progress.md`: `## Success metrics`,
  `## Phases`, `v1:` + 16 phases, blank, `v2:` + 6 phases; file order is not id order).
- `skills/spec/tools/commands/record-export.ts:27` passes the tree's `progress.md` only.
- A tidied spec (`join --tidy` → `plan/banner.ts:29` `progressStub`) keeps title + banner + read line: the labels,
  the success metrics and the thin-index note are gone from the tree and from the default branch's tip. The only
  copy left is the default branch's history: the version just before the tidy commit.
- Matching a file line to a record phase: `PHASE_POINTER` (`core/progress.ts:22`) gives the pointer, which equals
  `PhaseDoc.file`.

## Reuse
- `isTopLevelItem` (`core/checkbox`), `linesOutsideFences` (`plan/deliverables`), `PHASE_POINTER`, `progressLine`.
- `defaultBranch` (`core/run.ts:97`), `gitAt(...).out` for `git log` / `git show`.

## Testing issues
- `plan-export.test.ts` (76 lines) drives `planExport` purely; add the CRM fixture there.
- The history read is git I/O in the command; keep it a thin `git log` + `git show` loop, choice of version pure
  (`hasPhaseLines`).
