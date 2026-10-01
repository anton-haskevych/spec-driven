---
kind: principle
applies-to: [phase 2+]
created: 2026-09-30T15:16:12-07:00
---

# Spec-file writers build a whole EditPlan, validate it, then apply it in one place

`phase tick` writes the entry and progress.md; `phase split` renames and writes several files; `lessons add` writes an entry and two INDEX files. A single-file `updated|unchanged|invalid` result lets a failure halfway leave files out of step — the drift these tools exist to remove.

Rules:
- Writers are pure and return `EditPlan = {kind:"ok", edits, renames?} | {kind:"unchanged"} | {kind:"invalid", reason}` covering **every** file they change.
- Before returning `ok`, run the existing checkers on the planned text (`checkPhases`, `taskPhaseIssues`, `checkProjectLesson`, `checkLedgerIndex`). Tool writes don't pass through the Write/Edit hook, so this is their only validation.
- `core/apply-edits.ts` is the only code that touches disk (renames, then writes).
- Shared text patterns live in `core/` (`checkbox.ts`, `progress.ts`, `ledger-index.ts`); writers never import from `doctor/`.
- Every writer test ends with a `loadSpecState` round-trip.
