---
kind: domain
applies-to: [phase 6]
created: 2026-09-30T17:48:29-07:00
---

# What gh and the Actions API actually return (gh 2.93.0, CRM-Dance/crm)

- A failed job's log from `gh api …/actions/jobs/<id>/logs` ends with post-job cleanup. The failure is the lines before the first `##[error]`. Line 1 has a BOM; every line starts `<ISO>Z `.
- Workflow display names repeat (two "E2E Tests"). Key on `workflowDatabaseId` from `gh run view`; `gh run list --workflow <id>` accepts it.
- Actions check links carry the job: `/actions/runs/<run>/job/<job>`. Reporter check runs link `/runs/<id>` (no job); Vercel has `workflow: ""`.
- `gh pr checks --json` exited 0 with failing checks; parse stdout regardless of exit code.
- `mergeable` is UNKNOWN on open and merged PRs alike until GitHub computes it.

Evidence: `research/phase-6/2026-09-30-pr-status-recon.md`.
