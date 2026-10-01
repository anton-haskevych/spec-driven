---
kind: gotcha
applies-to: [general]
created: 2026-09-30T21:14:30-07:00
---

# Stacked PRs merge into their base branch, not main, unless retargeted first

On 2026-09-30 PRs #3 → #4 → #5 were stacked (#4 based on #3's branch, #5 on #4's). All three were merged within 30 s: #3 reached `main` (squashed), but #4 merged into `feat/context-pack-loads` and #5 into `feat/phase-writers`. Nothing from #4/#5 reached `main`; #6 carried the combined tree over.

GitHub only retargets the next PR to `main` automatically when the merged PR's head branch is **deleted** on merge. This repo has `delete_branch_on_merge: false`, so the bases stayed put.

Fix next time: turn on "Automatically delete head branches" (then merging in order just works), or retarget each PR to `main` before merging it, or open one PR when the stack will be merged in one sitting. Squash-merging the base also means the next PR's diff against `main` repeats the base's changes; build its branch as `origin/main` + the stack tip's tree.
