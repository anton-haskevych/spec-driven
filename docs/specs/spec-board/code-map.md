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
| `skills/spec/tools/claims/store.ts` | Atomic claim create / takeover / release | 5 |
| `skills/spec/tools/claims/rules.ts` | `claimStatus` precedence | 5 |

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
| `skills/spec/tools/pr/gh-records.ts` | `rollupToChecks` must agree with gh's `bucket` | |
| `skills/spec/tools/launch/command-line.ts` | phase hint, `cd <worktree>` or `claude -w` | `decision-launch-targets-row-workspace.md` |
| `skills/spec/execute.md` | §1 first line: `claim take` | |
| `skills/spec/handoff.md` | release + `Ready next:` / `Needs you:` | |
| `skills/spec/list.md` | board, filters → table, lanes → `board` | |

## External references

- `~/.claude/sessions/<pid>.json` — undocumented Claude Code session files (`ledger/gotcha-claude-session-files-are-undocumented.md`)
- `claude -w <name>` — CLI flag that creates a worktree through the WorktreeCreate hook
