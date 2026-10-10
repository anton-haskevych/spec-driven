# Phase 2 recon — babysit log and `pr log`

Single wave, done inline: the seam was obvious from the phase entry and technical.md → Babysit log.

## Seam
- `core/git.ts:40` `gitCommonDir` — `stateDir` lands next to it.
- `claims/store.ts:33-36` `claimsDir` builds `join(common, "spec-board", "claims")` by hand.
- `mainline/base-cache.ts:11` builds `join(commonDir, "spec-board", "base")`; takes `commonDir: string`
  (its caller `mainline/load.ts:49-55` needs `commonDir` for its own result), so the pure
  `stateDirIn(commonDir, …)` form fits there; `stateDir(git, …)` for the rest.
- `commands/pr.ts` `ACTIONS` table; verbs in `commands/pr/<verb>.ts` (exemplar `commands/pr/status.ts`).
- `pr/resolve.ts` `resolvePr(gh, dir, target)` — reuse for a non-numeric target; a bare number needs no gh call.
- New: `pr/babysit/log.ts`.

## Reuse
- `readTextIfExists` (`core/files.ts:3`), `parseJson`/`isRecord`/`stringField` (claims parse pattern, `claims/store.ts`).
- `alignColumns` not needed: timeline lines are `HH:MM event · detail`.

## Testing issues
- File I/O split: pure `parseEvents(text)` + `renderTimeline(events, skipped, tz)`; thin `appendEvent`/`readEvents` over a temp dir.
- Local time: `renderTimeline` takes the zone (`Intl.DateTimeFormat` with `timeZone`), tests pass `America/Los_Angeles` (ledger gotcha: bun test runs in UTC).
- Command test: `createTree` is not a git repo; use `repoWithOrigin` + `isolatedRunner` for `stateDir`, stub gh only for non-numeric targets.
- Sizes: all touched files are well under the cap (git.ts 42, store.ts 114, base-cache.ts 74).
