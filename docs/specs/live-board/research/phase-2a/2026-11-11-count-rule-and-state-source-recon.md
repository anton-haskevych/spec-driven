# Phase 2a recon — count rule, state source, callers

One wave (two Explore agents), 2026-11-11. Paths under `skills/spec/tools/`.

## The seam

- **Count rules (three, disagree).** `core/phase-entry.ts:18-32` counts Deliverables-section tasks only
  (falls back to all); `phases/tick.ts:41` and `doctor/phases.ts:19` use `countCheckboxes`
  (`core/progress.ts:44-48`), every box in the file, frontmatter included. Concrete split: Deliverables all
  ticked + an open box under `## Verification` → the summary says 2/2 (status `WIP (2/2)`), tick never sets
  `phaseComplete`, doctor warns nothing. `locateOpenItem` (`phases/locate.ts:47-51`) and `entryTasks`
  (`plan/entry-tasks.ts:21`) only see `-*+` bullets; `outlineMarkdown` also sees ordered lists (an ordered-list
  box can be counted but never ticked; out of scope here).
- **`SpecState` loaders.** `core/spec-state.ts:42` `loadSpecState`; 24 non-test callers, all disk. Board path:
  `mainline/load.ts:67-80` `loadSpecDocs` (loops every base spec, base cache dir), `workspaces/views.ts:15`
  (worktree overlay), `board/load.ts:49-63` composes; `BoardRunners` (`board/load.ts:28`) is the deps object
  shared by board, list, claim, crew tick and trees place. One-spec callers: `commands/context.ts:78`,
  `commands/ready.ts:11`, `trees/place-system.ts:72`, `pr/actions/open.ts:35`, `pr/resolve.ts:46`,
  `commands/phase.ts:149` → `phases/review-refs.ts:37` (loops other specs), `hooks/spec-file-check.ts:65`,
  `runtime/codex/entry.ts:94`, `doctor/run.ts:34` (loops via `commands/doctor.ts:37`), plus `commands/join.ts:73`
  and `plan/join-copies.ts:16`, which must stay on files (join reads files by definition).
- **`graph/nodes.ts:38-56`** parses `progress.md` itself into `PhaseMark {id, done, deployed}`; 11 callers of
  `loadNodes`, 13 users of `isFinished`. `ready/refs.ts:21-31` copies the marks.
- **`board/activity.ts:11-43`** `PhaseActivity {tickedIn, wipIn}` holds worktree *paths*; built from
  `WorkspaceView.states` vs base. Consumers key on path: `claims/rules.ts:48-57` (vs `currentPath`),
  `trees/find.ts:98-103` (vs `worktree.path`), `board/flight.ts:21-66`.
- **`hooks/spec-file-check.ts:51-62`** returns `[]` for `progress.md`; `phases/*` → `phaseFileIssues`
  (`:64-75`); blocking output at `:82-95`, fails open.
- **No reader opens a `RecordView` yet.** Only `record/write.ts:33` does (`openRecordView(port, tip)`);
  `record/mirror.ts` has `readRecordCopy` / `refreshRecordCopy`; `commands/record.ts` shows the fetch / copy /
  age pattern.

## Reuse

- The docs → state mapping already exists as a test helper: `tests/plan-join-golden.test.ts:10-25`
  `stateFromDocs` (done = ≥1 task and all done). Lift it into `plan/state-source.ts` and point the test at it.
- `entryTasks` / `taskKey` (`plan/entry-tasks.ts`) for "tree ahead of the board"; `formatTickedItem`
  (`core/checkbox.ts:23-29`) for rendering a task line.
- `fetchRecordTip` + `openRecordView` + `RECORD_TRACKING_REF` for the one view per command; offline falls back
  to the tracking ref, as `commands/record.ts` does.
- Test helpers: `tests/fake-record.ts` `viewOf(docs)`, `tests/record-factories.ts` `specDoc/phaseDoc/task`,
  `tests/board-factories.ts` `specFixture/boardInputs/workspaceView`, `tests/factories.ts` `phaseState`.

## Testing-issue estimate

- Files near the cap: `board/lanes.ts` 204, `context/packs.ts` 162 (pack lines go to `context/board-lines.ts`),
  `commands/phase.ts` 171, `board/load.ts` 117, `commands/context.ts` 116, `hooks/spec-file-check.ts` 106.
- `mainline/load.ts` and `loadNodes` take a directory and do I/O: inject the view as a parameter, don't fetch
  inside. "Fetch once over 40 specs" is testable with a counting `RecordPort` fake.
- Count-rule unification changes tick's and doctor's behaviour only for boxes outside a Deliverables section;
  `tick.test.ts`, `doctor.test.ts` pin today's behaviour and need checking.
