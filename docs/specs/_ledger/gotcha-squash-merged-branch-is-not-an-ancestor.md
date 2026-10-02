---
kind: gotcha
paths: [skills/spec/tools/trees/**, skills/spec/tools/workspaces/**, skills/spec/tools/board/**]
created: 2026-10-01T20:23:06-07:00
seen-in: [spec-board]
---

# A squash-merged branch is never an ancestor of main: match the merged PR's head instead

To tell whether a branch was merged, `merge-base --is-ancestor <head> origin/<default>` is not enough. Also look up its merged PRs (`gh pr list --state merged --json headRefName,headRefOid`) and check whether the branch head equals a PR's `headRefOid`. A match also proves that nothing local is unpushed.

Probe 2026-10-01: `feat/spec-board` (PR #8, squash-merged) returned 1 from `--is-ancestor`, and its head `c11853e` was the PR's `headRefOid`. CRM squash-merges too. With ancestry alone, prune and the board's merged count would miss most merged trees. Without gh, fall back to ancestry and say so.
