# PR Opening — Active Work View

## Spec state

Spec written 2026-10-07, reviewed 2026-10-07 (`reviews/2026-10-07-focus-storage-and-landing.md`). 5 code phases + 1 task phase.
Done: phase 1 (PR A: #17, merged as 2.36.8); phases 2–4 (PR B: #18, merged as 2.37.0); phase 5 (PR C: `feat/active-work-view-pr-c`). Left: 6. Phase 4 moved into PR B (user, 2026-10-07).
Phase 3 smoke so far: CRM `board --local` with no `focus:` is byte-identical to 2.36.8 (2026-10-07).
Split (value first):
- **PR A: phase 1.** Shared helpers, test factories, `list --local` fix. Refactor only; release 2.36.8.
- **PR B: phases 2–4.** Focus field + base-first writer + FOCUS lane + teammate's work and `--who`. The first usable cut; release 2.37.0. Phases 1 and 2 run in parallel.
- **PR C: phase 5.** Idle claims. Release 2.38.0.
- Phase 6 (task) runs in CRM once 2.37.0 is installed.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

Every PR:
- [x] `bun test` passes (incl. `commands-table.test.ts`, `skill-wiring.test.ts`)
- [x] `bun run typecheck` clean
- [x] `bun install --frozen-lockfile` clean (no new runtime deps)
- [x] `python3 scripts/version.py --set <v>`; all declarations match; ROADMAP row added
- [x] New and touched files under 250 lines, functions under 50 (`principles.md`)

PR A (checks above ticked for PR A, 2.36.8, 2026-10-07: 777 tests pass; CRM `board --local` and `list table` byte-identical to 2.36.7; `list --local` prints the board):
- [x] Smoke in CRM: `spec.ts list` output identical to 2.36.7 (diff the two); `spec.ts list table --local` prints the table

PR B (checks above re-run for PR B, 2.37.0, 2026-10-07: 886 tests pass, typecheck clean, frozen lockfile clean, versions match. Size: `tests/context.test.ts` is 300 lines, 299 on main already, +1 here):
- [x] Smoke in CRM before any `focus:`: board identical to 2.36.8 (`board --local` byte-identical; full `board` identical except one session age ticking over)
- [x] Smoke against a scratch bare origin + two clones: `focus add --top`, `--after`, `move`, `drop` from the stale clone each push one commit touching one `CLAUDE.md`; both clones' boards show the same order; doctor 0 errors. First run found `--top` tying at rank 0 (`move delta --top` → 2/4); fixed, re-run gives 1/4
- [x] Smoke in CRM: every live CRM session on this machine appears on a focus row or in `other sessions`, and no claude-plugins session does (focus set in memory only, 13 specs from phase 6's list; 8 CRM sessions: 7 on rows, `crm-82` in other sessions; the spec-driven session absent)
- [ ] Board time in CRM with gh and sessions stays < 5 s — not met, and not a regression: this branch 6.2 / 6.7 / 6.7 s, released 2.36.8 6.8 / 6.5 / 7.2 s on the same machine (2026-10-07, several sessions running)
- [x] `list.md` no-Bun fallback still describes the table; `SKILL.md` *Tools*, `README.md` updated
- [x] Smoke in CRM: Taras's gift-cards remote claims show as `taraskorpach: 6 claims 14h`; open PR #911 linked on main shows under its author (me); `board focus --who taras` and `--who me` filter (text here, `--json` in `board-command.test.ts`). No open PR of Taras's is linked on main to show under his name

PR C (checks above re-run for PR C, 2.38.0, 2026-10-07: 895 tests pass, typecheck clean, frozen lockfile clean, versions match, touched files ≤ 187 lines):
- [ ] Smoke in CRM: recurring-series-lifecycle-clarity · 7 (or any 2-day-idle live claim) shows `claim idle`
  - 2026-10-07: no 2-day-idle live claim in CRM to smoke against (that session moved on to phase 8, busy). CRM `board you` shows no `claim idle` row, which is correct; the flagged path is covered by `board-claims.test.ts`.
