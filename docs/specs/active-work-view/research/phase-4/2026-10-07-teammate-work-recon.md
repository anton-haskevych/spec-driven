# Phase 4 recon — teammate's work and `--who` (2026-10-07)

Single wave, read inline (seam fully named by the phase entry and phase 3's code). `T` = `skills/spec/tools`.

## Seam

- `T/pr/gh-lists.ts:7` `OPEN_FIELDS` — add `author`. Field strings pinned in `tests/pr-gh-lists.test.ts:17`.
- `T/pr/rollup.ts:7-14,66-72` `PrRow` / `toPrRow` — `author?: string` from `author.login` (`isRecord`). Only open
  records carry it (the recent list keeps its fields: no new cost).
- `T/board/focus.ts:47-67` `focusLane(lanes, order, inputs, now)` — builds `FocusRow`s; sessions via
  `attributeSessions` stay on `FocusRow.sessions` (`ledger/decision-focus-row-sessions-stay-on-the-row.md`).
  Add `owner`, `work`, `unattributedPrs` here. Open linked PRs: `linkedPrs(prs, prLinks.get(spec))` filtered
  `OPEN` → `toPrCell` (`board/joins.ts:41-52`), as `openLinkedPr` (`focus.ts:113`) already does.
- Remote claims: `inputs.claims` with `status: "remote"` and `holder` (`claims/rules.ts:14-18`,
  `claims/remote-payload.ts:7-10`); `since` = `claim.claimedAt` (as `joins.ts:20`).
- `T/board/lanes.ts:38-68` `buildBoard(inputs, now)` — needs `me` to bucket; `Board.me` set here.
- `T/board/load.ts:37-40` `loadBoard` — reads `me` once; `loadBoardInputs` untouched (claim/trees call it).
- `T/board/model.ts:99-131` — `FocusRow` gains `owner?`, `work`, `unattributedPrs`; `Board.me?`.
- `T/board/render-focus.ts:9-13,53-60` — `whoCell` today renders sessions only; becomes per person.
- `T/board/render.ts:19-29` — `renderBoard(board, { lane })`; `--who` needs the title and to show the
  FOCUS section even when the filter leaves no rows.
- `T/commands/board.ts:20-47` — `parseBoardArgs` (node `parseArgs`); add `who: { type: "string" }`.

## Reuse

- `git var GIT_AUTHOR_IDENT` name parsing already lives in `T/claims/remote.ts:21-25` (`readHolder`).
  Second use → extract `authorName(git)` into `T/core/git.ts`; `readHolder` keeps its `unknown` fallback.
- `prCell` (`board/cells.ts:71`) renders a `PrCell`; reuse it for PRs in the who cell.
- `ago` (`cells.ts:42`) for claim ages; `sessionText` (`render-focus.ts:57`) for sessions.

## Testing-issue estimate

- No harness gaps: `boardInputs`/`specFixture`/`prRow`/`heldClaim` factories cover the model; `prRow` takes
  `author` once `PrRow` has it. `heldClaim("remote", …)` needs a `holder` — set it on the returned object.
- `Board.me` test: `loadBoard` with `isolatedRunner` (identity `spec-tests`) in `tests/board-inputs.test.ts`.
- Fixture `tests/fixtures/gh-pr-list-open.json` is a recorded gh capture without `author`; add gh's real
  shape (`{ id, is_bot, login, name }`) to the records, keep everything else.
- Sizes: `focus.ts` 122 lines — bucketing goes to the new `board/people.ts` (pure) to stay well under the
  cap. `render-focus.ts` 70 → ~100. `commands/board.ts` 47 → ~65.
- `focusFor` is pure over rows; command test covers JSON + text + usage error with real git (`--local`).
