---
kind: decision
applies-to: [phase 3, phase 4]
created: 2026-11-17T15:20:57-08:00
---

# A need on another lane waits until that lane's worker has closed out

A phase reads done on the record at its last tick, which comes before its handoff's `merge-back --push`. In
spec-branch mode `pickRows` holds a row while a phase it needs sits in a lane whose launched worker hasn't closed
out. Close-out proves the phase's recorded commit is on `feat/<spec>`, so the dependent's first `merge-back`
holds the code it builds on.

- **Rejected:** met on the tick, as today (the per-spec busy key hid the window; per-group keys open it);
  checking reachability inside `pickRows` (a git call in a pure picker).

Source: review 2026-11-17 final-pr-and-mode-ends (PE F6, IA F3, AT F3).
