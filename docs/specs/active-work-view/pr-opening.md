# PR Opening — Active Work View

## Spec state

Spec written 2026-10-07, not yet implemented. 5 code phases + 1 task phase. No branch/PR yet.
Split (value first):
- **PR A: phase 1.** Shared helpers, test factories, `list --local` fix. Refactor only; release 2.36.8.
- **PR B: phases 2–3.** Focus set + FOCUS lane. The first usable cut; release 2.37.0. Phases 1 and 2 run in parallel.
- **PR C: phases 4–5.** Teammate's work and `--who`; idle claims and shipped focus. Release 2.38.0.
- Phase 6 (task) runs in CRM once 2.37.0 is installed.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

Every PR:
- [ ] `bun test` passes (incl. `commands-table.test.ts`, `skill-wiring.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py --set <v>`; all declarations match; ROADMAP row added
- [ ] New and touched files under 250 lines, functions under 50 (`principles.md`)

PR A:
- [ ] Smoke in CRM: `spec.ts list` output identical to 2.36.7 (diff the two); `spec.ts list table --local` prints the table

PR B:
- [ ] Smoke in CRM without `_focus/`: board identical to 2.36.7
- [ ] Smoke in a scratch clone with 3 focus entries: FOCUS lane in rank order; `focus add --top`, `--after`, `move`, `drop` each write one file; doctor clean
- [ ] Smoke in CRM: every live session on this machine appears on a focus row or in `other sessions` (compare with `ps` / ListAgents)
- [ ] Board time in CRM with gh and sessions stays < 5 s
- [ ] `list.md` no-Bun fallback still describes the table; `SKILL.md` *Tools*, `README.md` updated

PR C:
- [ ] Smoke in CRM: Taras's gift-cards claims and PRs #904/#905 show as `taras` on the gift-cards row; `board focus --who taras` and `--who me` filter
- [ ] Smoke in CRM: recurring-series-lifecycle-clarity · 7 (or any 2-day-idle live claim) shows `claim idle`
