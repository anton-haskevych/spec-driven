# Phase 1 preflight — whole-spec needs

*Immutable. phase-preflight over the phase entry + recon note; files read: `ready/refs.ts`, `graph/nodes.ts`,
`graph/neighborhood.ts`, `doctor/phase-edges.ts`, `tests/ready.test.ts`.*

## Findings that change the plan

1. `isFinished` (`graph/nodes.ts:60-63`) also returns true when every phase is ticked. Using it as the branch
   condition would give an all-ticked-but-undeployed spec `deployed: true` under `needs-deployed`. Branch on
   `phases.length === 0 || hasFinishedStatus(node)` and keep the phase expansion otherwise (plan already says
   extract `hasFinishedStatus`; this is why).
2. `same-files-as` also resolves through `resolvePhaseRef` (`doctor/phase-edges.ts:17-21`) but is compared by
   local id in `ready-set.ts:65`. After the change, `same-files-as: [some-prep-spec]` stops erroring. Out of
   scope (not made meaningfully worse; cross-spec same-files was never supported) — no action.

## Clean Code / SOLID / Clean Architecture / DDD against Phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Single source of truth | Bites | One "finished status" test (`hasFinishedStatus`) used by `isFinished` and `resolvePhaseRef` |
| Small functions | Bites | Whole-spec mark built in a named helper (`wholeSpecMark`) so `resolvePhaseRef` stays one level |
| OCP / LSP / ISP / DIP | Inert | — |
| Dependency direction | Inert | `ready/` already imports `graph/` (`refs.ts:2-3`) |
| DDD | Inert | Tooling, no domain model |

## Amendments

1. Export `hasFinishedStatus(node)` from `graph/nodes.ts`; `isFinished` calls it.
2. In `refs.ts`, no-`#` ref to a spec with no phases or a finished status → one mark labelled `<spec>`,
   `done = deployed = isFinished(node)`.
3. Tests: phase-less prep spec (waits, no doctor issue); done-status with unticked phase (met); `needs-deployed`
   on an all-ticked, undeployed spec with phases still waits.

## Decisions for you

None.
