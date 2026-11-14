---
kind: workaround
applies-to: [phase 3a, 4, 5, 6, 7, 8]
created: 2026-11-13T16:47:53-08:00
---

# To see which git a test reaches, preload a wrapper around `systemRunner`, one test file at a time

Every git call in the tools goes through `systemRunner.run` or `systemAsyncRunner.run` (`isolatedRunner` and
`anonymousRunner` wrap them). A `bun test --preload` that replaces those two `run` methods, logs the argv plus the
first non-runner stack frame, and lets the call through gives the full list per file without touching the code.
Phase 3 used it for `technical.md` §4; the script is in `research/phase-3/2026-11-13-git-trace-recon.md`.

- Run with `--timeout 120000`: the stack capture slows repo builds past bun's 5 s hook limit.
- Re-run it after a seam moves to check a target is down to `gitStub` answers before migrating its tests.
- A migrated test on `gitStub` doesn't need it: `strictRunner` throws with the argv it wasn't given.
