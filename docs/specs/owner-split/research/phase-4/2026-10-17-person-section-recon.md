# Phase 4 recon — `board --who X` person section (2026-10-17)

Single inline wave: phases 1–3 built the people helpers and the flag plumbing; the seam is named.

## Seam

- `tools/commands/board.ts:34-40` `boardCommand`: `loadBoard` → `filtered` (`boardFor`, `offerFor`) → JSON or `renderBoard`. With `--who`, load inputs (`board/load.ts:46` `loadBoardInputs`) and `buildBoard` (`board/lanes.ts:43`) so `personWork` can read `BoardInputs`; attach `people` before filtering.
- `tools/board/load.ts:39-44` `loadBoard`: `runnerName` → `Board.me`. The same name must reach the `--who` path: one helper for both.
- `tools/board/model.ts:166-188` `Board`: gains `people?: PersonWork[]`. `BOARD_VERSION` already 3 (phase 3).
- `tools/board/render.ts:22-33` `renderBoard`: the person section goes after the header, before FOCUS, only with no lane.
- `tools/board/focus.ts:95-99` `focusNow(node, lanes, inputs)`: computes "flight / ready / deploy / blocked / paused / merging / none" from the built lanes — exactly the owns row's lane state. Private today.
- `tools/board/focus.ts:144-148` `focusSession(session, spec)`: label + launch sub/phase. Private today.
- `tools/board/render-focus.ts:37-55` `nowText(FocusNow)`: renders that state (`ready 1a`, `blocked: needs 3`). Private today.
- `tools/board/attribution.ts:16` `attributeSessions(sessions, inputs, specs)`: repo-scoped by `worktreePaths` (`gotcha-session-files-span-every-repo`); pass every node name as the spec set.
- Claims: `BoardInputs.claims` (`HeldClaim`, `claims/rules.ts:15-19`): `status: "remote"` + `holder {user, host}` for other machines; local ones carry `status` live/unknown/closed/done/gone. Remote ones never read done (`gotcha-remote-claims-never-read-as-done`): check `inputs.states` for the phase.
- PRs: `BoardInputs.prs` (`PrRow`, `pr/checks/rollup.ts:8-20`): `author` only on open rows; `toPrCell` (`board/joins.ts:68`) gives `verdict`. Branch `feat/<spec>-pr-<group>` names the spec and group (`trees/naming.ts:6-9`).
- `skills/spec/list.md:11-12,25`: the "what is X on" rows and the grep-the-flight-holders fallback.

## Reuse

- `samePerson`, `ownerOf` (`core/people.ts`), `ME` (`board/people.ts:5`). Not `focusWork` (craft → Don't extract).
- Export `focusNow`, `focusSession`, `nowText` rather than re-deriving lane state, session labels or state copy.
- `lane`, `EMPTY`, `ago` (`board/cells.ts`), `alignColumns` (`core/columns.ts`).
- Fixtures: `boardInputs`, `specFixture`, `prRow`, `NOW` (`tests/board-factories.ts`); `heldClaim`, `liveSession` (`tests/factories.ts`); remote claim shape from `tests/board-focus.test.ts:150`.

## Testing issues

- None blocking: `personWork` is pure over `BoardInputs` + `Board`; `personSection` pure over `PersonWork`.
- `tests/board-command.test.ts:103-106` pins `board --who me` text to `FOCUS · me\n  none\n\nIN FLIGHT`; the section now precedes it.
- `board-command.test.ts` is ~160 lines; one new test fits under 250.
- `board/focus.ts` is 150 lines; exporting two functions adds nothing.
