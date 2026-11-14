---
kind: decision
applies-to: [phase 12+]
created: 2026-11-13T16:39:15-08:00
---

# record export takes the list's layout from the file, or from history once tidied

`record export` rewrites each phase line of `progress.md` in place by its pointer, so free-text lines between
phase lines (CRM's `v1:` / `v2:`) and the sections around the list stay where people wrote them. A phase only on
the record follows its record predecessor; a line for a phase the record no longer has goes.

`join --tidy` cuts `progress.md` to the stub, which keeps none of that. So when the tree's copy has no phase
lines, export reads the newest `progress.md` on `origin/<default>`'s history that still has them (last 50 commits
touching it, `plan/frozen-progress.ts`). Anything that changes tidy must keep that pre-tidy version in history:
squashing or rewriting the default branch's history would lose the labels for good. Nothing went on the record.
