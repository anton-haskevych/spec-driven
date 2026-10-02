# Phase 5 recon — store, claimStatus, claim command (items 1–3)

One wave (2 Explore agents). Paths relative to `skills/spec/tools/`.

## Seam

- **Command table:** `spec.ts:25-44` `COMMANDS`, `Command.run` may return a Promise (`spec.ts:20-23`). Usage
  exported as `X_USAGE` from the command module; `commands-table.test.ts` only needs `usage` to start with
  the name. Not a `/spec` sub-command → `skill-wiring.test.ts` untouched.
- **Env injection precedent:** `commands/launch.ts:7` `launchReport(dir, args, env = process.env, runner)`.
  Deps-object precedent: `commands/board.ts:10-18` `BoardDeps` + `systemBoardDeps()` (claudeHome from
  `CLAUDE_CONFIG_DIR ?? ~/.claude`).
- **Git:** `core/git.ts:9` `gitAt(cwd, runner).out([...])` → `Result<string>`. Common dir query exists
  privately in `mainline/load.ts:46` (`repoFacts`); top level privately in `board/load.ts:86-90`
  (`checkoutRoot`, realpath'd).
- **Paths:** `workspaces/list.ts:24` `canonicalPath` is private; copies at `sessions/live.ts:85` and
  `board/load.ts:89`. Claims are the third/fourth use → export it.
- **Everything take needs is in `loadBoardInputs(dir, { local: true }, runners)`** (`board/load.ts:39`): base
  `states`, `workspaces` (live views), `currentPath`. `local` skips fetch, gh and sessions. Sessions are then
  loaded with `loadLiveSessions(claudeHome, psProcStarts(runner))` (`sessions/live.ts:33`).
- **Activity:** `board/activity.ts:11` `phaseActivity(states, workspaces)` keyed by `rowKey` = `spec#phase`
  (`board/phase-keys.ts:19`). Phases done on base are skipped.
- **"gone" needs every worktree**, not only live scans: `loadWorkspaces(git)` (`workspaces/list.ts:17`).
- No `Claim` type exists yet; `BoardInputs` has no `claims` field (added in the board chunk).

## Reuse

- `Result<T>` (`core/result.ts`), `gitAt`, `loadBoardInputs` local, `phaseActivity`, `rowKey`,
  `loadLiveSessions`, `loadWorkspaces`, `canonicalPath` (export).
- Phase ids that exist only on the branch (e.g. this spec's 5a) come from the caller's own workspace view.

## Testing-issue estimate

- Temp repos: `tests/git-repo.ts` `repoWithOrigin`, `addWorktree`, `isolatedRunner/AsyncRunner`; spec files
  written inline (`board-command.test.ts:19-25`). Temp dirs: `tests/tree.ts` `createTree`.
- Sessions: `tests/fixtures/session-busy.json` + a `ProcStarts` lambda; real-pid variant at
  `board-inputs.test.ts:97-115`.
- **Race tests** need real concurrency: single-threaded JS can't interleave `linkSync`. Spawn two `bun`
  processes on one temp dir with a start barrier, repeat N times.
- Store functions take a dir → pure filesystem tests, no git. `claimStatus` pure → table test.
- No file near 250 lines (largest touched: `board/lanes.ts` 155).
- Smell: `canonicalPath` duplicated three times already.
