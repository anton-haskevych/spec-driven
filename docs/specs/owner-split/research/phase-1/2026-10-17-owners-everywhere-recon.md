# Phase 1 recon — owners, assigned and read everywhere

Paths relative to `skills/spec/tools/`. One wave, read directly: the spec's wave-1 and craft
research already mapped the seam.

## Seam

- `board/people.ts:16-26` — `personKey`, `samePerson`, private `UNKNOWN`, `MIN_PREFIX = 3`; move to
  `core/people.ts`. Importers: `board/people.ts` itself, `board/render-focus.ts:4` (`personKey`),
  `tests/board-people.test.ts:3` (tests for both move to `tests/core-people.test.ts`).
- `claims/remote.ts:16,22` — `UNKNOWN_USER = "unknown"` → `UNKNOWN` from core.
- `core/git.ts:35-38` — `authorName` (`git var GIT_AUTHOR_IDENT`); `runnerName` goes beside it.
- `core/spec-meta.ts:93-97` — owner parse; `FocusFields` + `SpecMeta` gain `ownerInvalid`.
- `board/model.ts:12-16` — `RowBase` is shared by ready, flight and blocked rows: one `owner?` there.
- `board/lanes.ts:113` (blocked push in `phaseLanes`), `:139-160` (`stageLanes`, ready and blocked),
  `:162-182` (`phaseRow`); `board/flight.ts:20-39` (`flightRows`; `specNode` at `:69`).
  `joinFlightRows` spreads rows (`board/joins.ts:23-42`), so a new field survives.
- `board/render.ts:85-88` — `readyNote` parts: owner mark goes in.
- `board/load.ts:39` — `Board.me` from `authorName` → `runnerName`.
- `commands/ship.ts:41-58` — `planShip`/`shipEdit` → `core/land-spec-field.ts`; `planShip` stays
  exported (tests import it, `tests/ship-command.test.ts:2`).
- `spec.ts:30-51` — `COMMANDS` table; `tests/commands-table.test.ts` checks usage starts with name.

## Reuse

- `core/land-on-main.ts` (`landOnMain`, `MainEditPlan`, `MainLanding`) — the landing itself.
- `core/frontmatter-patch.ts` — `setFrontmatterLine` and `removeFrontmatterLine` (for `none`).
- `core/spec-folders.ts` `findSpecs`; `commands/push.ts` `NO_DEFAULT_BRANCH`.
- `tests/stub-runner.ts` `stubRunner` (argv-prefix matched) for `runnerName` stubs.

## Testing issues

- **`GIT_AUTHOR_NAME=""` overrides a repo-local `user.name`** (probed: `fatal: empty ident name (for <>)
  not allowed` with `user.name Тарас` set locally). The phase's `anonymousRunner` blanks it to `""`,
  which would make the "repo-local name, no email" case fail. The runner merges `process.env`, so
  blanking was meant to hide a developer's own env; unset the keys instead.
- Name set via env only (`GIT_AUTHOR_NAME=spec-tests`, isolatedRunner) passes `useConfigOnly`: board
  tests keep `me: spec-tests`.
- Files near cap: `board/lanes.ts` 201 lines (+~4). Others well under.
- No I/O tangles: `runnerName` is one git call; `planSpecField` is pure, landing tested with real repos
  like `ship-command.test.ts`.
