---
kind: gotcha
applies-to: [phase 3, 6, 7]
created: 2026-10-10T13:30:36-07:00
---

# Right after a re-run, the old failed row is still the newest; and a running run can't be re-run

Until a runner picks the re-run up, the new attempt is queued with a zero-time `startedAt`
(`0001-01-01…`) — a "newest `startedAt` wins" dedupe keeps the old FAILURE, so a fresh `pr wait`
settles red at once and the babysitter burns its re-run budget in minutes. Fix: zero-time rows count
as newest, and `pr wait --since <last rerun/push>` ignores failures that completed before it.

`gh run rerun --job` is refused while the workflow run is still in progress (sibling jobs running):
`pr rerun` says `still running — wait` and the procedure re-waits. Inferred from GitHub behaviour
(review 2026-10-10); pin both with fixtures.
