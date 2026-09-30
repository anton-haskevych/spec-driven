# PR Opening — Spec Loop Automation

## Spec state

Spec written, not yet implemented. 9 code phases + 1 task phase (CRM adoption). No branch/PR yet.

Suggested PR split (from phase `pr:` fields):
- **A** — phases 1, 9 (pack parse fix, outcome line)
- **B** — phases 2, 3, 4 (spec-file writers)
- **C** — phases 5, 6, 7 (settings, git runner users, publish + push)
- **D** — phase 8 (hooks)

Each PR ships with a patch/minor version bump via `plugin-publish` so installed copies (Anton, Taras) pick it up. Phase 10 runs in CRM after C and D are released.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Tick each before opening the PR (plugin repo PRs are ready, not draft) — never straight to `main`.

- [ ] `bun test` passes (all suites, including `skill-wiring.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py` — all version declarations match
- [ ] New commands registered in `spec.ts` USAGE, SKILL.md *Tools*, README
- [ ] Every mode-file tool step touched has a no-Bun fallback line
- [ ] `ROADMAP.md` gets a row for the release
- [ ] Smoke: in a CRM worktree, `/spec execute` with no name and with `phase N` loads the pack
