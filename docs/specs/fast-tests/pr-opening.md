# PR Opening — Fast Tests

## Spec state

Spec written 2026-11-13 from prep (wave 0, wave 1, craft). 10 code phases (3 split into 3 and 3a by review 2026-11-13), one PR (Anton: one PR, quality and
completion time first). **A:** phases 1–9 on `feat/fast-tests`. Phases 4–8 are independent of each other after
phase 3a. Baseline: 443 s full suite, 439 s of it in 74 real-git files (`research/2026-11-13-wave-0-timings-and-council.md`).

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin PRs open ready, not draft — never straight to `main`.

- [ ] `bun test` passes and `bun run typecheck` is clean (phase 1 replaces this line with `gate: pre-pr` once `gates.md` exists)
- [ ] `bun run test:fast` runs no `*.git.test.ts`, its git tripwire stayed silent, and it passes
- [ ] `real-git-allowlist.test.ts` green with `REAL_GIT_CAP` equal to the list length and empty repo-build and helper exception sets
- [ ] Full-suite junit timing recorded here against the 443 s baseline (phase 9)
- [ ] `bun install --frozen-lockfile` makes no changes and CI installs `@ast-grep/napi`'s linux binary (pinned)
- [ ] `bun /Users/antonhaskevych/.claude/plugins/cache/spec-driven-marketplace/spec-driven/2.58.0/skills/spec/tools/spec.ts doctor fast-tests` clean, and no settings/gates errors
