---
kind: decision
applies-to: [phase 4+]
created: 2026-11-12T02:43:21-08:00
---

# Plan apply, tidy, export and the joined-spec doctor as phase 4 built them

What the mode files and later phases call, and where it differs from `technical.md`:

- **`plan apply <spec> --file <draft.json>`** (`commands/plan.ts`, pure `plan/apply.ts`). Draft:
  `{ phases: [{ id, title, outcome?, file, needs, needsDeployed?, sameFilesAs?, pr?, code?, gate?, due?,
  playbook?, tasks: ["<text>", …] }] }`. `needs` is required on every phase; tasks are plain texts, ids
  `<phase>.<n>` are given by the tool, a `Gate:` text sets `gate: true`. Every phase file must already exist
  in the spec folder. Refuses a spec that has `progress.md` (a spec on files uses `join`), the board off,
  offline. On success it writes the stub `progress.md` itself, so create never writes one with the board on.
- **Board-on check** for both join and apply: `plan/board-base.ts` `boardBase(git, branch, neverQueued)`.
  The new-spec batch is `newSpecPlan(planned, verb, seen)` in `commands/join.ts`.
- **Stub** (`plan/banner.ts`): `progressStub(progress, spec, day)` = title (kept, else `# <spec> — Progress`),
  the banner (its day kept) and `manualReadLine(spec)`. `withoutBoardLines` takes both lines out.
- **`join <spec> --tidy`** (`commands/join-tidy.ts`): one commit on the default branch through
  `landOnMain`, which now takes `files: FileEdit[]`. Edges removed = `EDGE_KEYS` (needs, needs-deployed,
  same-files-as, **pr**: the frozen-plan hook's list); gate, code, due stay. Boxes become the template's
  `ON_BOARD` sentence via `replaceTaskLines` (`plan/deliverables.ts`). A file is skipped, and named with its
  holders, when a worktree here (committed off base or uncommitted) or a fetched `origin/feat/<spec>*` branch
  changed it since its merge base (`plan/tidy-holders.ts`). An unreadable worktree refuses the whole tidy.
  Not wired into handoff yet.
- **`record export <spec> [--unjoin]`** (`commands/record-export.ts`, pure `plan/export.ts`): tasks are
  written **without ids** (`fileTaskLine`) so a later join matches them by text; `needs:` on every phase;
  the deployed marker only on done phases. Refuses when any phase file is missing in this tree (an export there
  would drop that phase's tasks). Without `--unjoin` the banner and read line stay. `--unjoin` deletes every
  path under `specs/<spec>/` in one batch after the files are written; the user then commits and publishes.
- **Doctor** (`doctor/joined.ts`): runs instead of the frozen-list checks for a joined spec. Errors: a listed
  phase document that doesn't read. Warnings: a prose file missing here; boxes in a phase file once
  `progress.md` has no phase lines.
