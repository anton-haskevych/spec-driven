---
kind: gotcha
paths: [skills/spec/tools/tests/**]
created: 2026-10-12T22:42:31-07:00
seen-in: [self-driving-loop]
---

# On macOS a temp dir path differs once a spawned shell prints it: compare real paths

`tmpdir()` returns `/var/folders/…`, but `/var` is a symlink to `/private/var`, and a spawned bash that `cd`s and prints `$PWD`/`pwd` gives `/private/var/folders/…`. A test asserting a child's printed path against a `createTree` path fails on macOS and passes on Linux CI. Compare against `realpathSync(path)`.

Evidence: `tests/spec-bump.test.ts` (self-driving-loop phase 4): `spec-bump.sh` printed `Updated: /private/var/folders/…/CLAUDE.md` while the fixture path was `/var/folders/…`.
