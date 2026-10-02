# Phase 5b — board rows target the PR group's tree: recon + preflight

Paths relative to `skills/spec/tools/`.

## Seam

- `board/lanes.ts:127` (`phaseRow`): `newWorktree: <spec>-<phase>`, one tree per phase. Academy 2, 8, 9 (`pr: A`)
  became three trees.
- `board/rank.ts` `markSafe` keeps `safe: false` rows as they are, so a busy row only needs `safe: false`.
- `board/attention.ts` `needsYou`; `inputs.counts.merged` (ancestry, claimed trees excluded) already exists.

## Findings that change the plan

1. **Reuse `findTree` / `busyHolder` from `trees/find.ts`, don't re-derive.** The board's live views lack
   `prunable`, so `findTree` is generic over `TreeRef = { path, branch?, prunable? }`.
2. **Ready-in-workspace rows** (`readyIn`) target the worktree where their needs are ticked, not the group tree.
   They get their busy check from that worktree, and the busy note takes precedence over the readyIn note
   (dogfood: `spec-board · 6` was ready in this checkout while this session held it).
3. **`new: <root>/<spec>-pr-<group>` → `newWorktree: <spec>-pr-<group>`.** The board can't know the personal
   root without IO. The terminal never shows targets, and launch runs `trees place`, which resolves the root.
4. **Prune count = ancestry only.** Squash-merged trees would need head SHAs in `WorkspaceView` and
   `headRefOid` in the PR lists. `trees prune` counts them; the board nudges. CRM 2026-10-01: board 43, prune 42
   (prune also leaves out trees with a live session).

## Amendments

- The merged count moves from the footer to *Needs you* (`prune N merged trees`), so it isn't shown twice.
- `--local`: sessions are skipped, so every claimed tree reads busy (unknown liveness counts as held).
