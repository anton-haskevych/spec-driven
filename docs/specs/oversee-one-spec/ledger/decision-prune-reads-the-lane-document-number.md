---
kind: decision
applies-to: [phase 5]
created: 2026-11-17T18:07:36-08:00
---

# Prune counts a lane merged by its PR document's state and number

`laneBranches` (`trees/prune-rules.ts`) treats a lane tree as merged when its group's PR document reads
`merged` **with a number** (evidence `#<n> merged`), and the tree adds only spec-doc commits beyond
`origin/<lane>`. A merged document with no number keeps the tree. So Phase 5's `prSyncPlan` mode end must copy the
final PR's `number` (not only `state`) onto every lane document, or finished lane trees pile up again.

While the mode is on, the other path holds: `origin/<lane>` in `origin/feat/<spec>` and no open phase in the lane.
Prune reads the clone's remote-tracking refs and record copy without fetching them (main is pinned first); a stale
ref only keeps a tree longer.
