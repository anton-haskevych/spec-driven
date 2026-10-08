---
kind: gotcha
paths: [skills/spec/tools/trees/**, skills/spec/tools/launch/**]
created: 2026-10-07T20:04:38-07:00
seen-in: [active-work-view]
---

# `trees place` reads a phase's `pr:` from origin/<default>: a regroup only on a branch is ignored

`trees place` (and `launch execute`, which runs it) picks the tree from the phase's `pr:` group as the base
sees it. If a phase was moved to another PR group by a commit that exists only on a feature branch, placement
still uses the old group and cuts a new `feat/<spec>-pr-<old>` tree from origin/<default>, which lacks the
branch's earlier phases. After regrouping on a branch, don't launch: switch into the intended tree yourself
(`EnterWorktree`), or land the spec-doc change on the default branch first.

Seen 2026-10-07: phase 4 of active-work-view moved from `pr: C` to `pr: B` on `feat/active-work-view-pr-b`;
`launch execute active-work-view 4` created `active-work-view-pr-c` from main without phases 2–3.
