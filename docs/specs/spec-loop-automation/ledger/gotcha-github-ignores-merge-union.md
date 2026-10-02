---
kind: gotcha
applies-to: [general, load-bearing]
created: 2026-10-02T12:45:29-07:00
---

# GitHub's PR conflict check ignores `merge=union`; a file every branch appends to conflicts anyway

`.gitattributes` merge drivers, `union` included, apply only to local merges. GitHub's mergeability check and its
merge button use their own merge, so two PRs that append to the same file show "This branch has conflicts", and a
conflicting PR gets no `pull_request` CI runs. Never fix a shared-append file with `merge=union`. Remove the shared
write instead: derive the file from per-item files, or make each branch write its own file.

Seen 2026-10-02: CRM's `docs/specs/_ledger/INDEX.md` (131 commits in 30 days) conflicted on every spec PR despite
phase 5's union rule. Phase 11 stopped writing it. Upstream: github.com/orgs/community/discussions/9288.
