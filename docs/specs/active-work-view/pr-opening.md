# PR Opening — Active Work View

## Spec state

Spec written 2026-10-07, reviewed 2026-10-07 (`reviews/2026-10-07-focus-storage-and-landing.md`). 5 code phases + 1 task phase.
Done: phase 1 (branch `feat/active-work-view-pr-a`, PR A: #17, ready for review). Left: 2–6.
Split (value first):
- **PR A: phase 1.** Shared helpers, test factories, `list --local` fix. Refactor only; release 2.36.8.
- **PR B: phases 2–3.** Focus field + base-first writer + FOCUS lane. The first usable cut; release 2.37.0. Phases 1 and 2 run in parallel.
- **PR C: phases 4–5.** Teammate's work and `--who`; idle claims. Release 2.38.0.
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

PR B:
- [ ] Smoke in CRM before any `focus:`: board identical to 2.36.7
- [ ] Smoke against a scratch bare origin + two clones: `focus add --top`, `--after`, `move`, `drop` from the stale clone each push one commit touching one `CLAUDE.md`; the other clone's board shows the same order; doctor clean
- [ ] Smoke in CRM: every live CRM session on this machine appears on a focus row or in `other sessions`, and no claude-plugins session does (compare with ListAgents)
- [ ] Board time in CRM with gh and sessions stays < 5 s
- [ ] `list.md` no-Bun fallback still describes the table; `SKILL.md` *Tools*, `README.md` updated

PR C:
- [ ] Smoke in CRM: Taras's gift-cards remote claims show as `taras`, and open PRs linked on main show by author; `board focus --who taras` and `--who me` filter text and `--json`
- [ ] Smoke in CRM: recurring-series-lifecycle-clarity · 7 (or any 2-day-idle live claim) shows `claim idle`
