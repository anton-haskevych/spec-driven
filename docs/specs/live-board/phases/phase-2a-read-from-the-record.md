---
needs: [2]
pr: B
---

# Phase 2a — A joined spec is read from the record

**Goal:** every reader (packs, ready set, board, list, graph, doctor, claim take, trees place) takes a joined
spec's phase list, done marks and task counts from the record instead of the worktree's files.

**Outcome:** with the switch on, "what's ready" and "what's left" for a joined spec are the same in every
worktree. Off by default, so nothing changes until phase 5 · large · medium risk: every reader's input changes,
guarded by the existing suites staying green for file specs.

**Files to touch:**
- `skills/spec/tools/plan/state-source.ts` (new), `core/spec-state.ts` (loader renamed
  `loadSpecStateFromFiles`), `core/phase-entry.ts` (one count rule, over tasks)
- callers: `commands/context.ts`, `commands/ready.ts`, `mainline/load.ts`, `workspaces/views.ts`,
  `doctor/run.ts`, `trees/place-system.ts`, `pr/actions/open.ts`, `pr/resolve.ts`, `commands/phase.ts`,
  `phases/review-refs.ts`, `hooks/spec-file-check.ts`, `runtime/codex/entry.ts`
- `skills/spec/tools/graph/nodes.ts`, `board/activity.ts`, `doctor/phases.ts`
- `skills/spec/tools/context/packs.ts`, `context/board-lines.ts` (new)

## Implementation guidance

The seam is `SpecState`: `plan/state-source.ts` builds it from documents, so lanes, the ready set and the packs
need no change of their own. But five readers sit **outside** that funnel, and each one misbehaves on the day
the board turns on unless this phase moves it (`ledger/gotcha-readers-outside-the-spec-state-funnel.md`):

1. `graph/nodes.ts:42-46` parses `progress.md` again for done marks. They feed `isFinished`, cross-spec `needs`
   (`ready/refs.ts:21-29`), lanes, overlap and the list. Take them from the same view for a joined spec.
2. `hasProgress` gates the pack (`commands/context.ts:80`), the board's stage (`mainline/load.ts:72`) and the
   Codex entry (`runtime/codex/entry.ts:95`). The record path sets it true.
3. `PhaseActivity` (`board/activity.ts:35-42`) is built from the worktree overlay and feeds claim take's "in
   progress in another tree" refusal and `trees place`. For a joined spec build it from task evidence: done
   `on origin/<branch>` → the worktree on that branch. Don't edit `claims/`: it receives the activity.
4. `summarizePhaseEntry` (`core/phase-entry.ts:18-31`) counts checkboxes in text. A joined spec's prose file
   still has its frozen boxes until tidy. Build `summary` from the task documents, and build `entry` as the
   prose with its Deliverables section removed and the live tasks rendered in its place.
5. The doctor's `progressIssues` and `phases/validate.ts` check the frozen files. Skip the first for joined
   specs; the second stays with the file planners.

Fold the three count rules into one first, as its own commit (`core/phase-entry.ts:21-23`, `phases/tick.ts:41`,
`doctor/phases.ts:19`): today a phase can look complete on the board while tick refuses to close it. The one
rule takes a list of tasks.

Resolve the source once per command (`technical.md` → *Reading a joined spec*): one `RecordView`, passed down.
`mainline/load.ts:70` loops over every spec; it must not fetch or re-open the copy per spec. Hooks and the
doctor read the local copy and never fetch.

The file planners in `phases/*.ts` keep `loadSpecStateFromFiles`. Until phase 3 gives them a record path, a
phase write on a joined spec refuses: `phase tick: <spec> is on the board; this version can't write it yet`.

Every pack line that comes from the record lives in `context/board-lines.ts`; `context/packs.ts` (162 lines,
edited by five phases) only calls it.

## Deliverables

- [x] One task-count rule in `core/phase-entry.ts` that takes tasks, used by tick, the doctor and the packs
- [x] `stateSourceFor(projectDir, view)`: a joined spec as today's `SpecState` with `hasProgress`, summary from task documents, `entry` without the frozen Deliverables section; every listed caller uses it; file specs unchanged
- [x] One `RecordView` per command; a test that `board` over 40 specs fetches once, and that the spec-file hook and the doctor never fetch
- [x] `loadNodes` takes a joined spec's done and deployed marks from the view: a spec that needs a joined, finished spec is unblocked; a joined spec with a stub `progress.md` still gets a pack, a stage and `isFinished`
- [x] `PhaseActivity` for joined specs from task evidence: `claim take` refuses a phase with tasks done in another tree, and `trees place` returns that tree
- [x] Packs open with the `Board:` line (live, or local copy with its age), show tasks with ids under the phase's prose, and say when this tree's boxes are ahead of the record
- [ ] Board, ready, list and doctor read joined specs from the record with no worktree overlay and no frozen-file checks; a golden board test with one joined and one file spec side by side
- [ ] Phase writers refuse on a joined spec until phase 3; the spec-file check gives blocking feedback after a checkbox, edge frontmatter or `progress.md` edit in a joined spec and names the command to use

## Phase-local notes

- `gotcha-trees-place-reads-pr-group-from-base`: for a joined spec `trees place` must take `pr:` from the record.
- `gotcha-board-lane-json-is-the-whole-model`: no lane filter here; change inputs only.
- The spec-file check is a PostToolUse hook: it can't stop the edit, only make Claude undo it. It doesn't look at `progress.md` today (`hooks/spec-file-check.ts:51-62`); that branch is new.
