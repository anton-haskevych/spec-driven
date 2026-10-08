---
date: 2026-10-07
phase: 1
chunk: groundwork
---

# Phase 1 preflight — groundwork extractions

*Source of record — do not edit.* `T` = `skills/spec/tools`. Self-scaled: refactor-only, every target pure.

## Findings that change the plan

1. **A deploy target key can have no `#`.** `T/ready/refs.ts:30` labels a whole-spec ref with the bare spec
   name, and `T/board/phase-keys.ts:24` keeps it. `attention.ts:73` (`key.split("#")`) yields
   `{ spec, phase: "" }` for it; flight's `splitKey` (`flight.ts:86-89`, `indexOf`) would yield
   `{ spec: key minus last char, phase: key }`. A shared `splitKey` must be `rowKey`'s inverse:
   no `#` → `{ spec: key }` (phase absent). `attention.ts` keeps `phase ?? ""`; flight's keys always carry `#`.
2. **`holderName` has a third caller** (`T/claims/live.ts:28`). Keep `holderName(claim)` as the Claim-shaped
   entry point and make it delegate to `sessionLabel(claim.sessionName, claim.sessionId)`; no caller churn.
3. **The phase file is newer than the execute pack.** The pack still named `graph/progress.ts` /
   `phaseProgress` (pre-review); the phase file and `technical.md` say `specSummary` in `portfolio/rows.ts`.
   Follow the phase file.

## Clean Code / SOLID / Clean Architecture / DDD against phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Names, one word per concept | Bites | `toPrCell` (joins) vs `cells.prCell` — the rename the phase asks for. `sessionLabel` vs `holderName`: same concept over two shapes, finding 2 |
| Functions small / one thing | Bites | `awaitingDeploy` becomes group-by-target over `deployWaits`; no new branch logic |
| Dependency direction | Bites | `sessions/label.ts`, `sessions/by-workspace.ts` import only `workspaces/owner` + types; `core/age.ts` imports nothing; `launch/title.ts` imports `context/request` as `command-line.ts` already does |
| Pure core / IO at edges | Bites | `listRoute(args)` pure; `listCommand` dispatches |
| SRP / OCP / LSP / ISP / DIP | Inert | moves only |
| Pass D (DDD) | Skipped | no domain model change |

## Guard blindness
`board-render.test.ts` / `board-lanes.test.ts:86-98` pin deploy rows for phase keys only; no test covers a
whole-spec `needsDeployed` target, so finding 1 would slip past them. Add a `splitKey` case for a bare key.

## Seam deltas vs recon
None beyond finding 1.

## Amendments
1. `splitKey(key): { spec: string; phase?: string }`, inverse of `rowKey`; test bare key + `#` key.
2. `holderName` delegates to `sessionLabel`; `trees/find.ts` calls `sessionLabel(session.name, session.sessionId)`.

## Decisions for you
None.
