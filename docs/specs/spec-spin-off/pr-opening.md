# PR Opening — Spec Spin-off

## Spec state

Not started. One PR (A): phases 1–3, branch `spec-spin-off`. Release as a minor bump after merge.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

- [ ] `bun test` passes (all suites, including `skill-wiring.test.ts` and `commands-table.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py` — all version declarations match
- [ ] New `launch` command in the `spec.ts` table, SKILL.md *Tools* bullet, README
- [ ] Every mode-file tool step touched has a no-Bun fallback line
- [ ] `ROADMAP.md` gets a row for the release
- [ ] Smoke: `launch prep <name>` from this iTerm opens a tab running Claude with the prep prompt
