# PR Opening — PR Babysit

## Spec state

Spec written 2026-10-10 from prep (`research/2026-10-10-wave-1-pr-moment-ci-reality.md`, `research/2026-10-10-craft-pr-commands-verdict-fixtures.md`). 7 code phases + 1 task phase. Branch `feat/pr-babysit-pr-a`, no PR yet.
Done: phase 1 (verdict, rollup source, `pr status` table, `pr` group), phase 2 (babysit log, `pr log`), phase 3 (`pr wait`; smoke green on CRM #923), phase 4 (`pr open`, race-safe ready, `<spec> <group>` by branch), phase 5 (`pr merge`, merge line on main via `core/land-on-main.ts`), phase 6 (failure facts + saved job logs in `pr status`, `pr rerun`, `gates.ci-triage`; smoke on CRM #922), phase 7 (the PR question, `babysit` sub-command + `babysit.md`, `launch babysit`, `pr-<group>` claims, `babysitting` board cell, `pr log --start/--pushed/--stopped`, 2.42.0). Left: PR A (pre-PR checks green, awaiting the PR question), then 8 in CRM (its `checks.external: ["Vercel*"]` already landed on CRM main, `d59712d`).
Split: **PR A: phases 1–7**, one PR (Anton prefers the fewest PRs), release 2.42.0. Phases 1 and 2 start in parallel; 3, 4 and 6 follow; 5 after 4; 7 last.
Phase 8 (task) runs in CRM once 2.42.0 is installed.
PR #22 merged 2026-10-10 as c7a01e8 (squash).

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

- [x] `bun test` passes (incl. `commands-table.test.ts`, `skill-wiring.test.ts`) — 1072 pass, 0 fail (2026-10-10)
- [x] `bun run typecheck` clean — 2026-10-10
- [x] `bun install --frozen-lockfile` clean (no new runtime deps) — no changes
- [x] `python3 scripts/version.py --set 2.42.0`; all declarations match; ROADMAP row added — "All version declarations match: 2.42.0"
- [x] New and touched files under 250 lines, functions under 50 (`principles.md`) — largest touched: `board/model.ts` 161
- [x] `pr status` on a real open PR of this repo and on a CRM PR prints the grouped table; board verdict matches — this repo has no open PR (#21 merged reads `verdict: merged`); CRM #922 red table with saved logs, #925 draft. No spec PR with checks on CRM's board right now, so the board match rests on the shared `checksVerdict` (phase 1 tests), not a live side-by-side
- [ ] Dogfood: this PR is opened with `pr open` and babysat to merged by `/spec babysit pr-babysit A`; `pr log` excerpt pasted here
