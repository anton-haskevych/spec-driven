---
kind: domain
applies-to: [phase 1, 3, 5, 7]
created: 2026-10-10T13:47:40-07:00
---

# A docs-only head on top of code gets checks: GitHub matches `pull_request` paths against the whole PR

Probe (2026-10-10, read-only over CRM history instead of a test push): CRM #921's head `56cc895` is a
publish-docs merge-back whose own diff is only `docs/specs/`, on top of two docs commits. It got 51 check
runs, all `pull_request` events (Monorepo CI and E2E Tests passed; the draft-era runs show as skipped
rows beside them). #919's docs-only head `9848aed` got 53. So checks are read on the head, and no
checked-head fallback is built (phase 1's conditional deliverable is dropped).

Separate failure mode: #909, #911 and #916 touched `backend/`/`frontend/` yet have zero Actions runs on
any commit of their branch (`actions/runs?branch=…` total 0; a working branch like #921's returns 8).
Cause unknown (not the docs head). The verdict reads that as `none: no-checks`, never green, and the
babysitter asks why instead of merging.
