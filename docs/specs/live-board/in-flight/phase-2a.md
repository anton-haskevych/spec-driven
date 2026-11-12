# In-flight state

**Session ended:** 2026-11-11
**Active phase:** 2a — A joined spec is read from the record

## Where things stand

- Done and committed: the one count rule (deliverable 1), `stateSourceFor` + `readRecord` + `PlanSource`
  (`plan/read-plans.ts`), one read per command (deliverable 3, ticked). Switched to the source: the board's base
  (`mainline/load.ts`, node marks, overlay skips joined specs), the pack (`commands/context.ts`, shares its source
  with the embedded doctor), `ready`, the doctor (skips `progressIssues` for joined), the spec-file hook (never
  fetches).
- Deliverable 2 is open only because these callers still read files: `pr/actions/open.ts:35`,
  `pr/resolve.ts:46`, `commands/phase.ts:149` → `phases/review-refs.ts:37`, `runtime/codex/entry.ts:94`,
  `trees/place-system.ts:72` (its own checkout copy: skip it for a joined spec, base already holds the record's).
- Deliverable 4 is built (`loadNodes(dir, marks)`); it lacks its test: a spec whose `needs` names a joined,
  finished spec is unblocked (`ready/refs.ts:21-31` through `nodes`), and a stub `progress.md` gets a stage.
- Not started: 5 (activity from evidence), 6 (`Board:` line, tree-ahead line in `context/board-lines.ts`),
  7 (golden board test, `list` caller), 8 (writers refuse, hook branch for checkbox / edges / `progress.md`).

## Implicit context

- `BoardInputs` has no record view yet. Deliverable 5 needs the joined specs' tasks there (or a `PlanSource`
  on `Mainline`, already returned as `mainline.plans`); thread it through `loadBoardInputs`.
- Task evidence today is a full sha (join) or a note; phase 3 writes `<sha> on origin/<branch>`. Activity should
  parse `on origin/(\S+)` and map the branch to a worktree via `loadWorkspaces(git)`.
- Rendered task lines are `- [x] <id> <text> — <evidence>`; `core/gate.ts` `GATE_ITEM` already accepts the id.
- Full suite: 7 real-git tests time out at 5 s under load (push, record-race, codex entry, runtime readers);
  they pass alone with `--timeout 30000`.

## Pick up from here

- Switch the five remaining callers (above) to `readPlansAt` / the board's `plans`, then tick deliverable 2.
- Then deliverable 4's test, then 5.
