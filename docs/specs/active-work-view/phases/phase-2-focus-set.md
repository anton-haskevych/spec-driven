---
needs: []
pr: B
---

# Phase 2 — Focus set: entries, validation, writer

**Goal:** A team can keep a ranked focus set in `docs/specs/_focus/<spec>.md`, written by
`spec.ts focus add|drop|move`, validated by the doctor and the spec-file hook, and loaded from the
default branch into the board's inputs.

**Outcome:** You can say "put X on top of focus" and Claude records it in the repo for the whole team ·
medium · risk: rank renumbering writes more files than expected (kept to the gap-closing run).

**Files to touch:**
- new: `skills/spec/tools/focus/entries.ts`, `focus/rank.ts`, `focus/plan.ts`, `commands/focus.ts`, `doctor/focus-entry.ts`, `doctor/focus.ts`
- `skills/spec/tools/spec.ts` (command table), `mainline/load.ts` (`loadSpecDocs`), `board/inputs.ts`, `board/load.ts`, `commands/doctor.ts`, `hooks/spec-file-check.ts`
- `skills/spec/tools/tests/factories.ts` (`focusEntry`), new tests `focus-entries`, `focus-rank`, `focus-plan`, `focus-command`; `commands-table.test.ts`, `mainline-load.test.ts` (not `board-inputs.test.ts`, which phase 1 rewrites)
- `skills/spec/list.md`, `skills/spec/SKILL.md` (*Tools* → Focus), `skills/spec/handoff.md`, `README.md`

## Implementation guidance

Follow `technical.md` → *Focus entry file* and *Writer*. Mirror `backlog/items.ts` for the loader
(missing folder → `[]`, malformed file → skipped) and `commands/phase.ts` for the command (`ACTIONS`
record, `FOCUS_USAGE`, `focus <action>: <reason>` errors, planners returning `EditPlan`).

Keep rank arithmetic in `focus/rank.ts` as pure functions over `FocusEntry[]` returning the files to
write; test the gap cases (top at 0, after the last, after with no gap) without touching disk. The
planner only turns those into an `EditPlan`.

Wire `loadFocus` into `loadSpecDocs` so the board reads the set from the base archive, never the cwd;
`BoardInputs.focus` default `[]` in `boardInputs()`. Nothing renders yet (phase 3).

Prose: `list.md` gets a short *Focus* section: the words that mean add/drop/move ("focus on X", "put
X on top", "drop X from focus", "X after Y"), the command each runs, then commit `[focus] <verb>
<spec>` and land like spec docs. `handoff.md`: when the handed-off spec is finished and in focus, run
`focus drop <spec>` and include it in the commit. `SKILL.md` *Tools*: one **Focus.** bullet ending
"A tool command, not a `/spec` sub-command."

## Deliverables

- [ ] `parseFocusEntry` + `loadFocus` (sorted rank, then spec; missing folder; malformed skipped), tests
- [ ] `checkFocusEntry` / `focusIssues` (bad rank, unknown spec, unknown key, duplicate rank) in doctor and the spec-file hook, tests
- [ ] Rank arithmetic (`append`, `top`, `after`, minimal renumber) in `focus/rank.ts`, tests
- [ ] `spec.ts focus add|drop|move` with refusals from `design.md` → *Copy*, registered in `spec.ts`, tests on a `createTree`
- [ ] Focus loaded from the base into `BoardInputs.focus`, test in `mainline-load.test.ts`
- [ ] Prose: `list.md` *Focus*, `SKILL.md` *Tools*, `handoff.md` drop-on-finish, `README.md`

## Phase-local notes

- Folder must be flat `docs/specs/_focus/*.md` (READ_SET doesn't reach subfolders) and never under `_playbook/` (every file there is treated as a playbook).
- `gotcha-github-ignores-merge-union`: no shared index file for the set; the files are the index.
- CRM `workaround-push-spec-docs-to-main-from-a-worktree`: land focus files by adding files, never by pushing a whole `_` folder from a branch.
