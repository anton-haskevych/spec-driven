---
kind: domain
applies-to: [phase 3, 4]
created: 2026-09-30T16:04:51-07:00
---

# Spec-file writers: the building blocks phase 2 left for add, split and lessons add

Phase 2 shipped the pieces later writers compose. Reuse them rather than growing new ones:

- `phases/find-phase.ts` `findPhase(state, raw)` resolves `2`, `phase 2`, `Phase-2A` to a `PhaseState`, or to the reason string naming the spec's phases.
- `phases/locate.ts`: `locatePhaseLine(progress, pointer)` gives the raw top-level line outside fences. `locateOpenItem(entry, "prefix"|#N)` returns `{line, text}` (markdown-stripped) or an `invalid` listing the candidates.
- `phases/validate.ts` `issuesIntroducedBy(spec, edits)` runs `checkPhases` + `taskPhaseIssues` on the planned text via `readThroughEdits` and returns only *new* issues. Lessons add will need a sibling for `checkProjectLesson`/`checkLedgerIndex`.
- `commands/phase.ts`: `ACTIONS` table (add a row for `add`/`split`), `resolveSpec`, and a generic `parseFlags` over `node:util` `parseArgs` (strict, typed values).
- `EditPlan` `unchanged` carries a `reason` (it's used for "already deployed"), which technical.md's bare `{kind:"unchanged"}` omits.
- Tests: `tests/tree.ts` `createTree().spec(name, files)` writes a default `CLAUDE.md`, because `findSpecs` only sees folders that have one. Each test gets its own tree and `afterEach(tree.cleanup)`.
