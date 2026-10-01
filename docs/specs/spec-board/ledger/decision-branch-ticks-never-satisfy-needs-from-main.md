---
kind: decision
applies-to: [phase 3+, load-bearing]
created: 2026-10-01T14:01:46-07:00
---

# Branch ticks never make a phase done; base state alone drives readySet and isFinished

The overlay never patches base `SpecNode` or `SpecState`. A tick or a half-done phase found in a
worktree becomes `PhaseActivity { tickedIn, wipIn }` and puts the phase in flight. `readySet`,
`isFinished` and cross-spec `needs` see base only.

A phase whose only unmet `needs` are ticked in exactly one workspace is ready **in that workspace**: no
★, and its launch target is that worktree. It is never ready from main.

Rejected: "done if done in any view". `isFinished` (`graph/nodes.ts:64`) would drop a spec whose phases
are all ticked on a branch, and `readySet` skips done phases (`ready/ready-set.ts:21`). So
"ticked on branch, not merged" could never render, and dependents would launch on a main without their
dependency's code.

Source: `reviews/2026-10-01-pre-build-collegium.md` O1 (four reviewers).
