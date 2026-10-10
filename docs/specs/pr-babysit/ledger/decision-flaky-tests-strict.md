---
kind: decision
applies-to: [phase 6, 7, 8]
created: 2026-10-10T13:17:04-07:00
---

# Only infrastructure failures are re-run; a failing test is fixed before merge

`pr rerun` re-runs a job only when it failed for infrastructure reasons (runner lost, shutdown
signal, disk full, never acquired, startup failure, or cancelled with no failed sibling and no
timeout text), at most 2 times per run: the cap is GitHub's `attempt` (refuse at 3), never the local
babysit log (review 2026-10-10). A test that fails is root-caused and fixed in the PR, even if a re-run would
pass. Anton chose "strict: fix before merge" on 2026-10-10 over "re-run, merge, file a fix".

Matches CRM `.claude/rules/e2e-debugging.md:78` ("A flaky test is never accepted as flaky").
