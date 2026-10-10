---
kind: decision
applies-to: [phase 7, 8]
created: 2026-10-10T16:38:44-07:00
---

# The babysitter reads the saved job log file, never re-queries GitHub for it

`pr status` saves every failed or cancelled job's full log once, to
`<git-common-dir>/spec-board/babysit/pr-<n>/job-<jobId>.log`, and prints it as a `log <path>` line
under the failure. Anton (2026-10-10): "I would love agent to be able to download the file first and then
work with it rather than doing in-flight magic re-queries."

The babysit procedure (phase 7) reads or greps that file during triage: for a CRM E2E failure, it searches for
the Playwright summary, because the 30-line tail is MySQL noise (`gotcha-e2e-tail-is-container-noise`). A file
already on disk is never downloaded again; a re-run has new job ids, so it never goes stale. Infra signatures
are matched over the whole saved log. Run artifacts (`gh run download`, Playwright HTML report) are not
fetched; add that only if the logs prove insufficient.
