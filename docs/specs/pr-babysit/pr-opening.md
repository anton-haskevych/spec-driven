# PR Opening — PR Babysit

## Spec state

Spec written 2026-10-10 from prep (`research/2026-10-10-wave-1-pr-moment-ci-reality.md`, `research/2026-10-10-craft-pr-commands-verdict-fixtures.md`). 7 code phases + 1 task phase. Branch `feat/pr-babysit-pr-a`, no PR yet.
Done: phase 1 (verdict, rollup source, `pr status` table, `pr` group), phase 2 (babysit log, `pr log`), phase 4 (`pr open`, race-safe ready, `<spec> <group>` by branch). Left: 3, 5–7, then 8 in CRM.
Split: **PR A: phases 1–7**, one PR (Anton prefers the fewest PRs), release 2.42.0. Phases 1 and 2 start in parallel; 3, 4 and 6 follow; 5 after 4; 7 last.
Phase 8 (task) runs in CRM once 2.42.0 is installed.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

- [ ] `bun test` passes (incl. `commands-table.test.ts`, `skill-wiring.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py --set 2.42.0`; all declarations match; ROADMAP row added
- [ ] New and touched files under 250 lines, functions under 50 (`principles.md`)
- [ ] `pr status` on a real open PR of this repo and on a CRM PR prints the grouped table; board verdict matches
- [ ] Dogfood: this PR is opened with `pr open` and babysat to merged by `/spec babysit pr-babysit A`; `pr log` excerpt pasted here
