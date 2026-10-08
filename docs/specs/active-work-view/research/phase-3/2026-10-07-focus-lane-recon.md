# Phase 3 recon — FOCUS lane (2026-10-07)

`T` = `skills/spec/tools`. Read directly (seam ~1.4k lines); no explore waves needed.

## Seam

- `T/board/lanes.ts:37-61` `buildBoard`: lanes assembled inline; `rankReady(markSafe(...))` at :55. FOCUS is one
  call after `inFlight`/`ready`/`blocked` exist; `ReadyRow.focus` set before `rankReady`.
- `T/board/model.ts:44-60` `ReadyRow`; `:78-96` `Board` (`lanes`, `footer`). Additive fields only.
- `T/board/rank.ts:9-18` `rankReady` comparator chain; focus goes first.
- `T/board/render.ts:4-5` `Lane`/`LANES`; `:18-28` `renderBoard` sections record; `:30-38` header counts;
  `:70-76` `readyNote` (first-match chain; `focus <n>` prefixes it).
- `T/board/inputs.ts:28-45` `BoardInputs`; `T/board/load.ts:42-76` `loadBoardInputs`. `worktreePaths` from
  `loadWorkspaces(git)` (`T/workspaces/list.ts:17`, already canonical), fallback `workspaces` paths.
- `T/sessions/live.ts:29-40` `parseSessionFile`: `updatedAt ?? startedAt` at :36 (flag goes here), `name` at :38.
  Real files: `nameSource` is `"user"` (`claude -n`) or `"derived"` (`crm-82`).
- `T/commands/board.ts:41-42` lane word parse uses `LANES` → `board focus` comes free.
- `T/commands/context.ts:28` `OFFER_TOP_READY`; `T/tests/context.test.ts:267`.

## Reuse

- `specSummary` (`T/portfolio/rows.ts`) → progress, due, overdue.
- `deployWaits` (`T/board/deploy-waits.ts`) + `splitKey` → `now: deploy`.
- `linkedPrs` + `toPrCell` (`T/board/joins.ts:41-52`) → `merging #n` (open linked PR).
- `parseLaunchTitle` (`T/launch/title.ts`), `sessionLabel` (`T/sessions/label.ts`), `ownerOf`,
  `sessionsByWorkspace`.
- Cells: `lane`-style title + `alignColumns`, `ago`, `monthDay`, `EMPTY` (`T/board/cells.ts`).
- `isFinished` (`T/graph/nodes.ts:64`) covers done/good-enough/abandoned status *and* all-phases-ticked.

## Testing-issue estimate

- Factories: `boardInputs()` needs `worktreePaths: []`; `board()` needs `lanes.focus: []`. `liveSession`,
  `heldClaim`, `workspaceView`, `specFixture({ meta: { focus } })` cover attribution and lane tests.
- Golden "no focus" test must be captured **before** touching `render.ts`/`lanes.ts`, from a `boardInputs`
  that has sessions, claims, workspaces and every lane populated (a builder filling `otherSessions` must break it).
- `worktreePaths` needs a real-git `loadBoardInputs` test (clean merged worktree is not in `workspaces`);
  `tests/board-inputs.test.ts` already builds a repo + worktree.
- No file near 250 lines; `lanes.ts` (165) gets one call only.
- Model choice to settle in preflight: phase 3 has no `me` (phase 4), so sessions sit on `FocusRow.sessions`
  (this machine's sessions are always mine); phase 4 adds per-person `work` for claims and PRs.
