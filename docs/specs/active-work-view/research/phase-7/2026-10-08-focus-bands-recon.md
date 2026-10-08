# Phase 7 recon — focus bands

Single wave, read inline: the phase file names every file and the seam is small. `T` = `skills/spec/tools`.

## Seam

- `T/core/spec-meta.ts:36-49` `readFocusFields`: one `problems` list, all errors in the doctor
  (`T/doctor/spec-meta.ts:21`). Needs a second list (warnings) for the legacy number. Exemplar for a
  value list: `T/core/schedule.ts:3-4,19-24` (`PRIORITIES`, case-insensitive find, `"<x>" is not one of …`).
- `T/focus/rank.ts` is used by `focus/plan.ts` (`rankFor`, `focusPosition`, `sortFocus`) and
  `focus/land.ts:11,48` (`focusEntries(loadNodes(...))`). With bands the planner needs only the target
  spec's own `CLAUDE.md`: `land.ts` stops loading every node.
- `T/commands/focus.ts`: `ACTIONS` record with `--top` / `--after` flags via `parseArgs` strict;
  `focusLine` prints `at|to <p>/<n>`.
- `T/board/focus.ts:23-39` `FocusedSpec { node, rank }`, `focusOrder(inputs)` (no `now`), sort rank →
  name; `withFocusPositions` sets `ReadyRow.focus`; `focusLane` copies `rank` onto the row (`:61`).
  Caller `T/board/lanes.ts:46-49` has `now`.
- `T/board/model.ts:48` `ReadyRow.focus`, `:114` `FocusRow.rank`.
- `T/board/render-focus.ts:11-16` one `alignColumns` then `lane()`; `lane()` indents every line two
  spaces (`T/board/cells.ts:21-23`), so a band header is just another line.
- `T/board/render.ts:70-74` `readyNote`: `focus <n>`.
- Order inputs: `specSummary` (`T/portfolio/rows.ts:43-51`) gives due/overdue/priority;
  `priorityRank` exported from `T/core/schedule.ts:68`; `NO_DUE` is private there, and
  `compareSchedule` orders priority before due (the opposite of the band's in-band order).

## Reuse

- Due compare: `compareSchedule` hides `NO_DUE`; export a `compareDue` from `schedule.ts` and use it in
  both (second use).
- `setFrontmatterLine` / `removeFrontmatterLine` unchanged; `parseFrontmatter` to read the target's
  current band inside the planner.

## Testing issues

- Fixtures with numeric focus: `tests/board-focus.test.ts` (`focused(name, n)`),
  `board-render-focus.test.ts` and `board-people.test.ts` (`rank:` in row factories),
  `board-command.test.ts:84-85` (`focus: 10/20`), `focus-land.test.ts` (`claudeMd(n)`),
  `focus-plan.test.ts`, `focus-command.test.ts`, `spec-meta.test.ts`, `doctor.test.ts:31-34`.
- All pure or real-git with existing harness (`repoWithOrigin`); no new fixtures needed.
- Sizes fine: largest touched source is `board/model.ts` 152 lines.
