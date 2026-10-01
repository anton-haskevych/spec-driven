# Phase 5 recon — packs, board, wiring (items 4–6)

One wave (2 Explore agents). Paths relative to `skills/spec/tools/`.

## Seam

- **Packs:** execute pick at `commands/context.ts:62` (`hinted ?? input.ready.ready[0]`), pick note `:64-65`;
  resume next chunk at `context/packs.ts:35`. `contextPack(projectDir, request, runner = systemRunner)`; only
  production caller `spec.ts:30`; no hook calls it. `tests/context.test.ts` runs in a plain tmpdir (no git).
- **Overlap line:** `graph/render.ts:22-24` `renderLinks(links, overlaps)`; data from
  `commands/graph.ts:22-34` `neighborhoodReport(nodes, name, projectDir)` (callers: `graphCommand`, `context.ts:48`).
  No test asserts the overlap text.
- **Board load:** `board/load.ts:39-67`; `forceLive` is `new Set()` at `:47`; `scanWorkspaces` hides the full
  worktree list (`workspaces/scan.ts:13-16`), so `gone` needs `loadWorkspaces(git)` again. Sessions are
  `"local"` under `--local` (`:62`).
- **In flight:** `board/flight.ts:16-34` `flightRows(activity, inputs)` iterates activity only; a claim-only phase
  never enters. `FlightRow` (`board/model.ts:27-36`) has no holder; `SessionCell` already declares `closed`
  (`model.ts:13`) but nothing emits it.
- **Session join:** `board/joins.ts:11-20` cwd-prefix only; claim-sessionId join goes in the per-row map `:16-19`.
- **Needs you:** `board/attention.ts:8-11`; `AttentionRow` union `model.ts:60-64`; `render.ts:81-86` falls through
  to `deploy` formatting, so a new kind needs its own branch.
- **Docs:** `execute.md:33-39` §1; `handoff.md:115-152` *Commit* (push at `:145-150`), `:172` "Do not suggest
  further work" (phase 6 amends it); `SKILL.md:90-100` *Tools* (no Claims bullet), `:135-143` *Next-chunk rule*.
  `skill-wiring.test.ts` asserts none of these lines.

## Reuse

`claimStatus`/`isStale` (claims/rules.ts), `loadClaims`/`claimsDir` (claims/store.ts), `holderName`
(commands/claim.ts, export on second use), `boardInputs` factory (`tests/board-factories.ts:46-62`).

## Testing-issue estimate

- `BoardInputs.claims` is a new required field → default it in `boardInputs` factory.
- `board-flight.test.ts:19` asserts full `FlightRow` with `toEqual`: only add fields when a claim exists.
- `context.test.ts:149` relies on block order: add claim notes inside existing blocks, not as new blocks.
- No file near 250 lines (`board/lanes.ts` 155, `context/packs.ts` 132, `commands/claim.ts` 145).
