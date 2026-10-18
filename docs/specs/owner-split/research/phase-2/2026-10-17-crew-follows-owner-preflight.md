# Phase 2 preflight — the crew works only its runner's specs

Inputs: `phases/phase-2-crew-follows-owner.md`, `research/phase-2/2026-10-17-crew-follows-owner-recon.md`,
`skills/spec/principles.md`. Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **`placeForLaunch` is at the 4-parameter cap** (`launch/place-for-launch.ts:9`: `subCommand, spec,
   target, place`). The phase says "passes `onlyFor` for execute"; a fifth positional breaks
   principles.md. It takes a `LaunchPlace` object `{ subCommand, spec, target, onlyFor? }` plus `place`.
   Callers: `commands/launch.ts:35`, `commands/crew/launch-session.ts:42`.
2. **technical.md says "checked … before `findTree`"; the phase file says the refusal names the tree
   `findTree` finds.** Both hold if the gate runs after `groupPhases`, calls the pure `findTree`
   (`trees/find.ts:31-38`, no I/O) only to name the tree, and returns before `addPlacedTree` or the
   holder check. Nothing is added either way.
3. **`placeTree` (`trees/place.ts:55-68`) is 14 lines and does placement only.** The owner decision
   goes in its own function (`ownerRefusal`), and the owner value is resolved once in
   `loadPlaceWorld` as plain data (`PlaceWorld.owner`), so `placeTree` gains two lines.
4. **`INVALID_OWNER` (`core/people.ts:5`, `"?"`) can't be printed as a name** (`launch: x is ?'s`).
   The refusal says `<spec>'s owner: is malformed` for it and "its owner" in the tree tail.

## Clean Code against the plan

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Few arguments | Bites | `pickRows` → one object (as planned); `placeForLaunch` → request object (finding 1) |
| No flag arguments | Inert | `onlyFor` is a value, not a boolean |
| One level of abstraction | Bites | `ownerRefusal` beside `groupPhases`, not inline in `placeTree` |
| Command/query separation | Bites | `crewStart` writes and returns the line; the runner rewrite stays inside `merged()` |
| Errors as values | Bites | `Result` refusals throughout, as `existingOnly` does at `place.ts:63` |

## Clean Architecture

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `crew/pick.ts` and `trees/place.ts` import `isOffered`/`ownerOf` from `core/people.ts`, never `board/` |
| Humble object | Bites | tick reads `run.runner`: no git call, `crew-tick.test.ts` stays git-free |

## SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | identity is resolved by one actor (`crew start`); tick and launch only read run.md |
| OCP | Inert | — |
| LSP | Inert | — |
| ISP | Inert | — |
| DIP | Bites | `launchCrewSession` keeps its injected `PlaceFn`; the gate travels in `PlaceOptions`, so `crew-launch.test.ts` asserts it on the stub |

## DDD

Skipped: tooling, no domain model beyond "owner" and "runner", whose words design.md fixes.

## Seam and testability (deltas from recon)

- `NewRun.runner` required: four test files write run.md (recon) — update them in the run-state commit.
- Real-git owner fixture: base owner = commit + push; branch-only owner = commit, no push.

## Amendments

1. `placeForLaunch({ subCommand, spec, target, onlyFor }, place)`; `onlyFor` reaches `place` only for execute.
2. `PlaceWorld.owner` from `ownerOf(nodes.get(spec).meta)`, else `ownerOf(readSpecMeta(<checkout CLAUDE.md>))`.
3. `ownerRefusal(spec, owner, onlyFor, tree?)` → reason string or undefined; malformed owner worded apart.

## Defaults applied

- Takeover line: `Crew: taken over from <id> for <name> (was <old>) · overseer …`, `(was …)` only when it changed.
- A tick with no runner holds relaunches as `Relaunch held (no runner)`.
- The refusal prints the tree's full path, not `~`.

## Forks for you

None.
