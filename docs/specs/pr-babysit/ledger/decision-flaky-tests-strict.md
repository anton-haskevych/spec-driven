---
kind: decision
applies-to: [phase 6, 7, 8]
created: 2026-10-10T13:17:04-07:00
---

# Only infrastructure failures are re-run; a failing test is fixed before merge

`pr rerun` re-runs a job only when it failed for infrastructure reasons (runner lost, shutdown
signal, disk full, never acquired, cancelled with no newer run, startup failure), at most 2 times
per code-head commit. A test that fails is root-caused and fixed in the PR, even if a re-run would
pass. Anton chose "strict: fix before merge" on 2026-10-10 over "re-run, merge, file a fix".

Matches CRM `.claude/rules/e2e-debugging.md:78` ("A flaky test is never accepted as flaky").
