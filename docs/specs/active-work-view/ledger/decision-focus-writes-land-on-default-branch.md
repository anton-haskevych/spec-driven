---
kind: decision
applies-to: [phase 2, 6]
created: 2026-10-07T19:16:13-07:00
---

# `spec.ts focus` reads and writes the set at origin/<default>, never the checkout

Asked 2026-10-07 at review; Anton chose "straight to main".

- **Chosen:** pin `origin/<default>`, read every spec's `focus:` there, commit the one changed
  `CLAUDE.md` onto that tip (scratch index + `commit-tree`), push, retry once on non-fast-forward.
  Any checkout, any `docs:` setting. The working tree is never touched.
- **Rejected:** writing the checkout and landing via `publish-docs` (skips deletions; runs only in
  `docs: main`; a worktree's view of the set can be days old, so ranks collide), or a tombstone field.
- Focus is shared team state like claims: one truth, read and written at the base.

Because it pushes to main at once, Claude runs it only on the user's words. A push refusal (branch
protection, offline) is reported with git's reason and nothing is written.
