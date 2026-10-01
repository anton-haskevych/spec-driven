---
kind: gotcha
paths: [skills/spec/tools/**]
created: 2026-10-01T15:05:13-07:00
seen-in: [spec-board]
---

# `Bun.Glob.scanSync({ cwd })` throws ENOENT when `cwd` is missing: check it exists first

`new Bun.Glob(p).scanSync({ cwd: dir })` throws `ENOENT: no such file or directory, open '<dir>'`
instead of yielding nothing. Guard with `existsSync(dir)` wherever `dir` comes from outside, such as a
worktree path from `git worktree list`.

Why it bites: git keeps listing a worktree whose folder was deleted until `git worktree prune`, so one
stale entry would throw out of the whole workspace scan. Found by a stubbed scan test that used
`/repo`, Bun 1.4.2.
