# Phase 2 recon — the crew works only its runner's specs

Paths relative to `skills/spec/tools/`. Phase 1 landed `core/people.ts` (`isOffered`, `ownerOf`,
`INVALID_OWNER`), `runnerName` in `core/git.ts:47-54`, and `owner` on `ReadyRow` (`board/model.ts:17`,
filled by `ownerField` in `board/lanes.ts:152,174`). So the crew only has to read them.

## Seam

- **run.md** `crew/run-state.ts`: `RunFile` (`:28-34`), `NewRun` (`:36-41`), `parseRunFile` (`:47-58`),
  `newRunFile` (`:60-63`), `withOverseer` (`:65-68`, one `setFrontmatterLine`). `runner:` mirrors
  `overseer:` exactly: a frontmatter string field plus a `withRunner` patch.
- **crew start** `commands/crew/overseer.ts:19-35`: new run → `newRunFile`; existing → `merged()` (`:57-63`).
  Line `Crew: ${startedHow} · overseer …` (`:34`). Pins: `tests/crew-overseer-command.test.ts:24,33,41`.
  `crewDeps()` uses `isolatedRunner` (git name `spec-tests`); `anonymousRunner` (`tests/git-repo.ts:26`)
  is the no-identity runner for the refusal test.
- **tick** `commands/crew/tick.ts:46-74`: `holding` (`:70`) is where a missing runner joins
  `--no-launch`; `fillSlots` (`:105-128`) calls `pickRows` (`:113`).
- **pick** `crew/pick.ts:12`: five positional params → one object with `me`; guard next to the
  `unanswered` check. Tests `tests/crew-tick-step.test.ts:67-88` (`readyRow` factory takes `owner`).
- **launch** `commands/crew/launch-session.ts:35-43`: already parses run.md (`overseer`); reads
  `runner` there. `placeForLaunch(subCommand, spec, target, place)` (`launch/place-for-launch.ts:9`)
  is at the 4-param cap, so `onlyFor` needs a request object: callers `commands/launch.ts:35`,
  `launch-session.ts:42`; pins `tests/launch.test.ts:191` (`{ existingOnly: true }`).
- **placement** `trees/place.ts:55-68`: `groupPhases` (`:59`) then `findTree` (`:62`). `loadPlaceWorld`
  (`:93-110`) already has `inputs.value.nodes` (`board/inputs.ts:32`) and `resolveSpec(projectDir, spec)`
  for the checkout copy; `SpecNode.meta` is `readSpecMeta` output (`graph/nodes.ts:53`).

## Reuse

- `isOffered` / `ownerOf` for every owner decision (`gotcha-invalid-owner-reads-as-shared`).
- `setFrontmatterLine` for the takeover rewrite, as `withOverseer` does.
- Real-git placement fixture: `tests/trees-command.test.ts:10-35` (`repoWithOrigin`, `deps()`).

## Testing issues

- `trees-command.test.ts` is 89 lines; owner cases go in their own file to keep fixtures separate
  (a spec with an owner on base, one committed but not pushed).
- Every test that writes run.md with `newRunFile` (`crew-tick`, `crew-launch`, `crew-check`,
  `crew-run-state`) must pass `runner` once it is required on `NewRun`.
- `tick.ts` is 148 lines; the change adds ~5. No file nears 250.
