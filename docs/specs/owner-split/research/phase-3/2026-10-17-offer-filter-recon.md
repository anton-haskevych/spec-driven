# Phase 3 recon — `board ready --for` (2026-10-17)

Single inline wave: the seam was already named by the phase entry and phase 1/2 work.

## Seam

- `tools/commands/board.ts:21-27` `boardCommand`: parses args, `loadBoard`, applies `boardFor` when `--who`, then JSON or `renderBoard`. `--for`/`--keep` slot in beside `--who`.
- `tools/commands/board.ts:35-50` `parseBoardArgs`: `parseArgs` strict; `--who` guarded to no lane or `focus` (`:45`). `--for` mirrors it for no lane or `ready`.
- `tools/board/people.ts:37-41` `boardFor` (the `--who` filter on FOCUS). The offer filter goes beside it as its own function (`ledger/decision-offer-filter-is-its-own-flag.md`).
- `tools/core/people.ts:26-28` `isOffered` already exists (phase 1); `ReadyRow.owner` is already `ownerOf` (`board/model.ts:16`).
- `tools/board/model.ts:8` `BOARD_VERSION = 2`; `Board` (`:166-186`) gains `who?: { unknown: true }`.
- `tools/board/render.ts:22-33` `renderBoard`: header then sections; the unknown line goes after the header only when `board.who?.unknown`, so boards without `--for` render byte-identical.
- `tools/commands/context.ts:30-31` `APPLY_TOP_READY`; `tests/context.test.ts:344` pins `board ready --json --local` as a substring (the new text keeps `--json --local` but adds `--for me` in between, so the pin needs updating).

## Reuse

- `isOffered`, `ME` (`board/people.ts:5`), `Board.me` (= `runnerName`, `board/load.ts:39`).
- Tests: `tests/board-command.test.ts` real-git fixtures (`repoWithOrigin`, `isolatedRunner`; `board.me` = `spec-tests`); `anonymousRunner` (`tests/git-repo.ts:26`) gives a board with no `me`.

## Testing issues

- None blocking. `board-command.test.ts` is 130 lines; a new describe block keeps it under 250.
- `board-no-focus-golden.test.ts` renders without `--for`: must stay byte-identical (who absent).
- `board-command.test.ts:36` pins `version` 2 → 3.
