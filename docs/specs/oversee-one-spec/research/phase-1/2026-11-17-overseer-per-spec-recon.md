# Phase 1 recon — one overseer per spec (2026-11-17)

T = `skills/spec/tools`. Branch now carries Phase 3's work (fast-forwarded to `feat/oversee-one-spec-pr-c`;
Phase 1 regrouped into PR C).

## Seam

- **Run store** `T/crew/deps.ts:38-53` `runFileStore(projectDir, runner)`: fixed `crew/run.md`. Production callers:
  `commands/crew/check.ts:14`, `launch.ts:15`, `tick.ts:54`, `overseer.ts:23,53`. `launch-session.ts:66-68` puts
  briefs beside `store.path`.
- **Run state** `T/crew/run-state.ts`: `RunFile` (:29-37) has no spec; `newRunFile` (:67-70) writes frontmatter in
  a fixed order; states written in TS: only `running`; `stood-down` is written by hand (oversee-crew.md).
  No `finished` yet. Patch helpers use `setFrontmatterLine` (`withOverseer`, `withRunner`).
- **whoseRun** `T/crew/overseer.ts:11-20`: `own | take-over{closed | parked into this session} | other{id,name}`.
  Follows a parked tab through `parkedJobId`.
- **Tick** `T/commands/crew/tick.ts` (162 lines): `TickWorld` :29-36, `TickPorts` :38-45, `crewTick` :52-86
  (arg check by hand, no parseArgs), `closeOutLaunched` :94-115, `fillSlots` :117-141 (7 positional params;
  relaunches go first, then `pickRows` with `busy` = launched execute specs + relaunch specs),
  `systemTickPorts` :143-162 (`loadBoardInputs` → `buildBoard(...).lanes.ready`, `questionRows(recordViewOf(...))`,
  `loadAgents`, `claude stop|rm`, `launchCrewSession`).
- **Agents** `T/sessions/agents.ts:27` `loadAgents(runner)` = `claude agents --json --all`; `AgentState`
  `working|done|blocked|stopped|unknown`. Title parse `T/launch/title.ts:19-25`.
- **Launch** `T/commands/crew/launch-session.ts:33-64` `launchCrewSession(request, store, deps, place)`;
  `CrewLaunchRequest` :18-24. `crew launch` parse `launch.ts:21-34` (positionals `[sub, spec, target]`).
- **Start/overseer** `T/commands/crew/overseer.ts`: `crewStart` :20-44 (parseArgs `workers`/`babysitters`),
  `runVerdict` :52-61 opens its own store.
- **Check** `T/commands/crew/check.ts:11-23`: one store, entry by id.
- **Notice** `T/commands/phase/context.ts:31-35` `writerFor`; `PhaseOutcome.notice` `T/plan/phase-writer.ts:23-29`,
  printed before the result (`renderPhaseOutcome` :73-76). `T/plan/write-notice.ts:31` assigns the plan-change
  notice over the upgrade lines `withLines` merged at :24 (the bug). Action names exist only in
  `T/commands/phase/<action>.ts`; the writer's method name is the action.
- **Plan change for the tick**: `noticePlanChange(memory, spec, planShapeOf(joined))` as `commands/context.ts:120`
  does; only joined specs have a shape. `planMemoryFor(env)`.
- **Liveness** for the notice: `loadLiveSessions(claudeHome, psProcStarts(runner))` as `T/claims/live.ts:26`.
- **Entry text** `T/launch/command-line.ts:35-37`; `tests/launch.test.ts:127-129`; SKILL.md :4, :56, :73, :89.
- **Phase 3 left** `startSpecBranch` (`commands/crew/spec-branch.ts:14`) unwired, for `crew start --spec`.

## Reuse

- `whoseRun` for every liveness question (notice, `Overseen:` line); `parseLaunchTitle` for the machine count and
  for "entries on this spec"; `setFrontmatterLine` for `spec:`/`state: finished`; `stateDir` for listing run files.
- The tick's `overrides: Partial<TickPorts>` seam already makes it testable; the new `overseen()` port joins it.

## Testing-issue estimate

- All four crew command tests are real git (`crew-*.git.test.ts`, "moves to fakes in phase 8") through
  `tests/crew-deps.ts`, a `HELPER_EXCEPTIONS` helper: a new fast test may not import it (the allowlist fails any
  non-`.git` test reaching `git-repo.ts`). fast-tests phase 8 hasn't landed. A fast test needs a `CrewDeps` built
  on `gitStub` (`tests/stub-runner.ts:104`), whose `commonDir` can point at a temp dir so `stateDir` resolves.
- `tick.ts` is 162 lines and grows with scope + machine + finished: the tick-ports move and `FillContext` keep it
  under 250. `fillSlots` already has 7 params.
- `scopeWorld`, `machineWorkers`, `specRunOpen` (state check) are pure; `specRun`/`listRunFiles` read files.
- Notice wrapper: testable with a fake `PhaseWriter` and injected run lookup; no git.
- No file near 250 lines on the path (largest: `launch.test.ts` 217).
