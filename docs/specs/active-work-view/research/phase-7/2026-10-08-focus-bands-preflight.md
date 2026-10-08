# Phase 7 preflight — focus bands

Inputs: phase entry, `2026-10-08-focus-bands-recon.md`, `principles.md`. `T` = `skills/spec/tools`.

## Findings that change the plan

1. **"Priority (`compareSchedule`'s rank)" is the wrong helper.** `compareSchedule`
   (`T/core/schedule.ts:72-74`) orders priority *then* due; the band's in-band order is due *then*
   priority. Use `priorityRank` (`:68`) for priority and a new exported `compareDue` (the `NO_DUE`
   tail of `compareSchedule`, which then calls it) for due.
2. **The planner no longer needs the whole set.** `land.ts:48` loads every node only to feed
   `rank.ts`. With bands, add/move/drop depend only on the target's own `focus:`, read from the
   `CLAUDE.md` text the planner already receives. Drop `loadNodes` and `focusEntries` from `land.ts`.
3. **Legacy reads two ways, on purpose.** The board reads a number as `should` (`readFocusFields`), but
   the writer must treat it as "not a band" so `add` can overwrite it (phase file). A shared
   `focusBand(value)` (string, case-insensitive → band, else undefined) serves the writer; the reader
   layers the legacy rule on top. `drop` removes any `focus:` key, legacy or malformed, so phase 6 can
   drop a legacy spec without `add` first; `move` refuses a non-band as `not in focus`.
4. **`focusOrder` needs today.** Overdue is per day (`specSummary(node, today)`), and
   `focusOrder(inputs)` (`T/board/focus.ts:35`) has no clock; `buildBoard` (`T/board/lanes.ts:46`)
   holds `now`. Pass it.

## Clean Code / SOLID / Clean Architecture against phase 7

| Rule | Verdict | Consequence |
|---|---|---|
| One word per concept | Bites | `band` everywhere: `FocusRow.band`, `ReadyRow.focusBand`, `FocusLanded.band`; no "tier" |
| Flag arguments | Bites | `commands/focus.ts` drops its `top`/`after` flags; `ACTIONS` keyed by verb with a `takesBand` shape, not booleans threaded through |
| Errors as values | Bites | Severity split: `FocusFields.problems` (errors) + `warnings`; doctor maps each (`T/doctor/spec-meta.ts:21`). The spec-file hook blocks on errors only (`T/hooks/spec-file-check.ts:88`), so a legacy number never blocks a CRM edit |
| SRP / pure | Bites | `plan.ts` stays pure over the `CLAUDE.md` text; `land.ts` keeps the git |
| Single source of truth | Bites | `FOCUS_BANDS` once in `core/spec-meta.ts`; band order = its index |
| No dead code | Bites | delete `focus/rank.ts`, `tests/focus-rank.test.ts`, `RANK_STEP`, `MovePlace`, `FocusPlace` |
| DIP / boundaries | Inert | No new dependency |
| DDD | Skipped | Tooling, no domain model |

## Guard blindness

`board-no-focus-golden.test.ts` must stay untouched: it guards that the no-focus board is unchanged,
and nothing in this phase touches the no-focus path. Not blind.

## Seam and testability (deltas from recon)

None. All units pure or covered by the existing `repoWithOrigin` harness.

## Amendments

1. Export `compareDue` from `schedule.ts`; `compareSchedule` uses it.
2. `planFocus(action, claudeMd)`; `land.ts` stops loading nodes.
3. `focusBand(value)` exported from `core/spec-meta.ts`; `readFocusFields` returns `warnings`.
4. `focusOrder(inputs, today)`.
5. `drop` removes any `focus:` key (documented in `list.md`).

## Decisions for you

None.
