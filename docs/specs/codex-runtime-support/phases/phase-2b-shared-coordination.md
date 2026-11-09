---
needs: [2]
pr: B
---

# Phase 2b — Shared ownership, board and worktree coordination

## Outcome

Claude and Codex can safely share the normal repository/worktrees, claims and board. This replaces the pilot's isolation requirement for the supported configuration; it does not change Claude's existing workflow or drop remote ownership.

## Files to touch

Shared runtime composition and system factories; claims store/rules/held/live and remote/takeover codecs; board load/joins/attribution; trees find/place/prune and related tests.

## Deliverables

- [ ] Wire qualified session composition into context, claim, board/list and placement/prune I/O; reuse one planning snapshot per command and propagate async only at those orchestration boundaries.
- [ ] Implement qualified take/release/takeover and remote payload/mirror joins using the shared identity helper, retaining raw unknown fields, explicit legacy-Claude binding and unsupported-schema refusal.
- [ ] Update trees/find, claims/held, board/joins/attribution, remote-take and all ownership self/mirror/release comparisons; preserve parked sessions, remote visibility, existing text output and versioned JSON contracts.
- [ ] Establish and test the supported old-writer transition before shared Codex writes: compatible entry/resume/maintenance paths, actual historical-reader hazard fixtures, explicit restart/refusal and rollback limits. A marker alone cannot fence old code.
- [ ] Coordinate managed entry, claims, placement and prune using existing atomic primitives with fresh mutation-time source/claim checks; add resume-after-preview-before-prune and competing-take interleavings.
- [ ] Add mixed Claude/Codex equal-ID, same-runtime different-source, unavailable-source, legacy/unknown-record and remote-ownership fixtures, preserving healthy observations and unknown-state protection.
- [ ] Expose the shared capabilities through the same native entry and add controlled normal-repository acceptance coverage; retain the isolated pilot only as a clearly named limited option until migration succeeds.

## Implementation guidance

Support the one observed local configuration first, while retaining SourceRef values for correct identity. Broader environment discovery is not a prerequisite. Remote claim behavior already present in Claude remains required; do not infer remote liveness from a local daemon.

The actual old-reader hazard stays an activation requirement, not a reason to rebuild every distribution mechanism. Reuse existing state roots and exclusive/compare-remove primitives. If supported old-native reentry cannot be fenced, report the concrete remaining choice; do not advertise safe mixed use.

Move overseer/run/worker identity persistence with its consumers in Phase 3b. This phase owns workspace mutation coordination; Phase 3b owns run/target/slot coordination. Basic shared behavior tests ship here, not in Phase 6.

Acceptance and migration checks live in ../pr-opening.md; all final parity obligations remain in ../workflow-parity.md.
