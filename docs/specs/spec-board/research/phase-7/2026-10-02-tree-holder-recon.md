---
date: 2026-10-02
phase: 7
chunk: tree-holder
---

# Phase 7 recon — what holds a tree

*Source of record — do not edit.* Two waves × 2 Explore agents (phase-exec lens).

## The seam

- `trees/find.ts:39-46` `busyHolder(tree, sessions, claims, paths, ownSessionId?)` → `string | undefined`.
  Claim branch (`:41-42`): live/unknown claim on the tree by another session → `after <spec> <phase> (<name>)`.
  `!sessions.ok` → `undefined` (`:43`). Session branch (`:44-45`): any other live session with cwd in the
  tree → `after <name>`; `status` is never read.
- Callers answer two different questions with it:
  - **Is anyone working here?** `trees/place.ts:56` (place + launch), `board/tree-target.ts:28` (ready rows'
    `treeBusy`, `safe:false`; `board/lanes.ts:89-93,130-144`).
  - **Is anyone here at all?** `trees/prune.ts:70` (skip trees before `worktree remove`); the string is never shown.
- Output: `commands/trees.ts:44` `trees: <path> is busy, <holder>; not placed`; `commands/launch.ts:22`
  `launch: <path> is busy, <holder>; not launched`; `trees place --json` `placement.holder`; board
  `render.ts:71` prints `treeBusy` verbatim. `execute.md:40` matches the literal `is busy, after …`.
- `LiveSession.status` (`sessions/live.ts:14,36`): "idle" only when the file says so, else "busy" (fails
  toward busy). Only consumer today: board session cell (`board/joins.ts:49-51`).

## Debt found on the path

1. **Comment contradicts code** (`find.ts:39`): "Unknown liveness counts as live, so a broken sessions
   source never shares one", but `:43` returns `undefined` when sessions are unreadable. For prune
   (destructive) that means a tree with an unknowable open session can be removed.
2. **The board never knows its caller.** `BoardInputs` (`board/inputs.ts:28-44`) and `BoardRunners`
   (`board/load.ts:27-31`) carry no env or session id; `tree-target.ts:28` passes no `ownSessionId`. Under
   `--local` (`load.ts:50`, `LOCAL_LIVENESS`) every local claim reads `unknown` and blocks, **including the
   caller's own**, so a session's own tree shows busy on its own board (`execute.md:22` uses `--local`).
3. **Own-session id read four times by hand:** `place.ts:56`, `prune.ts:66`, `claims/live.ts:22`,
   `commands/claim.ts:51` (`env.CLAUDE_CODE_SESSION_ID || undefined`).

## Reuse

- `core/git.ts:9` `gitAt(cwd, runner)`; `core/git-status.ts:5` `parsePorcelainZ`; status flags from
  `workspaces/changes.ts:38-40` (`--no-optional-locks` required: research wave 1 `:54-56`; `-z`).
- No "is this tree clean" helper exists. Cost (project ledger): `status -uno` 0.06 s per CRM tree,
  untracked walk ~0.49 s; never across all trees. One status on the one found tree in `place` is fine.
- `PlaceDeps` already has `env` (`place.ts:24-27`); moving `env` into `BoardRunners` gives the board the
  caller id without a new channel.

## Testing-issue estimate

- `tests/trees-find.test.ts:12` session factory hardcodes `status:"busy"`; needs a status override.
  Everything else in the `busyHolder` tests is inline factories: cheap.
- `tests/trees-command.test.ts:56-59` real repo + session file (`claude.write`, `procStart:"start"`, stubbed
  `ps`); dirty tree = write a file under `treePath()`. Tests run in sequence (`:40` creates the tree).
- `tests/board-lanes.test.ts:28-38`, `board-flight.test.ts:62` assert the claim text; board factories default
  `sessions:"local"` (`board-factories.ts:57`), so the session branch is untested from the board.
- `tests/launch.test.ts:132-139` stubs `PlaceFn`; asserts `is busy, …; not launched`.
- `tests/trees-prune.test.ts:45-48,57,78-85` real repo; busy tree via a `status:"busy"` session file.
- No file near the 250-line cap (largest touched: `board/lanes.ts` 165). `BOARD_VERSION` was never bumped
  for `treeBusy` text changes; the field stays a string.
- `skill-wiring.test.ts` doesn't read `execute.md`; doc wording changes break no test.
