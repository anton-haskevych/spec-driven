---
kind: gotcha
applies-to: [phase 5b, 6]
created: 2026-10-01T21:21:59-07:00
---

# trees prune --apply takes ~45 s per tree, and worktree remove deletes ignored files

First real run, CRM 2026-10-01: 42 candidates; 38 removed. The rest were 3 kept for edits plus 1 interrupted.

- **Slow.** `git worktree remove` deletes each tree's `node_modules` and build output (~300k files):
  40–50 s per tree, serial. 42 trees ran past the 30-minute background limit and were killed mid-remove.
- **An interrupted remove leaves a registered, half-deleted tree.** `git status` shows thousands of deletions,
  so the next prune skips it as edited. It's safe to finish with `git worktree remove --force` only when HEAD is in
  `origin/<default>` and the tree was clean before.
- **Ignored files are deleted without a check.** `worktree remove` refuses edits and untracked files, but
  gitignored ones go. In CRM two trees held the only copies of data: 2 pre-migration DB dumps
  (`packages/db/backups/`) and a 16 MB tenant payroll snapshot (`ops/tenant-data-snapshots/`). They were
  copied to the main checkout by hand before `--apply`.
- **Leftover folders.** A dev server or Gradle daemon can write caches back after a tree is removed, leaving a
  folder with no `.git` under the tree root.

Anton's call (2026-10-01): no per-tree progress, fast delete or resume for now ("gold plating; the prototype
works"). Before running `--apply` for someone, list ignored non-build files in the candidates and offer to
save them.
