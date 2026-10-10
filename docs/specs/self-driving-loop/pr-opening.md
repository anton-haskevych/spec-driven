# PR Opening — Self-Driving Loop

## Spec state

Spec written and reviewed (2026-10-10), not yet implemented. 4 code phases. Split: PR A = phases 1–3
(mode-file prose, board `title`/review row, in-flight per phase), PR B = phase 4 (project dir,
hooks, pack budget). A and B are independent; both can start now. pr-babysit edits the same
mode files: whoever lands second merges main. No branch/PR yet.

## Pre-PR checks

- [ ] `bun test` green (from the repo root)
- [ ] `bun run typecheck` green
- [ ] Release: version = main's minor + 1 at merge time (`python3 scripts/version.py --set <v>`), `python3 scripts/version.py` reports every version in sync, ROADMAP row, README rows if a Tools bullet changed
- [ ] Changed mode files read end to end once: no dangling "refresh the Spec state", "on approval", "offer … on a yes", per-session `spec-bump.sh` or single-file `in-flight.md` wording left (`rg` for each)
- [ ] PR B: CRM execute packs (max and median) measured before/after, numbers in the PR body
