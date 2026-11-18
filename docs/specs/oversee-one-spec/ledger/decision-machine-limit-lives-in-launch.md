---
kind: decision
applies-to: [phase 1, phase 3, phase 6]
created: 2026-11-17T17:06:36-08:00
---

# The machine limit is refused in launchCrewSession; relaunches say so

The 6-worker refusal lives once, in `launchCrewSession`, so `crew launch` and the tick both hit it. The tick
counts the roster once (`machineBusy`) and caps its picks at what is free; `crew launch` leaves it unset and the
roster is loaded through `CrewDeps.agents()` (beside `liveSessions`), so tests never shell out to `claude`.
A relaunch carries `relaunch: true` and is never refused: it reuses the slot its closed-out worker freed, and
`machineBusy` alone could not tell it from a new pick. Babysitters are never counted. Phase 3's parallel lanes
pick more rows per spec; they go through the same `fillSlots` cap.
