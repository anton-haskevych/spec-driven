---
kind: decision
applies-to: [phase 6, 10]
created: 2026-09-30T17:55:16-07:00
---

# pr-status fetches log tails for the first 3 failing jobs only

Each job log is a full download (~1 MB on CRM). On PR 874 (17 failing jobs) the uncapped report printed 384 lines in 43 s and spent the 30-call budget on logs. With `TAILS_SHOWN = 3` (`pr/report.ts`) it is 147 lines in ~27 s. Every failure still gets its name, run/job ids and main line; the rest say "only the first 3 failures get a tail". Ask for a specific job's log by hand when needed.
