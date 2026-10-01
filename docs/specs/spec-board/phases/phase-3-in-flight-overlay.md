---
needs: [1, 2]
pr: A
---

# Phase 3 — In-flight overlay

**Goal:** The board adds an in-flight lane from every live worktree (ticked or half-done on a branch,
uncommitted), marks ★ on ready rows that share no files with in-flight work, and shows phases unblocked
only on a branch as ready in that workspace. Base state still alone decides ready, blocked and finished.

**Outcome:** The board shows what's being worked on anywhere, not just on main, and is identical from
the main checkout and any worktree except `◀ here` · ~2 s per run including the scan · low risk: the
pure layer only adds.

**Files to touch:**
- `skills/spec/tools/board/activity.ts`, `joins.ts` (new), `board/inputs.ts`, `lanes.ts`, `rank.ts`, `render.ts`
- `skills/spec/tools/graph/overlap.ts` (`sharedPaths`, `inFlightOverlaps`)
- tests: new `board-activity.test.ts`, `board-joins.test.ts`, `graph-overlap.test.ts`; `board-lanes.test.ts`, `board-rank.test.ts`, `board-render.test.ts`, `board-inputs.test.ts`

## Implementation guidance

See `technical.md` → *Activity*, *Lanes*, *Joins*, *Rank*.

**Activity.** `phaseActivity` compares each workspace's `SpecState` with base and fills `tickedIn` and
`wipIn`. It never patches base `nodes` or `states`, so `readySet`, `isFinished` and cross-spec refs see
base only.

**Ready in a workspace.** A waiting phase whose only reasons are `needs` on phases ticked in exactly one
workspace is ready in that workspace. That row gets no ★, and its `target` is that workspace.

**★ overlap.** `sharedPaths` is extracted from `undeclaredOverlaps`. `inFlightOverlaps` uses it with
usage counted over all open specs, and `> HUB_LIMIT` is ignored, as in the existing code.

## Deliverables

- [ ] `phaseActivity`: ticked on a branch, wip on a branch, uncommitted only, same phase ticked in two worktrees, spec only on a branch, a workspace folder without `CLAUDE.md` skipped
- [ ] Lanes: in flight from activity; a spec with every phase ticked on a branch stays on the board; a dependent of a branch-only tick is ready `in <workspace>` with that target, never ★; others stay blocked
- [ ] `sharedPaths` + `inFlightOverlaps` (hub-limited over all open specs, self and finished skipped, declared relations count) — 3 pure tests; `undeclaredOverlaps` unchanged in behavior
- [ ] `rankReady` ★ via `inFlightOverlaps` + `same-files-as`; render `◀ here`, in-flight rows, footer `merged · unknown base · unreadable`
- [ ] `loadBoardInputs` adds the workspace scan; real-git test: base + two worktrees, board text from the main checkout equals board text from a worktree except `◀ here` (sessions and gh injected empty)

## Phase-local notes

- A `tickedIn` phase stays in flight until base has it, whatever its PR state.
