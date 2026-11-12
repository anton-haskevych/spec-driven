# PR Opening — Live Board

## Spec state

Spec written 2026-11-11 from prep (wave 1, wave 2, craft) and re-planned by the review of the same day
(`reviews/2026-11-11-write-contract-and-switch-day.md`). 12 code phases and 2 task phases. PR split:
**A:** phase 1 · **B:** phases 2, 2a, 3, 3a, 3b, 4 · **C:** phase 6 · **D:** phase 7 · **E:** phase 8 · **F:** phase 9 ·
**G:** phase 10. Phases 5 and 11 are tasks in the CRM repo and open no plugin PR.
One minor version per PR, picked at merge (main's minor + 1). PR B ships with `board.record` off. PRs C, D
and E each raise the record's layout number and carry the upgrade step for specs that joined earlier.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin PRs open ready, not draft — never straight to `main`.

- [ ] `bun test` passes (incl. `skill-wiring.test.ts`, `commands-table.test.ts`, `board-no-focus-golden.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime dependencies)
- [ ] `python3 scripts/version.py --set <main's minor + 1>` at merge; all declarations match; ROADMAP row added
- [ ] New and touched tool files under 250 lines, functions under 50
- [ ] `bun skills/spec/tools/spec.ts doctor live-board` has no errors
- [ ] With the board off, a file-based spec behaves as before: the pre-existing suites pass unchanged
- [ ] From a scratch repo with two clones (two "machines"), with this branch's tools: the PR's own scenario
  runs end to end and its output is pasted here (PR A: three writers race; PR B: a spec joins, two trees tick
  tasks of the same phase and of different phases, each sees the other's on its next command, and
  `record export` gives the lists back; PR C, D, E: a spec joined on the previous release is upgraded on its
  next touch and the previous release refuses to write)
- [ ] The claims suites pass unchanged after `core/remote-push.ts` is lifted out (PR A)
