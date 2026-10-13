---
kind: gotcha
paths: [skills/spec/execute.md, skills/spec/oversee-crew.md]
created: 2026-10-12T23:21:02-07:00
seen-in: [self-driving-loop]
---

# The execute pack is built before you merge main: re-run it after the merge

The `<spec-pack>` is computed when the skill loads. A session that merges `origin/main` afterwards (a crew brief's "merge origin/main first", or any stale tree) may pull in a review that rewrote the picked phase, and the pack still shows the old phase entry. After merging main, re-run `spec.ts context execute <spec> <phase>` or re-read the phase file before planning.

Seen on self-driving-loop phase 1 (2026-10-12): the tree sat at the spec commit; main carried the review that added a board field, a review row and the preflight split to phase 1. The pack showed the pre-review "prose only" deliverables.
