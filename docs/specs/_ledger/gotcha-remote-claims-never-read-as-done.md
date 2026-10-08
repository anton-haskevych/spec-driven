---
kind: gotcha
paths: [skills/spec/tools/board/**, skills/spec/tools/claims/**]
created: 2026-10-07T20:21:15-07:00
seen-in: [active-work-view]
---

# A remote claim never reads as done: the board shows it in flight even after its phase is ticked on base

`HeldClaim.status` is `"remote"` for every claim read from origin; `claimStatus` (the only source of `done`)
runs on local claims alone. So `claimsOnBoard` (`board/flight.ts`), which drops `done` and `gone`, keeps a
remote claim on a finished phase, and it becomes an IN FLIGHT row. Code that wants "live remote work" must
check the phase's state on base itself; filtering by "has an in-flight row" filters nothing.

Seen in active-work-view phase 4: a teammate's claim on a phase done on base still appeared in the FOCUS
who column until the test was rewritten. Normally `claim release` deletes the ref at handoff, so this
only shows when a session on another machine died holding a claim.
