# PR Opening — Active Work View

## Spec state

Spec written 2026-10-07, reviewed 2026-10-07 (`reviews/2026-10-07-focus-storage-and-landing.md`). 6 code phases + 1 task phase.
Done: phase 1 (PR A: #17, merged as 2.36.8); phases 2–4 (PR B: #18, merged 2026-10-08 as 2.37.0); phase 7 (PR D: #20, open as 2.39.0). Left: 5 (PR C: #19, open as 2.38.0), then 6. Phase 4 moved into PR B (user, 2026-10-07).
Phase 7 added 2026-10-08 while seeding CRM: `focus:` becomes a band (must / should / could) instead of a rank (`ledger/decision-focus-is-a-band.md`); phase 6 now needs it.
Phase 3 smoke so far: CRM `board --local` with no `focus:` is byte-identical to 2.36.8 (2026-10-07).
Split (value first):
- **PR A: phase 1.** Shared helpers, test factories, `list --local` fix. Refactor only; release 2.36.8.
- **PR B: phases 2–4.** Focus field + base-first writer + FOCUS lane + teammate's work and `--who`. The first usable cut; release 2.37.0. Phases 1 and 2 run in parallel.
- **PR C: phase 5.** Idle claims. Next minor release.
- **PR D: phase 7.** Focus bands, 2.39.0 (PR C took 2.38.0). Independent of PR C (both touch `board/model.ts`, `board/render.ts` and the ROADMAP table; rebase the second).
- Phase 6 (task) runs in CRM once the release with phase 7 is installed on both machines.

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

PR C:
- [ ] Smoke in CRM: recurring-series-lifecycle-clarity · 7 (or any 2-day-idle live claim) shows `claim idle`

PR D:
- [x] Smoke against a scratch bare origin + two clones: `focus add` into each band, `move`, `drop`; both clones show the same MUST / SHOULD / COULD lane; doctor 0 errors (2026-10-08: the stale clone's board matched; `--top` and a non-band refused with the new copy; a hand-written `focus: 7` showed under SHOULD with the doctor's warning; `add` overwrote a legacy 20)
- [x] Smoke in CRM before reseeding: the four legacy numeric `focus:` values show under SHOULD and the doctor warns; with no `focus:` the no-focus golden still matches (2026-10-08: `board focus --local` lists all four under SHOULD, ready rows note `should`; doctor warns on an `origin/main` export, see `gotcha-doctor-reads-the-checkout-not-origin`; golden test untouched and green)
- [x] PR body says `FocusRow.rank` became `band` with `BOARD_VERSION` 1 kept, and why
- [x] Every-PR checks re-run for PR D, 2.39.0, 2026-10-08: 883 tests pass, typecheck clean, frozen lockfile clean, versions match, no touched file over 250 lines
