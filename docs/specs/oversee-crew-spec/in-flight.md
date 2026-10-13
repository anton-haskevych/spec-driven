# In-flight state

**Session ended:** 2026-10-12
**Active phase:** 2 — Ship mode and review state on the board (done; PR group B ready)

## Where things stand

- Phase 2 done and pushed on `feat/oversee-crew-spec-pr-b`; no PR yet (the overseer runs the PR moment).
- Version 2.44.0 and its ROADMAP row are set on the branch (main was 2.43.0, no open PRs). If
  self-driving-loop or anything else reaches 2.44 on main first, re-run
  `python3 scripts/version.py --set <main's minor + 1>` and fix the ROADMAP row before merging.
- Board JSON is version 2. self-driving-loop phase 1 shares the bump: if it lands first with its own
  bump, keep one bump total when merging main (no second increment needed for kinds with no data).

## Implicit context

- The phase 1 dogfood check in `pr-opening.md` stays open: it belongs to the overseer run now in progress.
