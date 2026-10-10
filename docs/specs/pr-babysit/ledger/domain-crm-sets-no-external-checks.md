---
kind: domain
applies-to: [phase 3, 5, 8]
created: 2026-10-10T14:02:12-07:00
---

# CRM's settings name no `checks.external`, so its ten Vercel previews block the verdict

`docs/specs/_playbook/settings.md` in CRM (2026-10-10) has `docs` and `gates` only. `pr status 922` counted all
ten `Vercel – <site>` StatusContexts as checks: 10 queued, so a PR whose Actions are all green reads
`waiting`, and `pr wait` would sit until Vercel finishes (the two-hour cron of the transcripts). Phase 8 must
add `checks: { external: ["Vercel*"] }` to CRM's settings before the first babysit; `pr wait` and `pr merge`
need nothing extra once it is set.
