---
kind: principle
applies-to: [phase 3, 3a, 4, 5, 6, 7, 8]
created: 2026-11-13T15:46:11-08:00
---

# While seams and migrations move, run the covering `.git` tests per commit, not just `test:fast`

Phase 1 makes `test:fast` the per-commit gate, and it skips every `*.git.test.ts`. Those real-git tests are the
only safety net for the phase 3/3a refactor and the phase 4–8 rewrites. Run `test:fast` plus the `.git` files
covering the modules you touched on each commit, and a full `bun test` before the phase's last tick.

Otherwise a regression first shows up at the PR, seven phases later, or never: the test that would have caught it
may already be migrated away.
