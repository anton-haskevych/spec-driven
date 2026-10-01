# Phase 1 recon — chunk: comparePhaseIds + SKILL.md parse prose

Chunk = deliverables 6–7. Self-scaled: the seam was read directly (both callers, the SKILL.md block and its wiring tests were already mapped in `2026-09-30-runner-recon.md`). Paths relative to `skills/spec/tools/`.

## The seam

- `core/phase-title.ts:17-20` `numericPart` — `Number(/^\d+(\.\d+)?/)`: `9.10` → 9.1 (sorts before `9.9`), `7a`/`7b` → 7 (indistinguishable).
- `context/ledger-scope.ts:55-59` `phaseMatches` — open-ended `[phase N+]` uses `numericPart(from) <= numericPart(current)`, so `[phase 7b+]` also matches `7a`.
- `graph/relations.ts:14,40-50` `phasesInRef` — `RANGE = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/`, bounds via `Number()`, members via `numericPart`. Today's inclusion: `4-5` includes `4a` and `5a` (numeric part 5), excludes `5.5` (5.5 > 5). SKILL.md *Relations* documents "`4-5`, which includes `4a`".
- `SKILL.md:34-49` parse prose; `:74` lifecycle sentence. `skill-wiring.test.ts:88-97` pins only the sub-command set line, the dispatch rows and `argument-hint` — the prose between them is free to change.

## Reuse

- `samePhase` stays for exact matches. The new comparator lives beside it in `core/phase-title.ts`.

## Testing-issue estimate

- `phase-title` has no test file of its own (`parsePhaseTitle` is tested in `context.test.ts:35-43`) → new `tests/phase-title.test.ts`.
- Range semantics must not silently change: keep "letter phases of the upper bound are in range, dotted inserts after it are not" and pin it with a test.
- No size-cap pressure (`phase-title.ts` 24 lines, `relations.ts` ~60, `ledger-scope.ts` ~62).
