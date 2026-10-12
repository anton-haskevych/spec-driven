# PR Opening — Oversee Crew

## Spec state

Spec written 2026-10-12 from prep (research waves 0, 1, 2, 2b, 2c and the craft wave) and the
approved proposal page. 5 code phases + 1 task phase. No branch or PR yet.
Split: **PR A: phase 1** (release 2.43.0) · **B: phase 2** · **C: phase 3** · **D: phase 4** ·
**E: phase 5**, one minor version each. Phase 6 runs in CRM (task phase, no PR here).
Order: 1 first; then 2, 4 and 6 in parallel; 3 after 2 (same board files) and self-driving-loop
phase 1; 5 after 3. The crew builds 2–5 once 2.43.0 is installed.
Ship mode for this spec: not set; the first overseer run asks.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never
straight to `main`.

- [ ] `bun test` passes (incl. `skill-wiring.test.ts`, `commands-table.test.ts`, `launch.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py --set <version>`; all declarations match; ROADMAP row added
- [ ] New and touched tool files under 250 lines, functions under 50 (`principles.md`)
- [ ] `bun skills/spec/tools/spec.ts doctor oversee-crew-spec` has no errors
- [ ] Phase 1 dogfood: one `/spec oversee-crew` run on a real spec with at least 2 background workers and 1 babysitter; watcher lines, one close-out check and one pause pasted here
- [ ] Phase 1: `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1` confirmed to stop a worker's background shell on `claude stop` (or the launch line changed to what does)
