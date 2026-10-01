# PR Opening — Spec Loop Automation

## Spec state

Reviewed (`reviews/2026-09-30-pre-execution-collegium.md`). Done: phases 1–6. Left: 7–9 (code), 10 (task). Branches (local, not pushed; both also carry the spec/review commits that sit only on local `main`): `feat/context-pack-loads` = PR A (phase 1; phase 9 goes here). `feat/phase-writers` = PR B (phases 2, 3, 4 — complete), branched from PR A's branch, so rebase it onto `main` after A merges. `feat/project-settings` = PR C (phases 5, 6 complete; 7 next), branched from PR B's branch. No PR yet.

Suggested PR split (from phase `pr:` fields):
- **A** — phases 1, 9 (pack parse fix, outcome line)
- **B** — phases 2, 3, 4 (spec-file writers)
- **C** — phases 5, 6, 7 (settings, pr-status, publish + push)
- **D** — phase 8 (hooks; needs C's settings)

Order after review: A and B first (independent); C needs phase 4 from B; D needs phase 5 from C. Phases 5 and 9 both touch `commands/context.ts` and execute §10 — rebase whichever lands second. Each PR ships with a patch/minor version bump via `plugin-publish` so installed copies (Anton, Taras) pick it up. Phase 10 runs in CRM after C and D are released.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Tick each before opening the PR (plugin repo PRs are ready, not draft) — never straight to `main`.

- [ ] `bun test` passes (all suites, including `skill-wiring.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py` — all version declarations match
- [ ] New commands in the `spec.ts` command table (USAGE derived), grouped SKILL.md *Tools* bullet, README
- [ ] Every mode-file tool step touched has a no-Bun fallback line; SKILL.md parse prose still matches `parseContextRequest`
- [ ] `ROADMAP.md` gets a row for the release
- [ ] Smoke (A): in a CRM worktree, `/spec execute` with no name, with `phase N` and with `phaseN` loads the pack for a root spec and a `landing/` spec
- [ ] Smoke (C): `publish-docs` in a throwaway clone of CRM — docs land on main, branch merges the snapshot, a following `git merge origin/main` is clean
