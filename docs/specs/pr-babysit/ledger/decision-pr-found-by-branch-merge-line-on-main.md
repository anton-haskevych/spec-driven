---
kind: decision
applies-to: [phase 4, 5, 7]
created: 2026-10-10T13:30:36-07:00
---

# A group's PR is found by branch; the only spec write is the merge line, landed on main after merge

`<spec> <group>` → `feat/<spec>-pr-<group>` → `gh pr view <branch>`. `pr open` writes nothing into Spec
state. After the merge, `pr merge` lands `PR #n merged <date> as <sha> (<method>).` on main through
`core/land-on-main.ts` (lifted from `focus/land.ts`: commit onto origin's tip, push, retry once).
The babysitter pins the PR number `pr open` printed for every later call.

Why: tool-written lines appended to one Spec-state section on every group branch conflict (GitHub
ignores `merge=union`: spec-loop-automation `gotcha-github-ignores-merge-union`), a conflicting PR runs
no CI, and any write during the babysit is a docs push mid-CI. The newest-open-PR rule in
`pr/resolve.ts` picks the wrong PR when two groups are open. Rejected: drop the merge line entirely
(the brief promises "records the merge in the spec"); write link and merge lines on the PR branch.
