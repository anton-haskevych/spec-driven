---
needs: [3]
pr: B
---

# Phase 3a — Plan changes are written at once

**Goal:** adding or splitting a phase, moving tasks, editing a phase's edges or PR group, parking a question
and marking a deploy are single commands that write a joined spec's record in one batch, and work on a file
spec too.

**Outcome:** two sessions on one spec stop overwriting each other's plan: a review adding a phase and a
session re-grouping another both land · medium · medium risk: seven actions move onto the port.

**Files to touch:**
- `skills/spec/tools/plan/ops/add.ts`, `split.ts`, `move.ts`, `set.ts`, `park.ts`, `deployed.ts` (new)
- `skills/spec/tools/commands/phase/<action>.ts`, `plan/phase-writer.ts`
- `skills/spec/tools/phases/move-items.ts`, `phases/template.ts` (the file writer's `set` and `move`)

## Implementation guidance

Every action here is a plan function in `plan/ops/` behind the `PhaseWriter` port from phase 3. Each one reads
`spec.json` and the phase documents at the fresh tip, so `planVersion + 1`, the next lettered id and the next
task id are computed there, and the edge and cycle checks (`doctor`'s `phaseEdgeIssues`) run against that tip.
That is what lets `phase add` and `phase set` on different phases both land, and what stops two sessions
adding edges that together make a cycle: every plan change writes `spec.json`, so the second one re-plans and
sees the first.

A tick is not a plan change and never raises `planVersion` (phase 3).

A split keeps the phase's id and adds lettered parts (`phases/split.ts`, `nextLetterIds`), on the record as in
files. A claim on the phase stays valid.

`phase move` and `phase set` are new. Give the file writer its side too (`set` edits the phase file's
frontmatter through `applyEdits`; `move` uses `phases/move-items.ts`), so a mode file can say "run `phase set`"
without asking whether the spec has joined. Task ids exist only on the record; on a file spec `move` selects
tasks as `tick` does today.

`phase park` writes a question document in phase 7; here it keeps its current shape, inside the phase document.

## Deliverables

- [x] `phase add`, `split`, `deployed`, `park` and `unpark` on the port: one batch for a joined spec, today's file edits otherwise
- [x] `phase move <spec> <task-id…> --to <phase>` and `phase set <spec> <phase> --needs | --pr | --gate | --title | --outcome`, for both homes; ids stay with the tasks
- [x] Every plan change raises `planVersion` and re-checks edges and cycles against the tip it lands on
- [x] Two clones (real git): one adds a phase while the other moves a task between two other phases; both land. One adds the edge 5→3 while the other adds 3→5; the second is refused as a cycle
- [x] Offline: each command returns `kept on this machine` with the pending count

## Phase-local notes

- `issuesIntroducedBy` (`phases/validate.ts`) diffs files; the record path uses the readers and the same edge
  checks on documents instead.
