---
kind: decision
applies-to: [phase 7]
created: 2026-10-10T13:30:36-07:00
---

# PR claims (`pr-<group>`) live and die by session liveness and release — no merged-PR rule

`takeRefusal` (`claims/rules.ts:50`) accepts `pr-<group>` when some phase has `pr: <group>`; the store
already accepts any id; `trees/find.ts:84-86` already blocks a tree with any live claim. The claim is
released at the end of babysit and reads `closed` (stale) once the session is gone. It mirrors to
origin like a phase claim. A live PR claim makes the board show the PR as `babysitting` with no
merge/fix needs-you row.

Rejected: "done when the PR is merged or closed" — needs GitHub data inside the pure, offline
`claimStatus` that board, place and prune share, for a case liveness already covers. Rejected for now:
a typed claim target threaded through every `claim.phase` reader (only `takeRefusal` branches on it).
