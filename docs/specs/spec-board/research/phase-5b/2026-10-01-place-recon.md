# Phase 5b — `trees place` + setup + personal layer: recon

Chunk: deliverables 1–3 (place, setup, personal layer). Paths relative to `skills/spec/tools/`.

## Seam

- **Worktrees:** `workspaces/list.ts:17` `loadWorkspaces(git)` → canonical `Workspace { path, head, branch?, detached, locked, prunable, isMain }`. Reuse as is for find-by-branch and root detection.
- **Scan fallback:** `board/load.ts:41` `loadBoardInputs(dir, { local: true }, runners)` gives base `states` (phase `edges.pr`), `workspaces: WorkspaceView[]` (per-tree spec states) and `currentPath`. `board/activity.ts:11` `phaseActivity(states, views)` → `spec#phase` → `{ tickedIn, wipIn }` paths. The PR-group tree = a non-default-branch view with activity on a phase of the same `pr`.
- **Fresh base:** `publish/snapshot.ts:24` `pinDefault(git, branch, { timeoutMs })`; on failure `originTip` (`:30`). `mainline/load.ts:53` `pinBase` is the same fallback pattern (private).
- **Busy:** sessions from `sessions/live.ts:39` `loadLiveSessions(claudeHome, psProcStarts(runner))`; owner of a cwd = deepest worktree path that is a path-segment prefix (`board/joins.ts:42` `sessionsByWorkspace`, private). Claims: `claims/held.ts:17` `heldClaims(git, sessions, states)` → `HeldClaim { claim, status }`; `claim.workspace` is canonical. Own session excluded by `env.CLAUDE_CODE_SESSION_ID` (pattern: `claims/live.ts:19`).
- **Common dir:** `git rev-parse --path-format=absolute --git-common-dir`, written out in `claims/store.ts:33` and `mainline/load.ts:46`. Repo name: `board/load.ts:97` `repoName(commonDir)`.
- **Command shape:** `spec.ts:21` `Command { usage, run }`, registered in `COMMANDS`; deps default-valued (`commands/claim.ts:32` `systemClaimDeps`, `ClaimDeps extends BoardDeps { env, host }`).
- **Settings:** `playbook/settings.ts:33` `loadSettings(dir).gates.bootstrap` — a gate *name*.

## Reuse

- `.worktreeinclude` matching: git does it. Probe 2026-10-01: `git ls-files -z -o -i --exclude-from=.worktreeinclude` then `git check-ignore -z --stdin` keeps only gitignored matches (`README.extra`, untracked but not ignored, dropped; `node_modules/` not listed). No glob library.
- Frontmatter read: `core/frontmatter.ts` `parseFrontmatter` + `recordField` + `stringField`. No YAML writer exists; the personal file is written whole (one key) when missing.

## Testing-issue estimate

- **Gates are text, not commands.** `playbook/gates.ts` parses `- [ ]` checklists; `execute.md` §1 *Fresh worktree?* already has Claude do `gates.bootstrap`. The tool cannot "run" the gate; it can only report it. → preflight.
- Real-git tests: `tests/git-repo.ts` `repoWithOrigin` + `addWorktree` (siblings under `root`) cover find/take-over/create. Need a remote-only branch: push from a `clone()`.
- `HOME` is never stubbed; the default root (`~/claude-worktrees/<repo>`) must take `home` as a parameter.
- Sessions faked through `createTree` claude home + `ps` stub (`tests/claim-command.test.ts:16`).
- `commands/claim.ts` is 215 lines: don't add to it. `sessionsByWorkspace` is private in `board/joins.ts`: second use → extract.
