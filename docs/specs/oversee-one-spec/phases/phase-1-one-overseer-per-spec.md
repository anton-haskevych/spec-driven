---
needs: []
pr: A
---

# Phase 1 — One overseer per spec

**Goal:** `/spec oversee-crew <spec>` runs a crew on that spec alone, with its own run file, several lanes at once, a machine-wide worker limit, and a notice to any other session that changes its plan.

**Outcome:** You can start one overseer per spec, several at once, each keeping its spec moving one phase at a time without stepping on the others; parallel lanes inside a spec arrive with phase 3 · medium · risk: the whole-board crew changes only by skipping specs that have their own overseer.

**Files to touch:**
- `skills/spec/tools/crew/deps.ts`, `crew/run-state.ts`, `crew/machine.ts` (new), `crew/scope.ts` (new)
- `skills/spec/tools/commands/crew/{overseer,tick,launch,launch-session,check}.ts`
- `skills/spec/tools/commands/phase/context.ts` (the notice; `plan/` stays crew-agnostic)
- `skills/spec/tools/launch/command-line.ts`, `skills/spec/SKILL.md` (dispatch row, `:56`, `:89`, Crew bullet)
- tests: `crew-run-state`, `crew-tick-step`, `crew-overseer`, `crew-run-store` (new), `launch`, phase-writer tests

## Implementation guidance

technical.md → *Phase 1*. Parameterise, don't fork: the run store takes an optional spec, and the tick
scopes its world through pure `scopeWorld` and two new ports (`overseen()`, `machineCount()`). The
whole-board path must stay byte-for-byte the same when `--spec` is absent; the existing crew tests are
the proof. Fold `fillSlots`'s inputs into one object before adding to them.

One worker per spec still holds here: `pickRows` is untouched. Parallel lanes need merge-back and ship
with Phase 3 (`decision-lanes-ship-with-the-spec-branch`). Phase 1 cuts no branch.

The marker that a spec has an overseer is its live `run-<spec>.md` (`whoseRun`), not a claim: a claim
never expires and would leak the spec into spec-less `/spec resume` in main (wave 2). The whole-board
skip reads more than liveness: workers outlive their overseer.

Fast `CrewDeps` builder on `gitStub`: fast-tests phase 8 owns it. Build it here only if that phase
hasn't landed, and drop `crew-deps.ts` from `HELPER_EXCEPTIONS` in the same commit.

## Deliverables

- [ ] `runFileStore(…, spec?)` → `run-<spec>.md`; `spec:` in `RunFile` / `newRunFile`; tests
- [ ] `crew overseer|start|tick --spec <spec>`; `crew launch|check` use `run-<spec>.md` from the positional spec; `scopeWorld` keeps the spec's ready rows and questions; the tick prints the spec's plan change; `crew start --spec` refuses while the board crew has a live worker on the spec
- [ ] Whole-board tick skips specs with `spec-branch: on` or a `run-<spec>.md` not stood down (`overseen()` port, pure `scopeWorld`)
- [ ] Machine-wide limit: `crew/machine.ts` counts `working`/`blocked` execute workers from `loadAgents`, constant 6; `fillSlots` caps through a `machineCount()` port; the refusal lives once in `launchCrewSession`
- [ ] Plan-write notice built in `commands/phase/context.ts` (not `plan/`): every writer but the overseer; launched workers only on plan-shape writes (`add`, `split`, `move`, `set`, `task`)
- [ ] `/spec oversee-crew [<spec>]`: SKILL.md rows, launch refusal text and its test

## Phase-local notes

- `gotcha-session-id-can-change-mid-session`: `whoseRun` already follows a parked tab; the notice's
  "is this the overseer" check must use it too, not a plain id compare.
- Version picked at merge, ROADMAP row.
