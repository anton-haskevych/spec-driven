# Phase 1 preflight — one overseer per spec (2026-11-17)

Inputs: phase entry, technical.md → Phase 1, `research/phase-1/2026-11-17-overseer-per-spec-recon.md`, principles.md.
T = `skills/spec/tools`.

## Findings that change the plan

1. **`finished` can race the PR moment.** "No open phase and no launched session" read *after* close-out is true in
   the very tick that closes out the last worker and prints `PR group ready` (`T/commands/crew/tick.ts:71-72`
   removes it from `## Launched` before anything else runs). The run would end, `specRun` would stop finding it, and
   the overseer's next `crew launch babysit` would file the babysitter in the whole-board `run.md`
   (`launch.ts:15`). Fix: finish only when `## Launched` was already empty when the tick *started*.
2. **Relaunches can't be exempt through `machineBusy` alone.** `launchCrewSession` (`launch-session.ts:33`) can't
   tell a relaunch from a pick; with `machineBusy` set it would refuse a relaunch on a full machine, and unset it
   loads agents and refuses too. The request needs to say it is a relaunch.
3. **A fast test can't use `tests/crew-deps.ts`.** It reaches `git-repo.ts` (`tests/crew-deps.ts:4`), and the
   allowlist fails any non-`.git` test that does (`tests/real-git-allowlist.test.ts:31-40`). fast-tests phase 8
   hasn't landed, so the new pure-ish tests need a `CrewDeps` on `gitStub` (`tests/stub-runner.ts:104`).
4. **`runStoreFor(args)` has no job of its own.** Each command already parses its flags (`overseer.ts:81-97`,
   `launch.ts:21-34`); the store choice is `runFileStore(dir, runner, spec?)`. Parsing `--spec` stays per command
   with one shared parseArgs option; no extra helper.
5. **`TickWorld.layouts` belongs to Phase 3.** The code map credits `tick-ports.ts` with it, but nothing in Phase 1
   reads a layout (it reads no `specBranch`); Phase 3's deliverable 5 builds it with `groupKey`.

## Clean Code against Phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Few arguments | Violated, fix here | `fillSlots` takes 7 positionals (`tick.ts:117`); fold into `FillContext` before adding the machine count |
| No flag arguments | Bites | `scopeWorld(world, scope)` takes a union `{ spec } \| { overseen }`, not a boolean |
| Functions do one thing | Bites | `crewTick` (`tick.ts:52-86`, 35 lines) gains scope + finished: the finished check is its own pure `runFinished(...)` |
| Names | Bites | `specRun` returns the run (or nothing); the pure state test is `isRunOpen(run)` |
| Errors as values | Bites | `specRun` returns `Result<RunFile \| undefined>`; an unreadable common dir is a reason, not a silent "no overseer" |
| Comments | Inert | — |

## Clean Architecture against Phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `T/plan/` stays crew-agnostic: the notice wraps the writer in `commands/phase/`, `plan/` only gains `appendNotice` |
| Humble object | Bites | `systemTickPorts` moves whole to `tick-ports.ts`; `overseen()` is the only new I/O port, `scopeWorld`/`machineWorkers` pure |
| Policy vs detail | Inert | — |

## SOLID against Phase 1

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | Two actors on the run file: the whole-board crew and a spec crew. One store with an optional spec, not two stores |
| OCP | Bites | Phase 3 adds `specBranch` specs to the skip: `scopeWorld`'s `overseen` is a set the caller builds, so Phase 3 only adds to it |
| DIP | Bites | The notice's run lookup is injected into `phaseContext` (system default), so phase tests on `notARepoRunner` stay silent |
| LSP, ISP | Inert | — |

## DDD against Phase 1

Skipped: tooling, no domain model.

## Guard blindness

The plan's guard for "whole-board path byte-identical" is the existing crew tests. `crew-tick.git.test.ts:32-46`
overrides every port, and `crewTick` spreads overrides over `systemTickPorts` (`tick.ts:56`): a new `overseen()`
port falls through to the system one, which lists run files in the test repo's `.git` (none). The guard sees
output changes; it is not blind. Keep the system `overseen()` free of side effects at construction.

## Seam and testability (deltas from recon)

- `tick.ts` stays under 250 once ports move out (~20 lines out, ~30 in).
- `listRunFiles` must check the crew dir exists before reading it (`gotcha-bun-glob-scan-throws-on-missing-cwd`).

## Amendments

1. `crew tick --spec` writes `state: finished` only when `## Launched` was empty at the tick's start and the spec
   has no open phase; that tick prints `Finished: <spec> has no open phase and no session out; run ended`. A tick on
   a finished run launches nothing (held like `stood-down`).
2. `CrewLaunchRequest` gains `relaunch?: true` beside `machineBusy?: number`; `launchCrewSession` skips the machine
   check for relaunches and for babysitters.
3. Fast deps: `tests/crew-fake-deps.ts` holds `CREW_NOW` and `fastCrewDeps(commonDir, …)` on `gitStub`;
   `tests/crew-deps.ts` keeps the real-git `crewDeps`/`claudeAnd` (its `HELPER_EXCEPTIONS` row stays for phase 8).
4. No `runStoreFor`; `--spec` parsed per command.
5. `TickWorld.layouts` left to Phase 3.

## Defaults applied

- `Overseen: <spec> (no live overseer, N workers)` counts the run's launched `execute` entries.
- The notice's lookup lives in `commands/phase/overseer-notice.ts`, called from `context.ts`.
- `crew tick --spec` plan change: the world port returns `planChange` for the scoped spec (joined specs only;
  files specs have no plan version).

## Forks for you

None.
