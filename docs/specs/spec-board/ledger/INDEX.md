# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-claude-session-files-are-undocumented.md` — [phase 4+] — session files can vanish or drift; liveness fails to unknown
- `docs/specs/_ledger/gotcha-runner-stdout-is-decoded-text.md` — [general] — Runner stdout is decoded text; byte-framed git output breaks
- `docs/specs/_ledger/gotcha-git-archive-fails-on-any-unmatched-pathspec.md` — [general] — git archive exits 128 if any pathspec is empty; archive only matching ones

## Principles
- `principle-claim-writes-are-single-atomic-ops.md` — [phase 5] — link to create, rename to take over; the board never writes

## Domain

## Decisions
- `decision-base-from-git-archive-cache.md` — [phase 1+] — base = git archive cache + unchanged loaders, not blobs
- `decision-branch-ticks-never-satisfy-needs-from-main.md` — [phase 3+, load-bearing] — base alone drives readySet/isFinished; branch ticks are activity
- `decision-board-command-surface.md` — [general] — list = board, filters = table, agents use `spec.ts board`
- `decision-launch-targets-row-workspace.md` — [phase 6] — launch cds into the row's worktree or uses claude -w
- `decision-board-inputs-types-apart-from-loader.md` — [phase 2+] — inputs.ts is types; board/load.ts composes sources (no cycle)

## Workarounds
