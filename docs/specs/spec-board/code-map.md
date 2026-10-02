# Code Map — Spec Board

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/mainline/base-cache.ts` | `git archive` of the read set into `<git-common-dir>/spec-board/base/<sha>/` | 1 |
| `skills/spec/tools/mainline/load.ts` | pinDefault + base cache + unchanged disk loaders | 1 |
| `skills/spec/tools/board/model.ts` | `Board` (versioned) — the contract every view reads | 1 |
| `skills/spec/tools/board/lanes.ts` | `buildBoard` — pure lane rules | 1 |
| `skills/spec/tools/board/inputs.ts` | `BoardInputs`, `WorkspaceView` — types only | 1 |
| `skills/spec/tools/board/load.ts` | `loadBoardInputs` — composes the sources, the only IO | 1 |
| `skills/spec/tools/commands/board.ts` | `spec.ts board [<lane>] [--json] [--local]` — agent feed | 1 |
| `skills/spec/tools/workspaces/classify.ts` | merged / live / unknown-base / unreadable | 2 |
| `skills/spec/tools/workspaces/changes.ts` | `workspaceSpecChanges` per live worktree | 2 |
| `skills/spec/tools/workspaces/scan.ts` | `scanWorkspaces` — the one call `board/load.ts` makes | 2 |
| `skills/spec/tools/board/activity.ts` | `tickedIn` / `wipIn` — base is never patched | 3 |
| `skills/spec/tools/board/flight.ts` | in-flight rows; `readyInWorkspaces` overlay | 3 |
| `skills/spec/tools/workspaces/views.ts` | each worktree's changed spec states + branch-only nodes | 3 |
| `skills/spec/tools/sessions/live.ts` | Only reader of `~/.claude/sessions/*.json` | 4 |
| `skills/spec/tools/sessions/proc-starts.ts` | one `TZ=UTC ps` call: pid → start time | 4 |
| `skills/spec/tools/pr/gh-lists.ts` | `fetchPrLists` — open + recent `gh pr list`, async | 4 |
| `skills/spec/tools/pr/rollup.ts` | `rollupToChecks` must agree with gh's `bucket`; `toPrRows` | 4 |
| `skills/spec/tools/board/joins.ts` | sessions and PRs onto in-flight rows; sets `fix CI` / `merge` | 4 |
| `skills/spec/tools/claims/store.ts` | Atomic claim create / takeover / release | 5 |
| `skills/spec/tools/claims/rules.ts` | `claimStatus` precedence; `takeRefusal`; `holderName`; `HeldClaim` | 5 |
| `skills/spec/tools/claims/atomic-file.ts` | link-create, rename-verify-restore, ENOENT-safe read | 5 |
| `skills/spec/tools/claims/held.ts` | `claimContext` + `heldClaims` — the board loader's and claim command's one IO path | 5 |
| `skills/spec/tools/claims/live.ts` | `heldByOthers` — the only claim IO the packs do | 5 |
| `skills/spec/tools/commands/claim.ts` | `spec.ts claim take\|release\|list`; `claim:` vs `claim refused:` lines | 5 |
| `skills/spec/tools/context/held-phases.ts` | `firstUnheld`, `specsInFlight` for the packs | 5 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/core/run.ts` | `RunOptions.timeoutMs`, `AsyncRunner`; stdout is decoded text | `docs/specs/_ledger/gotcha-runner-stdout-is-decoded-text.md` |
| `skills/spec/tools/publish/snapshot.ts` | `pinDefault` reused; `specDocChanges` name taken | |
| `skills/spec/tools/graph/nodes.ts` | `isFinished` — must only ever see base state | `decision-branch-ticks-never-satisfy-needs-from-main.md` |
| `skills/spec/tools/ready/ready-set.ts` | `readySet` — fed base state only | `decision-branch-ticks-never-satisfy-needs-from-main.md` |
| `skills/spec/tools/graph/overlap.ts` | `sharedPaths` core shared with `undeclaredOverlaps` | |
| `skills/spec/tools/commands/list.ts` | board default; `portfolioTable` keeps today's table | `decision-board-command-surface.md` |
| `skills/spec/tools/commands/context.ts` | the pick skips live-claimed phases | |
| `skills/spec/tools/context/packs.ts` | resume suggestion skips live-claimed phases | |
| `skills/spec/tools/pr/resolve.ts` | `specPrNumbers` — pr-opening.md links, reused for `prLinks` | |
| `skills/spec/tools/launch/command-line.ts`, `commands/launch.ts` | phase in prompt + title; `launch execute <spec> <phase>` places the tree, then `cd <tree> && claude` | `decision-trees-placed-by-spec-driven.md` |
| `skills/spec/tools/context/claims-here.ts` | claims taken in this worktree; no-spec context reads them before changed files | |
| `skills/spec/tools/trees/place.ts` | `placeTree` — find, busy, add, setup for a spec PR group | `decision-trees-placed-by-spec-driven.md` |
| `skills/spec/tools/trees/find.ts` | `findTree` (branch, then claims/activity); `treeHolder` (place, launch, board) and `treeOccupant` (prune) | `decision-tree-held-by-work.md` |
| `skills/spec/tools/trees/uncommitted.ts` | `hasUncommittedChanges` — one status on one tree, for placement | `decision-tree-held-by-work.md` |
| `skills/spec/tools/sessions/own.ts`, `core/env.ts` | `ownSessionId(env)`, the one reader of `CLAUDE_CODE_SESSION_ID`; `Env` | |
| `skills/spec/tools/trees/acquire.ts` | `addTree` — local branch, origin's branch, or fresh origin/<default> | |
| `skills/spec/tools/trees/local-settings.ts` | personal `worktrees.root` in `<git-common-dir>/spec-driven/local.md` | |
| `skills/spec/tools/trees/prune.ts`, `prune-rules.ts` | merged by ancestry or merged PR head; remove refuses edits | `docs/specs/_ledger/gotcha-squash-merged-branch-is-not-an-ancestor.md` |
| `skills/spec/tools/board/tree-target.ts` | ready row target = PR group's tree; busy note from `treeHolder`, caller excluded, no uncommitted check | `decision-tree-held-by-work.md` |
| `skills/spec/execute.md` | §1 opens with `trees place` (+ `EnterWorktree`), then `claim take` | `decision-trees-placed-by-spec-driven.md` |
| `skills/spec/handoff.md` | release, then SKILL.md *Next sessions* | |
| `skills/spec/list.md` | board, filters → table, lanes → `board` | |

## External references

- `~/.claude/sessions/<pid>.json` — undocumented Claude Code session files (`ledger/gotcha-claude-session-files-are-undocumented.md`)
- `claude -w <name>` — CLI flag that creates a worktree through the WorktreeCreate hook
