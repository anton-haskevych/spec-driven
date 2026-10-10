---
kind: gotcha
applies-to: [phase 3, 5, 6]
created: 2026-10-10T15:39:09-07:00
---

# One GhClient answers `runJobs` and `runWorkflowId` from cache: poll with uncached reads

`ghClient` caches `runJobs`, `runWorkflowId` and `branchRuns` per instance (`pr/gh.ts`, third `call` arg `true`), and spends one 30-call budget. A loop that re-reads a run's jobs through the same client sees the first answer forever. Polls use uncached reads (`prView`, `commitRuns`) and read jobs once, after the state settled (`pr/actions/ready-race.ts` does), or build a fresh client per poll. `pollUntil` (`pr/babysit/poll.ts`) is the shared loop: injected clock, bounded by `timeoutMs`.
