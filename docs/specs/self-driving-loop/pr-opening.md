# PR Opening — Self-Driving Loop

## Spec state

Spec written, not yet implemented. 4 code phases. Suggested split: PR A = phases 1–3 (mode-file
prose + one doctor check), PR B = phase 4 (project dir walk-up, pack budget). A and B are
independent; both can start now, alongside pr-babysit. No branch/PR yet.

## Pre-PR checks

- [ ] `bun test` green (from the repo root)
- [ ] `bun run typecheck` green
- [ ] `python3 scripts/version.py` (no args) reports every version in sync after the bump
- [ ] Changed mode files read end to end once: no dangling "refresh the Spec state", "on approval" or per-session `spec-bump.sh` lines left (`rg` for each)
- [ ] PR B: one CRM execute pack measured before/after, both sizes in the PR body
