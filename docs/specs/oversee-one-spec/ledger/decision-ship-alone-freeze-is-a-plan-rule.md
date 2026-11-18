---
kind: decision
applies-to: [phase 3+]
created: 2026-11-17T16:42:13-08:00
---

# The ship-alone freeze is a plan rule: no phase moves into or out of a ship-alone group

Only `specBranchPlan` writes `specBranch.shipAlone`, and only when the mode turns on (a re-run is a takeover and
writes nothing), so the list itself can't change. What a plan op can change is which *phases* ship alone:
`shipAloneMoves` (`plan/docs/spec-branch-rules.ts`) refuses `phase set|split|move` moving a phase between a
ship-alone group and any other group while the mode is on. It covers every ship-alone group, cut or not: the record
can't see whether a branch exists. Adding a new phase to a ship-alone group is allowed.

Also: a ship-alone group may not need an *open* phase of another group, by `needs` or `needs-deployed`; a phase
done before the mode is already on main. Source: Phase 3 preflight (2026-11-17), defaults applied, unanswered.
