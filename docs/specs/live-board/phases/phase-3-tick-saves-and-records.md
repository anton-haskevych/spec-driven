---
needs: [2a]
pr: B
---

# Phase 3 — A finished task is saved and recorded at once

**Goal:** for a joined spec, finishing a task is one command that pushes the code, marks the task done on the
record with the pushed commit, and can never be refused because of another task.

**Outcome:** a finished task is always on GitHub, and two sessions ticking on one spec, even on one phase,
both land · medium · medium risk: the tick now pushes, so a rejected push stops a tick.

**Files to touch:**
- `skills/spec/tools/plan/phase-writer.ts`, `plan/ops/tick.ts` (new)
- `skills/spec/tools/commands/phase.ts` → dispatcher + `commands/phase/<action>.ts`
- `skills/spec/tools/publish/push.ts` (network options, typed result), `phases/locate.ts`
- `skills/spec/tools/commands/claim.ts` (push on take), `plan/join.ts` (`--from-tree`)
- `skills/spec/tools/runtime/workflow-capabilities.ts`

## Implementation guidance

Introduce the seam here and use it for every action from now on: a `PhaseWriter` port
(tick, add, split, park, unpark, deployed, move, set → one outcome union) with `fileWriter(spec)` wrapping
today's `plan*` + `applyEdits`, and `recordWriter(port, spec)` whose plans are the pure functions in
`plan/ops/`. `phaseWriterFor(projectDir, spec, view)` picks one, once. Outcomes (landed, refused, queued,
plan-changed line) are rendered in one place. Split `commands/phase.ts` into a dispatcher and one file per
action first, as its own commit (the `commands/crew.ts` + `commands/crew/` pattern); this phase moves `tick`
onto the port and leaves the other actions refusing on a joined spec until phase 3a.

`plan/ops/tick.ts` is a plan function: read the phase document at the fresh tip, find the task by id, set it
done with its evidence. It refuses when the task is already done by someone else (who and when, `design.md` →
*What Claude sees*) and answers `already done` when this session did it. It never touches `spec.json`.

The tick's order: push, then write. Call `pushBranch` in `publish/push.ts:18-38` (not `commands/push.ts`,
which returns a string). It has no timeout, can wait on a credential prompt and runs pre-push hooks. Give it
network options and a typed result `pushed | offline | rejected | refused`; the tick passes the timeout,
no-prompt and `--no-verify`. `spec.ts push` keeps today's behaviour. Only `offline` queues the tick (with the
local commit and `unpushed: true`); `rejected` and `refused` refuse it. Store the full sha. When the flush
sends a queued tick it pushes that commit to the branch and refuses if the branch no longer contains it.

Edited code files that are not in the commit are named in the result line; the tick still lands.

Tasks are addressed by id on a joined spec. `phases/locate.ts` keeps `#N` and text-prefix selection for file
specs only.

`join <spec> --from-tree` is a plan too: for each box ticked in this tree and open on the record, matched by
text, mark it done with this tree's head commit. It is how ticks made on the other machine before the join
reach the record.

Codex local-pilot may run `phase tick | park | unpark` today (`runtime/workflow-capabilities.ts:12,34`). On a
joined spec they refuse (`ledger/decision-codex-reads-the-board-refuses-writes.md`).

## Deliverables

- [x] `commands/phase.ts` is a dispatcher over `commands/phase/<action>.ts`; `PhaseWriter` port with `fileWriter` and `recordWriter`, chosen once; one outcome renderer
- [x] `pushBranch` takes network options and returns `pushed | offline | rejected | refused`; `spec.ts push` unchanged
- [x] `phase tick <spec> <phase> <task-id>` on a joined spec: pushes with a timeout, no prompt and no pre-push hooks, then marks the task done with the pushed commit; a rejected push refuses; a repeat says `already done`; task phases and `Gate:` tasks keep the evidence rule; uncommitted code edits are named in the line
- [x] Two clones (real git): tree A ticks 2.3 and tree B ticks 2.4 of the same phase, then A ticks 2.5 and B ticks 3.1; all four land and each sees the other's on its next command
- [x] Offline: ticks 2.3 then 2.4 are both `kept on this machine`, the pack shows both done and the pending count, and one `record sync` lands both and pushes their commits; a queued tick whose commit left the branch is refused and stays
- [x] `join <spec> --from-tree` adds this tree's earlier ticks, matched by text
- [x] Taking a claim pushes the branch so it exists on the remote
- [x] Codex local-pilot: `phase tick | park | unpark` refuse on a joined spec with the line in `technical.md`; tested beside the existing pilot tests

## Phase-local notes

- The first two-clone test is the Nov 11 case end to end.
- `commands/claim.ts` (214 lines) is also edited by `codex-runtime-support` 2b; keep the push in a helper.
