---
kind: decision
applies-to: [phase 3]
created: 2026-10-10T13:47:09-07:00
---

# Spec state keeps the one-time PR line

Sessions stop hand-writing "phases done / left" in `pr-opening.md` Spec state, but execute §10 still adds one line `PR #<n> · <branch>` when it opens a PR.

Why: that line is the only open-PR link in the system. `pr/resolve.ts:14-31` (`pr-status <spec>`), `board/focus.ts:127-139` (FOCUS `merging`) and `board/load.ts:83-88` read it, and pr-babysit writes nothing at open (its phase-4: "No Spec-state write at open") while keeping Spec-state links as its fallback. One line per PR is written once, so it doesn't collide. All five reviewers raised it.
