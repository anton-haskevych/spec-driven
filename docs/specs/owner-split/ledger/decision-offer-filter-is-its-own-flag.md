---
kind: decision
applies-to: [phase 3, 4]
created: 2026-10-17T20:59:58-07:00
---

# "Offered to X" is `board ready --for X`; `--who X` stays "X's work"

`--who X` already means "rows X owns or works on" (`board/people.ts` `focusFor`). "May this be
offered to X" (unowned or X's) is a different predicate, so it gets its own flag, `--for`, and it
narrows the ready lane only. `--keep <spec>` exempts one spec so *Next sessions* can pin the
session's own spec without rebuilding a row.

- **Rejected:** `--who` filtering every lane with `isOffered`. `board --who taras` would have
  listed every unowned row as Taras's, and `board --who me` would have hidden your own running
  workers on someone else's spec (in flight is about the holder, not the owner).
- **Consequence:** flight, blocked, needs-you and FOCUS are never offer-filtered.
