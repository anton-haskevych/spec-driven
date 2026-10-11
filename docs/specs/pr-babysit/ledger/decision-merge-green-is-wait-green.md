---
kind: decision
applies-to: [phase 6, 7]
created: 2026-10-10T16:17:24-07:00
---

# `pr merge` reads green through `waitStep`; the merge line is its only spec write

`pr merge` refuses unless `waitStep` (the rule `pr wait` settles on) says `green` for the head it then pins in the PUT: conflicting, red, cancelled, waiting and no-checks all refuse with that step's own text (`pr merge: not green — E2E Tests failed`). `--now` skips only this check; GitHub still refuses a draft or conflicting PR (405), and that message is passed on.

The merge line lands on main through `core/land-on-main.ts` after the PUT; landing's `pinDefault` is the fetch. A refused landing is the last line after `Merged: …`, never an undo. An already-merged PR (Anton merged it, or a crash after the PUT) lands a missing line with today's date and the resolved method (`mergedAt` is not in `PR_FIELDS`) and logs nothing; `merged` is logged only by the merge that happened here.

Why: one definition of green across `pr wait`, `pr merge` and (phase 7) the babysitter, so the babysitter never merges what its own wait wouldn't call green.
