---
kind: decision
applies-to: [phase 1, 3, 5, 7]
created: 2026-10-10T13:30:36-07:00
---

# Checks are read from `statusCheckRollup` on the PR head — one source, one mapper, one dedupe

`pr status`, `pr wait` and the board all read `gh pr view --json …,statusCheckRollup` and map it with
`rollupToChecks` (newest per **workflow + name**; a queued, zero-time row counts as newest). `gh pr checks`
and its mapper retire. The verdict (`checksVerdict`) is one pure function over that list.

Rejected (review 2026-10-10): a new `CheckRow` over `gh pr checks` plus REST check-runs for a "code head".
Check runs attach only to a push's tip, so the newest code commit under a docs commit has none — the
code-head rule would have read `none` on nearly every babysit; it also needed a third mapper, paging past
30 rows, and couldn't be shared with the board.

Docs-only heads: phase 1 probes a live CRM PR first. Only if a docs-only tip gets zero checks does a
narrow fallback read the newest *checked* commit, and only when every commit above it is docs-only
(`pathsOutsideSpecDocs`). The merge always pins the real head SHA.
