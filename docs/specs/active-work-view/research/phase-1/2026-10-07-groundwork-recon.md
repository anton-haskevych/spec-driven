---
date: 2026-10-07
phase: 1
chunk: groundwork
---

# Phase 1 recon — groundwork extractions

*Source of record — do not edit.* `T` = `skills/spec/tools`. Single inline wave: the craft snapshot
(`research/2026-10-07-craft-names-fixtures-extraction.md`) already mapped the seam; this pins it to HEAD 5d972a3.

## Seam (verified at HEAD)
- `sessionLabel`: `T/trees/find.ts:92-94` (LiveSession → `name ?? session <id8>`); `T/claims/rules.ts:59-61`
  `holderName(claim)` does the same over `Claim.sessionName`. Shared helper takes `(name, sessionId)`.
- `sessionsByWorkspace`: `T/board/joins.ts:40-47` (private, all sessions per owner path); `T/trees/find.ts:87-90`
  `sessionsIn` filters own session + `ownerOf === tree`. Find keeps the own-session filter, reads one bucket.
- `splitKey`: private `T/board/flight.ts:86-89` (indexOf `#`); inline `key.split("#")` at `T/board/attention.ts:73`.
  Note: split vs indexOf differ for a phase containing `#` (impossible: phase ids are `isPhaseId`). Use indexOf.
- `deployWaits`: `T/board/attention.ts:64-76` builds target → waiters; pairs `{ waiter, target }` keep insertion
  order (states order, then phase order, then ref order), so grouping by target reproduces today's map order.
- `olderThanDays`: `T/board/attention.ts:10,44` — strict `<` against `now − 3·DAY_MS`.
- `specSummary`: `T/portfolio/rows.ts:24-37` (priority, due, overdue = `!finished && isOverdue`, progress).
- `toPrCell` / `linkedPrs`: `T/board/joins.ts:60-74`. `byLinks` = links newest first → listed rows → open first,
  else unlisted `{ number, listed: false }` fallback. `linkedPrs` returns the listed PrRows ordered open-first
  then newest-first; `byLinks` keeps the unlisted fallback.
- `launchTitle`: `T/launch/command-line.ts:26-27` (`[spec, sub, normalizePhaseHint(phase)]` joined by space).
  Parse: `SUB_COMMANDS`, `isPhaseId` from `T/context/request.ts`.
- `list`: `T/commands/list.ts:20` — any arg routes to the table; `--local` becomes the filter text → empty table.

## Reuse
- `ownerOf` (`T/workspaces/owner.ts`) stays the path → tree resolver. `rowKey` lives in `T/board/phase-keys.ts`.
- `NOW` in `tests/board-factories.ts`; `specMeta`/`specNode` in `tests/factories.ts`.

## Testing-issue estimate
- No file near 250 lines (largest touched: `trees/find.ts` 105, `portfolio.test.ts` 142).
- All targets are pure; no I/O to untangle. `list` routing becomes pure `listRoute(args)`.
- Exact-text guards: `board-render.test.ts`, `board-lanes.test.ts:86-98` (deploy order).
- Hand-rolled fixtures to migrate (fit-check each): `board-joins.test.ts:9-23` (session, pr),
  `board-claims.test.ts:14-20`, `claims-rules.test.ts:10-14`, `trees-find.test.ts:10-12`,
  `claims-store.test.ts:9`, `claims-remote.test.ts:8`, `claims-remote-take.test.ts:7`, `claims-live.test.ts:16`,
  `claims-taken-over.test.ts:5`. Several derive fields (phase → sessionId, workspace from sessionId): thin
  wrappers stay.
- Suite: 750 tests, ~65 s; typecheck `bunx tsc --noEmit` needs `bun install` in a fresh tree.
