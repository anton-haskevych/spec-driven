---
kind: gotcha
applies-to: [phase 6]
created: 2026-10-10T14:02:12-07:00
---

# A CRM E2E job's failure tail is 30 lines of MySQL container log, not the failing test

`failureTail` (`pr/failures/log-tail.ts`) ends at the first `##[error]` and keeps 30 lines. On CRM #922's
`E2E Tests` job that window is docker-compose MySQL startup output; the Playwright failure is elsewhere. Setup
failures (`Frontend Tests` pnpm self-installer) do end at the right line. Triage (phase 6) should not trust the
tail alone for E2E: look for the Playwright summary or point at the run's report artifact.
