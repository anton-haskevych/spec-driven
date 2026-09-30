# Phase 2 recon — chunk 2 (evidence, deployed, mode files)

Paths are relative to `skills/spec/`.

## Seam

- `tools/phases/tick.ts:54-59` already enforces `--evidence` on task phases (`checkEvidence`). What's missing is tests for it.
- `tools/core/progress.ts:10,24-25`: `DEPLOYED_SUFFIX` is tested against the **AST text** after the pointer. In the raw line the pointer is usually in backticks (``→ `phases/x.md` (notes)``), so the raw insert point is after the closing backtick when there is one. The AST drops the backticks, so the reader then sees ` · deployed …` right after the pointer.
- `tools/core/schedule.ts:31`: `isCalendarDay` is private. `--date` validation needs it, so export it.
- `tools/phases/locate.ts:15`: `locatePhaseLine` finds the raw progress line, and the tick flip reuses it.
- Mode prose: `execute.md:97` (§6 step 6), `execute.md:147` (task phases step 3), `update.md:40-49` (§4), `SKILL.md:250` (*Phase edges → Deployed*), and SKILL.md *Tools* (`:84-94`). `README.md:95-103` (tools list).

## Reuse

- `planTick`'s phase lookup (`normalizePhaseHint` + `samePhase`) and the `invalid()` shape. Extract `findPhase` on its second use (deployed).
- `issuesIntroducedBy` validates the deployed plan too.

## Testing-issue estimate

- A trailing-note fixture is required (ledger `gotcha-deployed-marker-goes-after-the-pointer.md`).
- A marker hand-appended at line end is invisible to the reader, so `deployed` inserts a second, visible one. The old text stays. That's acceptable; it isn't worth a cleanup rule.
- No size-cap pressure: `tick.ts` is 72 lines, `commands/phase.ts` is 55.
