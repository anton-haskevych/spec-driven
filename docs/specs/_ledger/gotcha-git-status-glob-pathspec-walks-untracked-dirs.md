---
kind: gotcha
paths: [skills/spec/tools/**]
created: 2026-10-01T15:05:13-07:00
seen-in: [spec-board]
---

# A glob pathspec makes `git status` walk every untracked directory: pass literal roots

`git status --untracked-files=all -- ':(glob)*/docs/specs/**'` has to look inside every top-level
untracked directory to test the pattern. List the roots that exist (`specRoots` in
`core/spec-folders.ts`) and pass them as literal pathspecs; with no root, skip the query rather than
dropping the pathspec.

Why it bites: on a CRM worktree the glob cost 0.36 s against 0.03 s with literal roots, and the
64-worktree scan went from 3.8 s to ~0.9 s. Commands that read trees (`diff <a>...<b>`, `archive`)
don't walk the disk, so a glob is fine there.
