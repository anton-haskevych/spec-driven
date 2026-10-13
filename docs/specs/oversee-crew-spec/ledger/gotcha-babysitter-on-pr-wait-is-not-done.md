---
kind: gotcha
applies-to: [phase 1, 4]
created: 2026-10-12T20:15:42-07:00
---

# A babysitter idle on `pr wait` is waiting, not done: never stop a session holding a live claim

A babysitter ends its turn while background `pr wait` runs for up to 25 minutes, so the
roster will likely show `done` (still unprobed: probe 1.0). If close-out treats that as done,
it stops and removes the babysitter mid-CI. A babysitter is finished only when its
`pr-<group>` claim is released and `pr log` ends merged or stopped.

The same rule protects parked workers. A `closed` claim does not block a tree
(`T/trees/find.ts:27-28`), so stop+rm over a dirty tree hands half-done edits to the next
worker. Send "Hand off now" first.
