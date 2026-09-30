---
kind: gotcha
applies-to: [phase 1, 7, 8]
created: 2026-09-30T15:16:12-07:00
---

# `locateSpecFile` never matches repo-relative git paths

`SPEC_FILE_PATTERN` (`core/spec-folders.ts:14`) is `^(.*\/docs\/specs\/)…` — it needs a `/` before `docs/specs/`. Hook payloads carry absolute paths, so it works there; `git diff --name-only`, `git log --name-only` and `git status --porcelain` print `docs/specs/foo/progress.md`, which never matches. Only `landing/docs/specs/…`-style paths would.

Fix: join every git path onto `git rev-parse --show-toplevel` before calling it. For "is this a spec doc?" checks on repo-relative paths (push, publish, bash guard), use `isSpecDocPath`, which covers both `docs/specs/**` and `*/docs/specs/**`.

Also: `git status --porcelain` without `--untracked-files=all` collapses a brand-new spec folder to `docs/specs/new/`, which the pattern rejects (no file after the name). Use `-z --untracked-files=all`.

Test inference against a real `tests/git-repo.ts` repo — the stub runner happily returns whatever shape you assume.
