# Command input seams — recon

Two read-only waves, two explorers per wave; scope: context/placement extraction before native command integration. No host/native reads or mutations.

## Seam and reuse

- `commands/context.ts:39–45,64–84` has five positional dependencies and a synchronous held reader. One held read feeds both selection and relations. `spec.ts:28,62–76` already awaits async command results.
- `context/packs.ts:65,75–80,153–158` reads five spec files while rendering. Reuse `core/spec-state.ts:45–46`'s `diskReader`; pass plain loaded reference data to rendering. `commands/context.ts:95–105` mixes selection and phase-playbook I/O: extract selection before loading that playbook.
- `trees/place.ts:63–76,80–125` mixes placement policy with world loading, addition/setup and dirty checks. `commands/trees.ts:23–25` is its current system factory. Board's local load deliberately skips sessions (`board/load.ts:52–60`), so placement currently scans once, not twice.
- Four production place callers: `commands/trees.ts:32`, `commands/launch.ts:34`, `commands/crew/launch.ts:16`, `commands/crew/tick.ts:150`. Keep the existing injected `PlaceFn` bridge.
- `runtime/identity.ts:11–16` and `runtime/read-sessions.ts:10–36` already supply qualified equality and source-bound snapshots. `claims/live.ts:10`'s plain HeldPhases can carry their policy output without flattening identities.

## Testability and constraints

- `tests/context.test.ts` is 378 lines: split command fixtures from unrelated helpers before extending. Await each call before shared fixture mutation/restoration. Existing settings, inference, held-phase, playbook and clipping expectations characterize output.
- New direct pack fixture must prove rendering from loaded values after its source files disappear; existing tests do not establish purity.
- `trees/find.ts:40–45,84–91` remains Claude-only. Extract ports without claiming mixed placement safety. Existing isolated Git/Claude fixtures in `tests/trees-command.test.ts:10–87` cover system behavior.
- `tests/fixtures/runtime-2.51.0/trees/prune.ts:16–21` imports current PlaceDeps. Its bytes are hash checked (`tests/runtime-legacy-readers.test.ts:20–25`): preserve that type's legacy shape and do not edit historical runtime sources.
- Local claim files have no source identity (`claims/store.ts:9–19,105–112`). Any read-only legacy bridge must receive an explicit configured Claude source; unknown source coverage holds the claim. Native config/identity binding and all write cutover proofs remain pending.
