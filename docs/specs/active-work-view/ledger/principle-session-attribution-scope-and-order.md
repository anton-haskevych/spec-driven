---
kind: principle
applies-to: [phase 3+, load-bearing]
created: 2026-10-07T19:16:13-07:00
---

# Attribute sessions only after scoping to this repo; claim → launch title → non-main tree

1. **Scope first.** `~/.claude/sessions` holds every session on the machine, whatever the repo. Keep a
   session only if its cwd is inside one of this repo's `git worktree list` paths. Use every worktree,
   not `inputs.workspaces` (live trees only).
2. **Claim** with this `sessionId`.
3. **Launch title** (`parseLaunchTitle`, the inverse of `launchTitle`) naming a base spec. It outranks
   the tree because trees are reused across specs.
4. **Tree**: only a non-main worktree whose changes touch exactly one focus spec. The main checkout is
   always "live" (`workspaces/classify.ts`) and collects prep/idea edits, so it never stands for a spec.

Anything else is `other sessions`. Ambiguous → other, never a guess.
