---
kind: decision
applies-to: [phase 5, phase 6]
created: 2026-11-17T14:54:00-08:00
---

# With no ship: and no pr.ship, the final spec PR holds for review

**Status: applied by the reviewer, unanswered: say if wrong.** Review fork 3 (2026-11-17).

- **Rule:** the spec's `ship:`, else settings `pr.ship`, else `hold-for-review`: babysit to green and hold. The
  overseer never waits on the question and never merges to main on a default.
- **Rejected:** design's original "auto unless the PR touches `deploy.paths`". It would merge CRM PRs that CRM's
  settings say must be asked about (no `pr.ship`; "the question is asked for every PR"), and it contradicts
  SKILL.md's always-asked list.
- **To let a spec merge itself:** `spec.ts ship <spec> auto`.
