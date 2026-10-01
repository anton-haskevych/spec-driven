---
kind: gotcha
paths: [skills/spec/tools/tests/**, skills/spec/tools/publish/**, skills/spec/tools/core/git.ts]
seen-in: [spec-loop-automation]
created: 2026-09-30T18:10:44-07:00
---

# Code under test that spawns git must get `isolatedRunner`, not `systemRunner`

Pass `isolatedRunner` from `tests/git-repo.ts` to any code under test that runs git (`gitAt(repo.dir, isolatedRunner)`). It carries the fixed `GIT_AUTHOR_*`/`GIT_COMMITTER_*` identity and `GIT_CONFIG_GLOBAL=/dev/null` that the repo helper itself uses.

Why it bites: `commit-tree`, `merge` and `commit` need an identity. On a laptop `systemRunner` picks up the global git config and the test passes; on CI (no identity) it fails with "Please tell me who you are", and a developer's global hooks or signing config can leak into the run. Seen when publish tests first called `systemRunner`.

Also: each real-git test costs ~0.5–1 s (publish's 10 tests ≈ 10 s). Keep the logic in pure parsers with fast unit tests, and use real repos for the paths only git can prove.
