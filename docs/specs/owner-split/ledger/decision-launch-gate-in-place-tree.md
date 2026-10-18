---
kind: decision
applies-to: [phase 2]
created: 2026-10-17T20:59:58-07:00
---

# The crew launch gate is `PlaceOptions.onlyFor` in `placeTree`

`placeTree` checks the spec's owner after `groupPhases` and before anything is added, when the
caller sets `onlyFor`. Only `launchCrewSession` sets it (execute only), the same way only babysit
sets `existingOnly`. Plain `launch` and babysitters are never gated.

- **Why there:** `loadPlaceWorld` already reads the spec from base, then the checkout copy, so the
  gate sees the same spec placement does; a refusal there cuts no tree; a failed read already
  refuses (fail closed); tick picks, relaunches and hand launches all pass through it.
- **Rejected:** a new `OwnerReader` port in `commands/crew/owner-on-base.ts` (sync type over async
  `baseProject`, a second base read per launch, failed open on an unreadable base, and the tick's
  reader could never fire); a gate in `crewLaunch` (misses tick picks and relaunches).
