---
kind: decision
applies-to: [phase 3, 5, 7, load-bearing]
created: 2026-10-10T15:52:27-07:00
---

# A conflict is never a reason to stop: the babysitter resolves it and carries on

Anton, 2026-10-10: "We encounter [merge conflicts] really often … Agent shouldn't be just stuck and
looping … If an agent sees the conflict, he just should resolve it."

- **Detect fast.** A conflicting PR runs no workflows, so a wait on its checks can only end in `none`.
  `pr wait` settles `conflicting` at once on `mergeable: CONFLICTING` or `mergeStateStatus: DIRTY`
  (`pr/babysit/wait-step.ts`). On `none`, the procedure first checks for a conflict with main
  (`git fetch` + `git merge-tree --write-tree origin/<default> HEAD`) before anything else.
- **Resolve, don't ask.** `conflicting` → merge `origin/<default>` into the branch, resolve every
  conflict (read both sides; keep both intents; spec docs: keep both sides' lines), run
  `gates.after-merge-main` and the per-commit gate, push, `pr log --add` a note naming the files, wait again.
- **Not a fix push.** A conflict merge doesn't count toward the 3 fix-push limit, so conflicts with a
  busy main never exhaust the babysit. Stop and ask only when the two sides want contradictory
  behaviour that the code, spec and tests can't settle — and name the exact hunk.
- `pr merge` refused with 405 "not mergeable" is the same case: resolve, wait, merge.
