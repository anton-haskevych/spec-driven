# Phase 3 preflight — mode-on chunk

Plan: deliverable 2 without the `crew start --spec` wiring, the writer invariants of deliverable 4, placement's base.
Recon: `2026-11-17-mode-on-recon.md`. T = `skills/spec/tools`.

## Findings that change the plan

1. **Phase 3 silently depends on Phase 1.** Its entry says `needs: [2]`, but `crew start --spec` and `crew/scope.ts`
   are Phase 1's (`T/commands/crew/overseer.ts:81-97` parses only `--workers`/`--babysitters`). Build the mode as a
   self-contained `startSpecBranch(...)` that Phase 1's `--spec` calls with one line; do the crew wiring (start,
   scope skip, `groupKey`) last, after Phase 1 lands.
2. **"Registered like `FIELD_COMMAND`" contradicts "never queued".** Anything in `PLAN_RUNNERS`
   (`T/plan/intents.ts:15-25`) is replayable from the outbox (`T/record/outbox.ts:40-48`). `specBranchPlan` is a
   `RecordPlan` shaped like `fieldPlan` (`T/plan/ops/field.ts:19-29`) but is **not** registered; it lands through
   `writeRecord` + `stampedBy` like `landNow` (`T/commands/card/land.ts:18-40`).
3. **Checks 2–3 and the writer invariants are one rule.** `specPlanProblems` (`T/plan/docs/spec-plan.ts:10-20`) gets
   the whole `SpecDoc`, and `planChangePlan` already refuses only *introduced* problems
   (`T/plan/ops/change.ts:43`). So one `specBranchProblems(spec, phases)` serves start check 2–3, the re-check at the
   tip inside `specBranchPlan`, and every `phase add|set|split|move` in the mode. No per-op code in `set.ts`/`add.ts`.
4. **"Freeze ship-alone membership" has no write path to guard.** Only `specBranchPlan` writes `shipAlone`, and only
   while the mode is off (a re-run is a takeover, `unchanged`). What a plan op *can* change is which phases ship
   alone: `phase set --pr` moving a phase into or out of a ship-alone group. That transition check is diff-shaped
   (before vs after), so it sits beside the problem check in `planChangePlan`, not in `specPlanProblems`.
5. **`cutFrom` already exists as a value.** `boardBase` (`T/plan/board-base.ts:13-22`) pins `origin/<default>` and
   checks `board.record`/`docs: main`; its `tip` is `cutFrom`. No second fetch.

## Pass A — Clean Code
| Rule | Verdict | Consequence |
|---|---|---|
| Small functions, one thing | Bites | `startSpecBranch` composes: `boardBase` → `specBranchRefusal` → `writeRecord(specBranchPlan)` → `cutSpecBranch`; each its own function |
| No flag arguments | Bites | takeover is read from the record (`specBranch` present), never a `--takeover` flag |
| Errors as values | Bites | every step returns `Result`/`StoreWrite`; the command maps to one `crew start:` line |
| Comments | Inert | — |

## Pass B — Clean Architecture
| Rule | Verdict | Consequence |
|---|---|---|
| Dependency rule | Bites | `plan/` stays crew-agnostic: `specBranchProblems` lives in `plan/docs/`, the start refusal in `crew/` imports it |
| Humble object | Bites | branch discovery (`ls-remote`, `for-each-ref`, worktrees) is a thin impure gatherer feeding the pure refusal |

## Pass C — SOLID
| Rule | Verdict | Consequence |
|---|---|---|
| SRP | Bites | refusal (start-only: record joined, numbered `default` doc, old branches) vs invariant (layout, any writer) are separate functions |
| DIP | Bites | placement gets the base through `PlacementDeps.addTree(name, base, world)`; `place.ts` never calls git |
| OCP, LSP, ISP | Inert | — |

## Pass D — DDD
| Rule | Verdict | Consequence |
|---|---|---|
| Invariant owner | Bites | the layout invariant is the spec document's (`specBranch` + phases): one aggregate, checked in its plan, not in the crew |
| Ubiquitous language | Bites | code says *group*, prose says *lane*; messages say `PR group` like `pickGroup` |

## Stage 3 — guards
`planChangePlan`'s introduced-problems diff can observe the new kinds: verified it compares full problem strings
(`change.ts:105-108`). The real-git allowlist guard is full (cap 74): no new git test in this chunk.

## Stage 4 — seam
`change.ts` 113 lines (+~6), `spec-plan.ts` 52 (+1 import line), new files small. `place-system.ts` 79. No splits.
Missing fixture: none; `specDoc({ specBranch })` and `phaseDoc` exist (`T/tests/record-factories.ts`).

## Amendments
1. New `T/plan/docs/spec-branch-rules.ts`: `specBranchProblems(spec, phases)` (ungrouped open code phase; ship-alone
   phase needing an *open* phase of another group, via `needs` or `needs-deployed`) and `shipAloneMoves(spec, before,
   after)`. `specPlanProblems` appends the first; `planChangePlan` refuses the second.
2. `T/plan/ops/spec-branch.ts`: `specBranchPlan({ spec, cutFrom, shipAlone })`, unregistered; at the tip: mode on →
   `unchanged`; unknown ship-alone group, `specBranchProblems`, numbered `default` doc → refused; else update
   `specBranch` + create the `default` doc when absent.
3. `T/crew/spec-branch-start.ts`: pure `specBranchRefusal`, impure `existingSpecBranches(git, spec)` and
   `cutSpecBranch(git, spec, cutFrom)`; `T/commands/crew/spec-branch.ts`: `startSpecBranch(projectDir, deps, spec,
   shipAlone)` → one line, for Phase 1's `--spec`.
4. Placement: `PlaceWorld.layout` from `specLayout(base state, nodes.get(spec)?.specBranch)`; pure
   `groupBase(layout, group, defaultBranch)`; `PlacementDeps.addTree(name, base, world)`.

## Defaults applied
- A ship-alone group may not need an **open** phase of another group, through `needs` **or** `needs-deployed`
  (a done phase from before the mode is already on main).
- Ship-alone freeze = no writer rewrites `shipAlone` + plan ops refuse moving a phase into or out of a ship-alone
  group in the mode (all ship-alone groups, since the record can't see whether a branch is cut).
- `specBranchPlan` refuses a ship-alone name that is not a PR group of the spec.
- A create-only cut refused at takeover reads as "already there", not an error.

## Forks for you
None.
