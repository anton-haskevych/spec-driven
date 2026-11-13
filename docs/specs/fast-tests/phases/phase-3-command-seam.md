---
needs: [2]
pr: A
---

# Phase 3 — Command tests can take the fakes

**Goal:** every command whose tests use real git today can be handed the fakes through its deps, reads and writes
together, with production behaviour unchanged.

**Outcome:** nothing changes for anyone using the plugin; tests can now cover commands without real repos · a day ·
medium risk: touches every record-writing command, guarded by the existing (still real-git) tests passing unchanged.

**Files to touch:**
- `skills/spec/tools/plan/record-access.ts` (new), `plan/record-send.ts`, `plan/read-plans.ts`, `plan/board-base.ts`, `plan/phase-writer.ts`
- `skills/spec/tools/commands/plan.ts`, `session.ts`, `card/land.ts`, `join.ts`, `join-from-tree.ts`, `record-export.ts`, `record.ts`, `claim.ts`, `board.ts`, `join-tidy.ts`
- `skills/spec/tools/board/load.ts`, `claims/held.ts`
- `skills/spec/tools/core/land-spec-field.ts`, `phases/deployed-land.ts`, `focus/land.ts`, `plan/land-banner.ts`, `pr/actions/merge.ts`
- `skills/spec/tools/tests/command-deps.ts`, `git-stub.ts` (new), `record-factories.ts`, `tree.ts`, `joined-repo.ts`, `record-access.test.ts` (new)

## Implementation guidance

`technical.md` §4–5 hold the contracts. Pure refactor: optional deps fields defaulted to today's code, so every
existing test passes unchanged — that is the safety net. Order: `recordAccess` (unit-tested on fakes for its three
kinds), then route each command through it one at a time, then the read pass-through, then `boardBase`, `land` and
`remote`. Each command keeps its exact refusal line.

Test helpers last: `joinedDocs` first and switch `joinedRepo` to it (one seed source), then `gitStub` (exact argv,
throws on anything else) and the `command-deps.ts` builders. Prove the builders with one migrated test per kind
(a record write, a land, a claim) — the bulk moves in phases 4–8.

## Deliverables

- [ ] `recordAccess` (ready / no-default-branch / no-origin) with unit tests on fakes; `recordWorld` built on it
- [ ] Route plan, session, card/land, join, join-from-tree, record-export, record through `recordAccess`; existing tests unchanged and green
- [ ] Optional `read` through `readPlans`/`readPlansAt`/`readLocalPlans`/`plansOnDemandAt`; `board/load.ts:134` writes through injected ports
- [ ] Optional `boardBase` and `land` deps fields on their callers
- [ ] Optional `remote` on claim and board deps; `remoteHeldClaims` takes a `RemotePort`
- [ ] `joinedDocs` (+ `joinedRepo` uses it), `joinedFiles`, `withSettings`, `git-stub.ts`, `command-deps.ts`; one test each for a record write, a land and a claim running with no real git

## Phase-local notes

- Split brain is the failure mode: a command test on fakes must not reach real git anywhere. `gitStub` throwing on
  unknown argv is what catches it.
- `branchPort` stays private: faking it gains nothing while `planAt` still runs `git archive`.
