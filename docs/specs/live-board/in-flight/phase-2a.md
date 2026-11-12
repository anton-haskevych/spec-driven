# In-flight state

**Session ended:** 2026-11-12
**Active phase:** 2a — A joined spec is read from the record

## Where things stand

- Deliverables 1–7 are done and ticked. Every reader listed in the phase reads joined specs through the
  command's `PlanSource`; only the file planners (`phases/*.ts`, `commands/join.ts`, `plan/join-copies.ts`) and
  the worktree overlay (`workspaces/views.ts`, which skips joined specs) still call `loadSpecStateFromFiles`.
- Only deliverable 8 is open: phase writers refuse on a joined spec until phase 3, and the spec-file hook gives
  blocking feedback after a checkbox, edge-frontmatter or `progress.md` edit in a joined spec.

## Implicit context

- Writers to guard: `commands/phase.ts` dispatches tick, deployed, add, split, park, unpark. Refusal line from
  the phase entry: `phase tick: <spec> is on the board; this version can't write it yet` (one per action
  word). Decide the joined check with `readLocalPlans(projectDir, systemRunner, now).isJoined(spec)`: a write
  must not fetch just to refuse. Park/unpark write only `in-flight/`, not the plan: check whether they should
  stay allowed (they touch no frozen box) and say so under *Say if wrong*.
- Hook: `hooks/spec-file-check.ts` returns `[]` for `progress.md` today (`:51-62`); it already builds
  `readLocalPlans` at `:66`. The new branch: in a joined spec, an edit to `progress.md`, a phase file's
  checkbox lines or its `needs`/`needs-deployed`/`same-files-as`/`pr` frontmatter → blocking feedback naming
  the command (`phase tick` lands in phase 3; until then say the board can't take the edit yet and to undo it).
  Comparing old vs new needs the file's committed text (`git show HEAD:<path>`) or a diff of checkbox/edge
  lines against the record's tasks and edges: the record is simpler (`plans.joined(spec)`), compare
  `entryTasks` done-state and `phaseFrontmatter` edges with the phase doc.
- Full suite: real-git tests can time out at 5 s under load; rerun with `--timeout 30000`.

## Pick up from here

- Write the refusal in `commands/phase.ts` first (one test per action in a real-git or tree fixture with a
  joined spec, reuse `tests/record-readers.test.ts`'s setup), then the hook branch, then tick deliverable 8.
- Phase 2a is then complete: run update → *Close the phase*; PR B's remaining phases are 3, 3a, 3b, 4.
