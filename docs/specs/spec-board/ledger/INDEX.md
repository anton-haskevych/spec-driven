# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-claude-session-files-are-undocumented.md` — [phase 4+] — session files can vanish or drift; liveness fails to unknown
- `gotcha-board-workspaces-are-live-only.md` — [phase 5+] — "gone" checks every worktree, not the live board views
- `docs/specs/_ledger/gotcha-runner-stdout-is-decoded-text.md` — [general] — Runner stdout is decoded text; byte-framed git output breaks
- `docs/specs/_ledger/gotcha-git-archive-fails-on-any-unmatched-pathspec.md` — [general] — git archive exits 128 if any pathspec is empty; archive only matching ones
- `docs/specs/_ledger/gotcha-git-name-only-quotes-non-ascii-paths.md` — [general] — git quotes non-ASCII paths unless -z; spec-doc matching misses them
- `docs/specs/_ledger/gotcha-git-status-glob-pathspec-walks-untracked-dirs.md` — [general] — glob pathspec makes git status walk untracked dirs; pass literal roots
- `docs/specs/_ledger/gotcha-bun-glob-scan-throws-on-missing-cwd.md` — [general] — Bun.Glob scanSync throws ENOENT on a missing cwd; check existsSync

## Principles
- `principle-claim-writes-are-single-atomic-ops.md` — [phase 5] — link to create, rename to take over or prune; the board never writes

## Domain

## Decisions
- `decision-base-from-git-archive-cache.md` — [phase 1+] — base = git archive cache + unchanged loaders, not blobs
- `decision-branch-ticks-never-satisfy-needs-from-main.md` — [phase 3+, load-bearing] — base alone drives readySet/isFinished; branch ticks are activity
- `decision-board-command-surface.md` — [general] — list = board, filters = table, agents use `spec.ts board`
- `decision-launch-targets-row-workspace.md` — [phase 6] — launch cds into the row's worktree or uses claude -w
- `decision-board-inputs-types-apart-from-loader.md` — [phase 2+] — inputs.ts is types; board/load.ts composes sources (no cycle)
- `decision-workspace-scan-is-one-call.md` — [phase 3+] — scanWorkspaces returns live scans + counts; forceLive paths realpath'd
- `decision-in-flight-built-from-activity.md` — [phase 4+] — flight rows from activity; executing is a placeholder; ready-in = overlay
- `decision-board-timing-accepted.md` — [phase 4+] — cold 3.3 s accepted; run phase 4's gh calls alongside the scan
- `decision-prs-and-sessions-join-shape.md` — [phase 5+] — gh lists async, joins refine next, needs-you reads rows; tests stub gh

## Workarounds
- `docs/specs/_ledger/workaround-squash-merge-leaves-local-main-diverged.md` — [general] — squash merge leaves local main diverged; verify tree, reset --keep
