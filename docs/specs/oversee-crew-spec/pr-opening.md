# PR Opening — Oversee Crew

## Spec state

Spec written 2026-10-12 from prep (research waves 0, 1, 2, 2b, 2c and the craft wave) and the
approved proposal page; collegium review 2026-10-12 (`reviews/…-state-homes-and-worker-lifecycle.md`)
reshaped state homes, the wait, babysitter lifecycle and deploy (infra only). 5 code phases + 1 task
phase. Branch `feat/oversee-crew-spec-pr-a` pushed (no PR yet).
Phase 1 done (2026-10-12), released as 2.43.0 with PR A.
Split: **PR A: phase 1** · **B: phase 2** · **C: phase 3** · **D: phase 4** · **E: phase 5**, one minor
version each, picked at merge (main's minor + 1). Phase 6 runs in CRM (task phase, no PR here).
Order: 1 first; then 2, 4 and 6 in parallel (4 re-planned after the first crew run); 3 after 2 (same
board files) and self-driving-loop phase 1; 5 after 3. The crew builds 2–5 once phase 1's release is installed.
Ship mode for this spec: not set; the first overseer run asks.
PR #23 merged 2026-10-12 as 9702d6b (squash).
Phase 2 done (2026-10-12) on `feat/oversee-crew-spec-pr-b`, pushed, no PR yet; version 2.44.0 + ROADMAP row
set on the branch. PR B checks re-run after merging main: 1120 tests pass, typecheck clean, lockfile clean,
touched files under 250 lines, doctor clean.
PR #25 merged 2026-10-12 as f6ce4d0 (squash).
Phase 4 done (2026-10-13) on `feat/oversee-crew-spec-pr-d`, pushed, no PR yet (held for review per the
crew brief; the overseer runs the PR moment). Version 2.46.0 + ROADMAP row set on the branch (main was
2.45.0). Checks after merging main: 1248 pass; real-git claim/board tests timed out at load average ~48
(hook timeouts, a different set each run; board-inputs passes on rerun), typecheck, lockfile and doctor
clean, new tool files under 250 lines.
PR #27 merged 2026-10-13 as 968cafa (squash).
Phase 3 done (2026-10-13) on `feat/oversee-crew-spec-pr-c` after merging main with PR D; version 2.47.0 +
ROADMAP row set on the branch (main was 2.46.0). Ship mode auto per the crew brief; the overseer runs the PR moment.
PR #28 merged 2026-10-13 as 3a4eb87 (squash).
Phase 5 done (2026-10-13) on `feat/oversee-crew-spec-pr-e`; version 2.48.0 + ROADMAP row set on the branch
(main was 2.47.0). Checks: 1288 pass, typecheck, lockfile and doctor clean, touched files under 250 lines.
Ship mode auto per the crew brief; the overseer runs the PR moment.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never
straight to `main`.

- [x] `bun test` passes (incl. `skill-wiring.test.ts`, `commands-table.test.ts`, `launch.test.ts`): 1099 pass
- [x] `bun run typecheck` clean
- [x] `bun install --frozen-lockfile` clean (no new runtime deps)
- [x] `python3 scripts/version.py --set <main's minor + 1>` at merge; all declarations match; ROADMAP row added
- [x] New and touched tool files under 250 lines, functions under 50 (`principles.md`)
- [x] `bun skills/spec/tools/spec.ts doctor oversee-crew-spec` has no errors
- [ ] Phase 1 dogfood: one `/spec oversee-crew` run on a real spec with at least 2 background workers and 1 babysitter; roster-wait lines, one close-out check, one babysitter left alone while on `pr wait`, and one pause pasted here
- [x] Phase 1: probe results (1.0) recorded in `research/phase-1/` and reflected in technical.md's state table
