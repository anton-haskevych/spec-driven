---
kind: principle
paths: [skills/spec/tools/tests/**]
seen-in: [live-board, fast-tests]
created: 2026-11-13T15:59:30-08:00
enforced-by: skills/spec/tools/tests/real-git-allowlist.test.ts
---

# Tests use real git only for code that itself runs git

A test may build a repo (`tests/git-repo.ts`, `tests/joined-repo.ts`) only when the code under test builds git argv: the adapters (`gitRecordPort`, the claims remote port, land-on-main's push, fetch/archive/worktree plumbing, parsers of git output). Such a file is named `*.git.test.ts` and listed in `tests/real-git/allowlist.ts` with the git behaviour it proves. Every other test runs on the fakes (`tests/fake-record.ts`, `tests/fake-ref.ts`) or on a runner stub (`tests/stub-runner.ts`: `notARepoRunner`, `stubRunner`). `real-git-allowlist.test.ts` fails the moment a test reaches `git-repo.ts` without the suffix, and `bun run test:fast` fails when a fast test still spawns git through a default `systemRunner`.

Why: in November 2026, 74 of 304 test files built real repos and took 439 s of a 443 s run; the other 230 took 5 s (`docs/specs/fast-tests/research/2026-11-13-wave-0-timings-and-council.md`). Most proved logic a pure sibling test already covered, through a bare origin, clones and worktrees, and hit bun's 5 s timeout under load. A runner left at its `systemRunner` default is the quiet version: git fails in a temp folder, the command falls back, and the test passes while proving nothing (16 such files before `test:fast` existed).
