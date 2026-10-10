---
kind: decision
applies-to: [phase 7]
created: 2026-10-10T13:30:36-07:00
---

# On "babysit", the asking session hands off in full first; `launch babysit` is its last act

Order: commit → push / publish-docs → claim release → `spec.ts launch babysit <spec> <group>`. Never
launch first. The question is asked once, at execute §10 (handoff only if unanswered), and replaces
the *Next sessions* block in that message.

Why: launch-then-handoff runs publish-docs' two pushes (branch + snapshot merge-back) in the same tree
seconds after `pr open` started CI — `cancel-in-progress` kills the run or leaves a docs-only head
(#915's second failure), and two sessions race on `.git/index.lock`.
