---
kind: gotcha
paths: [skills/spec/tools/tests/git-repo.ts, skills/spec/tools/core/git.ts]
created: 2026-10-17T21:09:54-07:00
seen-in: [owner-split]
---

# An empty `GIT_AUTHOR_NAME` overrides `user.name`: unset identity env vars, never blank them

To test "no identity" while a repo still sets `user.name`, remove `GIT_AUTHOR_NAME` (and friends) from
the spawned git's environment. Setting it to `""` counts as set: git fails with `fatal: empty ident name
(for <>) not allowed` even when the repo's `user.name` is configured.

Why it bites: `systemRunner` merges `process.env` under `options.env`, so a test helper can only add or
overwrite keys, and blanking looks like the way to hide a developer's own env. Probed 2026-10-17 with
`GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1` and a repo-local `user.name`: `GIT_AUTHOR_NAME=`
→ fatal; key absent → the configured name. `anonymousRunner` in `tests/git-repo.ts` removes the keys
from `process.env` around its synchronous call instead.
