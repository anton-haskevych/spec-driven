---
needs: [1]
pr: A
---

# Phase 2 — The crew works only its runner's specs

**Goal:** the crew knows who runs it, refills only with that person's or unowned work, and refuses a hand launch of someone else's spec before cutting a tree.

**Outcome:** Anton's crew never starts Taras's specs and the other way round, without skip notes in the run file · medium · risk: CRM's `permission-aware-ui` is `owner: taras` and Anton's crew has been working it; it stops being picked once this ships.

**Files to touch:**
- `skills/spec/tools/crew/pick.ts`, `crew/run-state.ts`
- `skills/spec/tools/commands/crew/tick.ts`, `commands/crew/launch-session.ts`, `commands/crew/launch.ts`, `commands/crew/overseer.ts`
- `skills/spec/tools/commands/crew/owner-on-base.ts` (new)
- `skills/spec/oversee-crew.md`, `skills/spec/crew-brief.md`, `skills/spec/execute.md` (lines naming Anton as the crew's person)

## Implementation guidance

Put `me: Result<string>` on `TickWorld` so every tick test stays git-free (`crew-tick.test.ts:34`
default). `systemTickPorts.world()` resolves `runnerName` once, passes the name to `buildBoard`,
and on failure the tick prints its line and launches nothing (mirror `tick.ts:55`).

`pickRows` takes `me` and adds one guard. The tick also builds an `OwnerReader` from the nodes
and states it already loaded and hands it to `launchCrewSession`; `crew launch` builds one with
`ownerOnBase(projectDir, runner)`. Inject it like `PlaceFn` so `crew-launch.test.ts` stays
git-free, and prove "no tree was cut" with a throwing `PlaceFn` (`launch.test.ts:204`) plus run.md
unchanged and no `briefs/`.

`crew start` resolves `runnerName`, refuses on failure, writes `runner:` to the run file and
says `started for <name>`. Takeover keeps the recorded runner unless the new session's name differs;
then it says so.

Prose: §2's pick rule gains "owned by someone else"; the refusal list at `oversee-crew.md:92-94`
gains the owner line ("leave it; its owner runs it"); "Anton" becomes "the person running the
crew" wherever it means the crew's human.

## Deliverables

- [ ] `pickRows(…, me)` skips rows whose owner isn't offered to `me` (`crew-tick-step.test.ts`)
- [ ] `TickWorld.me`; tick passes `me` to `buildBoard`; unknown runner → refusal line, no launches
- [ ] `ownerOnBase` reader (base first, checkout fallback for branch-only specs) with a real-git test
- [ ] `launchCrewSession` refuses an execute launch of someone else's spec before placement; babysit unchanged
- [ ] `crew start` resolves the runner, refuses when unknown, records `runner:` and prints `started for <name>`
- [ ] `oversee-crew.md` / `crew-brief.md` / `execute.md`: pick rule, refusal bullets, "the person running the crew"

## Phase-local notes

- CRM's run.md rows q40/q41 (`cross-studio (all phases)`, `staff-ios-app-release (all phases)`) never parsed (`crew/run-state.ts:45`); don't widen the regex — this phase replaces them.
- `gotcha-spec-ts-exits-0-on-refusal`: the overseer reads the line, never an exit code.
