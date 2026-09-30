# Phase 1 preflight — chunk: comparePhaseIds + SKILL.md parse prose

Inputs: phase entry deliverables 6–7, `research/phase-1/2026-09-30-compare-ids-recon.md`, `principles.md`. Small chunk; self-scaled.

## Findings that change the plan

1. **"`comparePhaseIds` replaces `numericPart` in relations" would change range membership.** `graph/relations.ts:46-49` includes `5a` in `4-5` because it compares only the numeric part; a total order puts `5a` after `5` and drops it. Keep one total order (`comparePhaseIds`) for `[phase N+]` and add `phaseInRange(id, from, to)` beside it: lower bound by the total order, upper bound by numeric parts only, so letter phases of the upper bound stay in and dotted inserts after it stay out (today's documented behaviour, SKILL.md *Relations*: "`4-5`, which includes `4a`").
2. **Non-numeric ids exist.** `parsePhaseTitle` keeps any token (`core/phase-title.ts:6,13`), e.g. `Phase A —`. Both functions return `undefined`/`false` for ids without a leading number — same as `numericPart` today — and callers keep treating that as "no match".
3. **SKILL.md's execute-only exception is now wrong.** `SKILL.md:49` limits chunk references to `execute`; `context/request.ts` applies them to every sub-command and lets an existing spec name win. The prose must say that, or no-Bun sessions parse differently from the tool (ledger `decision-parse-prose-stays-as-fallback.md`).

## Clean Code

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names | Bites | `comparePhaseIds`, `phaseInRange`; `numericPart` deleted, not kept as an alias |
| Small functions / no flags | Bites | No `{ lettersInUpperBound: true }` option — two functions |
| Errors | Bites | Unparseable ids → `undefined` / `false`, never throw |
| Comments | Inert | — |

## Clean Architecture / SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | Id ordering lives only in `core/phase-title.ts`; `relations.ts` stops calling `Number()` on bounds |
| OCP / LSP / ISP / DIP | Inert | — |

## DDD

Skipped — no domain model.

## Seam and testability (deltas)

None beyond recon.

## Amendments

1. `core/phase-title.ts`: `comparePhaseIds(a, b): number | undefined` (dotted parts numerically, then letter suffix by length then alphabet, then the rest) and `phaseInRange(id, from, to): boolean`; delete `numericPart`.
2. `ledger-scope.ts` `phaseMatches` open-ended → `comparePhaseIds(from, current) <= 0`; `relations.ts` range → `phaseInRange`.
3. Tests: `tests/phase-title.test.ts` (ordering, `9.10 > 9.9`, `7 < 7a < 7b < 8`, range membership incl. `5a` in / `5.5` out, non-numeric); one `[phase 7b+]` row test in `context.test.ts` and one `9.9-9.10` ref test in `graph.test.ts`.
4. SKILL.md prose: chunk references for every sub-command, whole-token rule, existing-spec-wins, pack `spec=` wins; `:74` names-or-changed-paths wording.

## Decisions for you

None.
