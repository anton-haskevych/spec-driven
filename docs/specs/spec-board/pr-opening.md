# PR Opening — Spec Board

## Spec state

Spec written, not yet implemented. 6 code phases planned. No branch/PR yet.
Split (value first):
- **PR A: phases 1–3.** Readers, workspace scan, board in `list`. Phases 1 and 2 can run in parallel. Release 2.35.0.
- **PR B: phases 4–6.** PRs and sessions, claims, loop wiring. Release 2.36.0.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

PR A:
- [ ] `bun test` passes (all suites, including `commands-table.test.ts`, `skill-wiring.test.ts`, `portfolio.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py` — all version declarations match; bump at release
- [ ] Smoke in CRM: `spec.ts list` from the main checkout and from one worktree print the same board except `◀ here`; time it (target < 3 s without gh)
- [ ] Smoke offline (no network): header says offline, board renders
- [ ] `list.md` no-Bun fallback still describes the table; README + SKILL.md *Tools* updated; ROADMAP row

PR B:
- [ ] `bun test`, `bun run typecheck`, frozen lockfile, `version.py` as above
- [ ] Smoke in CRM: PR and session cells match `gh pr list` and the open sessions; total < 5 s
- [ ] Smoke: two sessions `claim take` the same phase — one wins, the other gets the holder's name; handoff releases
- [ ] `launch execute <spec> <phase>` from iTerm opens a tab running execute on that phase
- [ ] Every mode-file tool step touched has a no-Bun fallback line; README, SKILL.md, ROADMAP row
