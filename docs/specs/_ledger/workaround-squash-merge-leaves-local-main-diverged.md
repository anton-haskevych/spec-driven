---
kind: workaround
paths: [docs/specs/**]
created: 2026-10-01T15:57:45-07:00
seen-in: [spec-board]
---

# After a squash merge, reset local main to origin once the tree matches

Spec docs committed on local `main` before the feature branch was cut (prep, review) end up inside the
squash commit, but local `main` still holds the originals, so `git pull --ff-only` refuses. Check
`git merge-base --is-ancestor <local commit> <feature branch>` and that `git diff <feature branch>
origin/main` is empty, then `git reset --keep origin/main`. Keep the feature branch until then.

Why it bites: a pull with merge or rebase would replay prep commits whose content is already on main,
and a hard reset without the checks can drop work that never reached the branch. Seen 2026-10-01 merging
spec-board PR #8 (spec-driven repo).
