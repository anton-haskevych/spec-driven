# Phase 2 preflight — chunk 2 (evidence, deployed, mode files)

## Findings that change the plan

1. **"Insert immediately after the pointer" is ambiguous in raw text.** The reader's "after the pointer" is AST text (`core/progress.ts:24`), where backticks are gone. In raw text, inserting between `.md` and the closing backtick would put the marker *inside* the code span, and the AST would render it as part of the pointer span. So we insert after the closing backtick when the pointer is backticked.
2. **The phase lookup is now used twice.** `planTick` (`phases/tick.ts:29-33`) and `planDeployed` both resolve `<phase>` to a `PhaseState`. Extract `phases/find-phase.ts` with its own test (principles §9).
3. **`--date` needs the calendar check.** Export `isCalendarDay` from `core/schedule.ts:31` rather than writing a second date regex.

## Canon

| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | `planDeployed` builds the plan; `commands/phase.ts` parses flags and renders output |
| OCP | Bites | `deployed` joins the `ACTIONS` table in `commands/phase.ts`; no dispatch edits |
| Errors as values | Bites | Unticked → `invalid`; already deployed → `unchanged` with a reason |
| DDD | Skipped | Tooling |

## Amendments

1. Extract `findPhase(state, raw)` → `PhaseState | string` (the reason) before writing deployed.
2. Insert at the end of the pointer token, including a closing backtick when present.
3. Mode files: every `phase tick`/`phase deployed` call keeps a no-Bun fallback clause ("without Bun, edit the box by hand").

## Decisions for you

None.
