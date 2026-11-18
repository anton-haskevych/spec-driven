---
needs: []
pr: C
---

# Phase 1 — One overseer per spec

**Goal:** `/spec oversee-crew <spec>` runs a crew on that spec alone, with its own run file, one phase at a time, a machine-wide worker limit, and a notice to any other session that changes its plan.

**Outcome:** You can start one overseer per spec, several at once, each keeping its spec moving one phase at a time without stepping on the others; parallel lanes inside a spec arrive with phase 3 · medium · risk: the whole-board crew changes only by skipping specs that have their own overseer.

**Files to touch:**
- `skills/spec/tools/crew/deps.ts`, `crew/run-state.ts`, `crew/machine.ts` (new), `crew/scope.ts` (new)
- `skills/spec/tools/commands/crew/{overseer,tick,tick-ports (new),launch,launch-session,check}.ts`
- `skills/spec/tools/commands/phase/context.ts` (the notice; `plan/` stays crew-agnostic), `plan/phase-writer.ts` + `plan/write-notice.ts` (`appendNotice`)
- `skills/spec/tools/launch/command-line.ts`, `skills/spec/SKILL.md` (dispatch row, `:56`, `:89`, Crew bullet)
- tests: `crew-run-state`, `crew-tick-step`, `crew-overseer`, `crew-run-store` (new), `launch`, phase-writer tests

## Implementation guidance

technical.md → *Phase 1*. Parameterise, don't fork: the run store takes an optional spec, and the tick
scopes its world through pure `scopeWorld` and one new port (`overseen()`). The machine count comes from
the agents the tick already loads. The whole-board path must stay byte-for-byte the same when `--spec` is
absent; the existing crew tests are the proof. Refactor first (`tick-ports.ts`, `FillContext`), then add.

One worker per spec still holds here: `pickRows` is untouched. Parallel lanes need merge-back and ship
with Phase 3 (`decision-lanes-ship-with-the-spec-branch`). Phase 1 cuts no branch.

The marker that a spec has an overseer is one rule, `specRun(spec)`: `run-<spec>.md` with state neither
`stood-down` nor `finished`. Not a claim: a claim never expires and would leak the spec into spec-less
`/spec resume` in main (wave 2). Not liveness: workers outlive their overseer. Only the notice also asks
`whoseRun` whether the overseer is live. The run ends `finished` when the spec has no open phase and no
launched session, so the whole-board crew picks the spec up again later. Phase 1 reads no `specBranch`
field: nothing writes it before Phase 3 (review 2026-11-17 final-pr-and-mode-ends).

Fast `CrewDeps` builder on `gitStub`: fast-tests phase 8 owns it. Build it here only if that phase
hasn't landed, and drop `crew-deps.ts` from `HELPER_EXCEPTIONS` in the same commit.

## Deliverables

- [ ] `runFileStore(…, spec?)` → `run-<spec>.md`; `spec:` in `RunFile` / `newRunFile`; tests
- [ ] `crew overseer|start|tick --spec <spec>`; one `specRun(spec)` resolver (`run-<spec>.md`, state neither `stood-down` nor `finished`) used by `crew launch`, the skip and the notice; `crew check <id>` searches every run file; `scopeWorld` keeps the spec's ready rows and questions; the tick prints the spec's plan change; `crew start --spec` refuses while `run.md`'s `## Launched` holds any entry on the spec; `crew tick --spec` writes `state: finished` once the spec has no open phase and no launched session
- [ ] Whole-board tick skips specs with a `specRun` (pure `scopeWorld`, `overseen()` port), its relaunches included; one `Overseen: <spec> (no live overseer, N workers)` line when the overseer is gone. The `specBranch` half of the skip ships with Phase 3
- [ ] Machine-wide limit: `crew/machine.ts` counts `working`/`blocked` execute workers from the agents the tick already loads (no new port), constant 6; `FillContext` carries the count, `CrewLaunchRequest.machineBusy` keeps the refusal in `launchCrewSession` (loaded once when unset); relaunches exempt; a blocked tick prints `Machine full: 6 of 6`
- [ ] Plan-write notice built in `commands/phase/context.ts` (not `plan/`): the overseer is silent, every other writer gets it on plan-shape actions only (`add`, `split`, `move`, `set`, `task`); appended through `appendNotice` (also fixes the overwrite at `write-notice.ts:31`), never assigned
- [ ] `/spec oversee-crew [<spec>]`: SKILL.md rows, launch refusal text and its test
- [ ] Refactor first: `systemTickPorts` → `commands/crew/tick-ports.ts`, `runStoreFor(args)`; `fillSlots` inputs → one `FillContext`; existing crew tests green

## Phase-local notes

- `gotcha-session-id-can-change-mid-session`: `whoseRun` already follows a parked tab; the notice's
  "is this the overseer" check must use it too, not a plain id compare.
- Version picked at merge, ROADMAP row.
