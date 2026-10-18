# Phase 3 preflight — `board ready --for` (2026-10-17)

Self-scaled: the recon read every file in the seam in full; one inline pass.

## Findings that change the plan

1. `tests/context.test.ts:344` pins the substring `board ready --json --local`; the new `APPLY_TOP_READY` text (`board ready --for me --json --local`) breaks it. Update the pin in the same commit as the copy.
2. `commands/board.ts:45` refuses `--who` on any lane but `focus`. `--for` needs its own guard (no lane or `ready`), and `--keep` is meaningless without `--for`: refuse it with the usage line rather than ignore it.
3. The unknown line must not change any board built without `--for` (`tests/board-no-focus-golden.test.ts`): drive it from an optional `Board.who`, absent unless `--for me` found no runner, and render it in `renderBoard` only then.

## Clean Code / SOLID against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| Functions small, one thing | Bites | `offerFor(board, who, keep?)` beside `boardFor` in `board/people.ts` (53 lines); `boardCommand` stays a pipeline |
| No flag arguments | Bites | `keep` is data (a spec name), not a boolean |
| SRP | Bites | Filter in `board/people.ts`; parsing in `commands/board.ts`; the line in `board/render.ts` |
| OCP / LSP / ISP / DIP | Inert | No new types or ports |
| Clean Architecture | Inert | Pure filter over the board model |
| DDD | Inert | No domain model change; `isOffered` is the one rule (`core/people.ts:26`) |

## Guard blindness

None: the new behaviour is pinned by `board-command.test.ts` against real git.

## Amendments

1. `BOARD_USAGE` gains `[--for <name|me> [--keep <spec>]]`.
2. `Board.who?: { unknown: true }` in `board/model.ts`; `BOARD_VERSION` 3.

## Defaults applied

- `--for <name>` whose name keys to nothing (`tk`) keeps only unowned rows (`isOffered` fails closed); no unknown line, which is reserved for `--for me`.
- `--for` and `--who` together (no lane) apply both: FOCUS by `--who`, READY by `--for`.

## Forks for you

None.
