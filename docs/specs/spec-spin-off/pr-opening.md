# PR Opening — Spec Spin-off

## Spec state

Done: phases 1–3. Branch `spec-spin-off`. One PR (A): phases 1–3, branch `spec-spin-off`. Release as a minor bump after merge.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

- [x] `bun test` passes (all suites, including `skill-wiring.test.ts` and `commands-table.test.ts`) — 406 pass, 0 fail (2026-10-01)
- [x] `bun run typecheck` clean
- [x] `bun install --frozen-lockfile` clean (no new runtime deps) — no changes
- [x] `python3 scripts/version.py` — all version declarations match — 2.33.0; bump to 2.34.0 at release
- [x] New `launch` command in the `spec.ts` table, SKILL.md *Tools* bullet, README
- [x] Every mode-file tool step touched has a no-Bun fallback line — spin-off list + launch steps
- [x] `ROADMAP.md` gets a row for the release — 2.34.0
- [x] Smoke: `launch prep <name>` from this iTerm opens a tab running Claude with the prep prompt — `launch status spec-spin-off`: tab "spec-spin-off status" ran the skill and printed the table (read-only stand-in for prep); AppleScript for iTerm and Terminal.app compiles with `osacompile`
