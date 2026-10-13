# PR Opening — Self-Driving Loop

## Spec state

4 code phases. Split: PR A = phases 1–3 (mode-file prose, board `title`/review row, in-flight per
phase), PR B = phase 4 (project dir, hooks, pack budget). pr-babysit edits the same mode files:
whoever lands second merges main.

- PR A: phase 1 done on `feat/self-driving-loop-pr-a`; phases 2–3 left.
- PR B: phase 4 done on `feat/self-driving-loop-pr-b`; tests and typecheck green; no PR yet.
  CRM execute packs (92 open specs, 2026-10-12): median 20,963 → 16,708 chars, max 69,043 → 29,193, over 30K 20 → 0.
PR #24 merged 2026-10-12 as afd223b (squash).

## Pre-PR checks

- [ ] `bun test` green (from the repo root)
- [ ] `bun run typecheck` green
- [ ] Release: version = main's minor + 1 at merge time (`python3 scripts/version.py --set <v>`), `python3 scripts/version.py` reports every version in sync, ROADMAP row, README rows if a Tools bullet changed
- [ ] Changed mode files read end to end once: no dangling "refresh the Spec state", "on approval", "offer … on a yes", per-session `spec-bump.sh` or single-file `in-flight.md` wording left (`rg` for each)
- [ ] PR B: CRM execute packs (max and median) measured before/after, numbers in the PR body
