---
kind: decision
applies-to: [phase 7, 10]
created: 2026-09-30T18:03:07-07:00
---

# `publish-docs` pushes the branch itself; handoff calls one command

The draft had handoff run `spec.ts push`, then `publish-docs`, then push again. That is three steps for the agent to sequence and two `Remote:` lines to reconcile (the second would show `+1` for the merge-back and lose the first push's count).

`publish-docs` now owns the whole remote step in `docs: main` projects: push the branch (so the work is on origin even if publishing refuses), publish, merge the snapshot back, push again, print one `Remote:` line. `docs: branch` projects run `spec.ts push` alone. `push` stays idempotent, so running both is harmless.

Also fixed by preflight: `merge-tree` exit 1 means conflict, any other non-zero is an error (git < 2.38 has no `--write-tree`); a merge-back that fails after main accepted the publish is reported with the `git merge <X>` to run, never rolled back.

Without Bun, handoff only pushes the branch (`git push -u origin "HEAD:refs/heads/$(git branch --show-current)"`) and says the docs were not published. No hand recipe for the snapshot merge: the next publish with Bun takes everything since the last snapshot, and a by-hand version is where the $150 overwrite came from.
