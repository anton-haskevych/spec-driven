---
kind: decision
applies-to: [general, load-bearing]
created: 2026-10-12T20:15:42-07:00
---

# Deploy babysitting is for infra PRs only

Auto mode means merge and report. A babysitter works through a deploy gate, and marks phases
deployed with `phase deployed --land`, only when the PR's changed files match the project's
`deploy.paths` (settings `deploy: { paths, gate }`), and only once the gate's last check
proves the deploy. Otherwise it reports `deploy owed`. No `deploy:` setting, or no match,
means no gate and no marker, so update.md:49 ("never infer a deploy from a merge") stands.

Anton, 2026-10-12 (review fork B): "Nah, no need for gates like actual deploy. That might come
later. For now babysitting the deploy is out of scope … UNLESS WE WORK WITH INFRA!"

Rejected options:
- an after-merge gate on every PR, plus the marker (first draft)
- never auto-marking

The plugin never decides what counts as infra; each project declares its own paths. This repo
has none. One infra deploy gate runs at a time per clone.
