---
needs: [1]
pr: A
---

# Phase 2 — The crew works only its runner's specs

**Goal:** the crew records who runs it, refills only with that person's or unowned work, and placement refuses an execute launch of someone else's spec before cutting a tree.

**Outcome:** Anton's crew never starts Taras's specs and the other way round, without skip notes in the run file · medium · risk: CRM's `permission-aware-ui` is `owner: taras` and Anton's crew has been working it; it stops being picked once this ships, and a relaunch of it is refused with the branch and tree that hold its unmerged work.

**Files to touch:**
- `skills/spec/tools/crew/pick.ts`, `crew/run-state.ts`
- `skills/spec/tools/commands/crew/tick.ts`, `commands/crew/launch-session.ts`, `commands/crew/overseer.ts`
- `skills/spec/tools/trees/place.ts`, `launch/place-for-launch.ts`
- `skills/spec/oversee-crew.md`, `skills/spec/crew-brief.md`, `skills/spec/execute.md` (lines naming Anton as the crew's person)

## Implementation guidance

The crew's one identity is `runner:` in run.md (`ledger/decision-crew-identity-is-the-run-file.md`).
`crew start` resolves `runnerName`, refuses on failure, writes `runner:` and prints
`Crew: started for <name> · overseer …` (update the pins in `crew-overseer-command.test.ts`).
Takeover rewrites `runner:` from the new session's `runnerName` and says so when it changed.

The tick reads `run.runner`; no git call, so tick tests stay git-free. Missing runner: close-out
still runs, the refill is held exactly like `--no-launch`, and the "can't tell who runs this crew"
line goes to *for you*. Don't return early the way `tick.ts:55` does. `pickRows` takes one object
(`{ ready, states, busy, unanswered, slots, me }`) and adds the `isOffered` guard; `fillSlots`
reads the runner from `run`.

The gate lives in placement (`ledger/decision-launch-gate-in-place-tree.md`): `PlaceOptions.onlyFor`,
checked in `placeTree` after `groupPhases` and before anything is added. Owner from
`inputs.nodes.get(spec).meta` (`loadPlaceWorld` already loads them; add `nodes` to the
destructure), else `readSpecMeta` of the checkout's `CLAUDE.md` for a branch-only spec. When
`findTree` finds the group's tree, the refusal names its branch and path. `placeForLaunch` passes
`onlyFor` for execute only; `launchCrewSession` reads `runner` from the run file it already parses
and refuses when missing. Plain `launch` never sets `onlyFor`. Relaunches reach the same gate, so
no separate relaunch check.

Tests: `placeTree` with `onlyFor` against a real-git repo (base owner, branch-only owner, owner not
offered → refusal, no worktree added); `crew-launch.test.ts` keeps its stub `PlaceFn` and asserts
`onlyFor` reaches it; a tick test with no `runner:` proving close-out still runs.

Prose (the plan in §1.2 moves to `board ready --for me` in phase 3): §2's pick rule gains "owned by someone
else"; the refusal list at `oversee-crew.md:92-94` gains the owner line ("leave it; its owner runs
it"); "Anton" becomes "the person running the crew" wherever it means the crew's human.

## Deliverables

- [x] `runner:` in run.md: `crew start` resolves, refuses when unknown, records it and prints `Crew: started for <name> · …`; takeover rewrites it
- [x] Tick reads the runner; unknown → close-out runs, refill held, one *for you* line
- [x] `pickRows({ …, me })` skips rows whose owner isn't offered to `me` (`crew-tick-step.test.ts`)
- [x] `PlaceOptions.onlyFor` in `placeTree`: base owner, checkout fallback, refusal before any tree, tree named when it exists (real-git test)
- [x] `launchCrewSession` passes `onlyFor: runner` for execute; babysit and plain `launch` unchanged
- [ ] `oversee-crew.md` / `crew-brief.md` / `execute.md`: pick rule, refusal bullets, "the person running the crew"

## Phase-local notes

- CRM's run.md rows q40/q41 (`cross-studio (all phases)`, `staff-ios-app-release (all phases)`) never parsed (`crew/run-state.ts:45`); don't widen the regex — this phase replaces them.
- `gotcha-spec-ts-exits-0-on-refusal`: the overseer reads the line, never an exit code.
