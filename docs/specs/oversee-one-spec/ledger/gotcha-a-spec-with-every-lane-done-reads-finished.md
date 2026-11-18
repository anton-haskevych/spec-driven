---
kind: gotcha
applies-to: [phase 5, phase 6]
created: 2026-11-17T18:27:28-08:00
---

# A spec whose lanes are all done reads finished on the board while its final PR is still out

`buildBoard` drops finished nodes (`isFinished`: every phase ticked) before `needsYou` sees them, and in
spec-branch mode every lane phase is ticked before the final PR even opens. So anything about the final PR that
the board must show (`closedFinalPrs`, `board/record-rows.ts`) reads every node in `inputs.nodes`, not
`active`. `specBranch` on the record is the filter: it exists only until the final PR merges.

Phase 6 (the overseer end to end) hits the same thing: a run with no open phase is still waiting on the final PR's
babysitter (`decision-a-spec-run-finishes-only-after-an-empty-tick`).
