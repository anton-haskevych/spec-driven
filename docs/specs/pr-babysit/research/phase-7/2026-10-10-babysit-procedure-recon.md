# Phase 7 recon — the question and the babysit procedure

Paths under `skills/spec/tools/` unless rooted. One inline wave (the phase names the seam precisely).

## Seam

- **PR claims** — `claims/rules.ts:47-54` `takeRefusal`: refuses any id not a phase (`:50`), then checks
  `activity` for work elsewhere. Called twice in `commands/claim.ts:116-121` (missing check with empty
  activity, then busy check). `SpecState.phases[].edges.pr` (`core/phase-edges.ts:9`) carries the group.
  The store, refs (`refs/spec-claims/<spec>/<phase>`) and release take any id already.
- **Tree blocking** — `trees/find.ts:84-86` `blockingClaim`: any live claim whose `workspace` is the tree,
  whatever its phase. A `pr-A` claim blocks with no change.
- **Board** — `board/flight.ts:19-38` builds a flight row for every claim key, so a `pr-A` claim already
  produces a row `spec pr-A` (no `prGroup`: `:27` looks up a phase id). `board/joins.ts:29-38`
  `attachPrs` sets `pr` + `next` via `nextFromChecks` (`:72-76`); `board/attention.ts:22-36`
  `prAttention` emits `merge`/`fix` only from `next`. `board/cells.ts:59-68` `prCell` renders the cell.
  `FlightNext` (`board/model.ts:32`) and `PrCell` (`:20-30`) are the model; `BOARD_VERSION = 1`.
- **Launch** — `launch/command-line.ts:17-29` `sessionLaunch`: a third token only with `execute`, and it
  must be a phase id. `commands/launch.ts:14-25` places only when a phase is given; `PlaceFn(spec, phase)`.
- **Placement** — `trees/place.ts:48-61` `placeTree` cuts a tree (`addPlacedTree`) whenever `findTree`
  finds none. There is no "existing only" path: "placeTree unchanged + refuse a new tree" can't be done
  after the fact, the tree would already be cut.
- **Packs** — `commands/context.ts:24-25` `PACK_MODES`/`INFERRING_MODES`; `specPack` picks
  `executeBody` or `resumePack` (`context/packs.ts:37`). `context/request.ts:9` `SUB_COMMANDS`.
- **Wiring** — `tests/skill-wiring.test.ts:84-112` pins the set line, Dispatch rows, argument-hint and
  one `skills/spec-<cmd>/SKILL.md` router per sub-command (exemplar `skills/spec-status/SKILL.md`).
- **Launch titles** — `launch/title.ts:16-21` `parseLaunchTitle` rejects `pr-babysit babysit A` (not a
  phase id). Attribution falls back to the claim (`board/attribution.ts:27-29`), so no change needed.

## Reuse

- PR-group → phases: `trees/place.ts:109-116` `groupPhases` and `board/tree-target.ts:19-21` already
  filter phases by `edges.pr`; launch resolves group → first phase of the group the same way.
- Babysitting needs no new claim status: `HeldClaim.status` `live`/`remote` is the signal.

## Testing-issue estimate

- All touched units are pure or already take fakes: `takeRefusal` (factories `phaseState`), board joins
  (`board-factories.ts`), `sessionLaunch`, `launchCommand(place fake)`, `contextPack(readHeld fake)`.
- `placeTree` existing-only needs no new harness: `trees-command.test.ts`/`trees-acquire` cover adds;
  the refusal is decided before `addPlacedTree`, testable through `launchCommand` with a fake `PlaceFn`
  plus one `placeTree` option.
- Size: all files well under 250 lines (`attention.ts` 100, `joins.ts` 76, `context.ts` 113).
- Skill prose: `execute.md` §10 and `handoff.md` are long; `babysit.md` is new and must hold the whole
  procedure, linked from both, never repeated.
