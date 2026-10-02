# Phase 6 recon — loop wiring (2026-10-01)

Inline, single wave: the seam was visible from the pack and four file reads.

## Seam

- **Launch.**
  - `launch/command-line.ts` `sessionLaunch` takes `<sub> <spec>` only: no phase, no tree.
  - `commands/launch.ts` `launchReport` is sync; it is registered in `spec.ts:46`.
  - Placement is `trees/place.ts` `placeTree` (async). `commands/trees.ts` exports `renderPlacement` and `systemPlaceDeps`.
  - The phase-id regex is `context/request.ts:12` (`PHASE_ID`, not exported).
- **No spec named.** `commands/context.ts` `contextPack`:
  - With 1 candidate it builds the inferred pack.
  - With 0 it returns "Infer it from the conversation"; with several it says "Ask which one".
  - Claims carry `workspace` (`claims/store.ts:14`). Top ready row: `board --json --local`, `lanes.ready[0]`.
- **Endings.** `handoff.md:170-175`: *Signal completion* plus "Do not suggest further work". `review.md` §7 says "do not propose
  next steps". `create.md` *After writing* step 3 is "Suggest next steps".
- **list.md** has no "start N" or launch text yet.

## Reuse

- `renderPlacement` for launch output; `placeTree` as launch's tree source (decision: board targets carry
  folder names only, so launch resolves the path).
- `normalizePhaseHint` / `PHASE_ID` for validation: same rule as chunk hints.

## Testing issues

- `launchReport` is sync and its tests compare strings. Keep it; add an async `launchCommand` that places
  first, with an injected place function (no git in the unit tests).
- The context pack's top-ready-row needs a board. Inject a reader, as `HeldReader` already does.
- No file near the 250-line cap on this path (`context.ts` is ~110 lines).
