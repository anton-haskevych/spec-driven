# PR Opening — Spec Loop Automation

## Spec state

Reviewed (`reviews/2026-09-30-pre-execution-collegium.md`). Done: phases 1–7, 9 (all code phases). Phase 11 (project ledger INDEX retired, 2.36.1) on `feat/spec-loop-automation`. Left: 10 (task, in CRM, needs the release). Phase 8 dropped (`decision-no-bash-guard.md`). #3 merged to `main` 2026-10-01; #4 and #5 merged into their stacked bases instead (`gotcha-stacked-prs-merge-into-their-base.md`), so **#6** (https://github.com/anton-haskevych/spec-driven/pull/6, `feat/loop-automation-rest`) carries B+C to `main`. Original stack: `feat/context-pack-loads` = PR A #3 (https://github.com/anton-haskevych/spec-driven/pull/3; phase 1, plus the spec/review commits and ROADMAP rows). `feat/phase-writers` = PR B #4 (https://github.com/anton-haskevych/spec-driven/pull/4; phases 2, 3, 4), based on A; retarget to `main` after A merges. `feat/project-settings` = PR C #5 (https://github.com/anton-haskevych/spec-driven/pull/5; phases 5, 6, 7, 9), based on B.

Suggested PR split (from phase `pr:` fields):
- **A** — phase 1 (pack parse fix)
- **B** — phases 2, 3, 4 (spec-file writers)
- **C** — phases 5, 6, 7, 9 (settings, pr-status, publish + push, outcome line)

Order after review: A and B first (independent); C needs phase 4 from B. Each PR ships with a patch/minor version bump via `plugin-publish` so installed copies (Anton, Taras) pick it up. Phase 10 runs in CRM after A and C are released.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Tick each before opening the PR (plugin repo PRs are ready, not draft) — never straight to `main`.

- [x] `bun test` passes (all suites, including `skill-wiring.test.ts`) — A 189, B 295, C 392 pass, 0 fail (2026-09-30)
- [x] `bun run typecheck` clean — A, B, C tips
- [x] `bun install --frozen-lockfile` clean (no new runtime deps) — no changes
- [x] `python3 scripts/version.py` — all version declarations match — 2.30.1 on all tips; bumps happen at release
- [x] New commands in the `spec.ts` command table (USAGE derived), grouped SKILL.md *Tools* bullet, README — gaps fixed in 4652fa0 (settings.md in Tools, `gates --name` in README)
- [x] Every mode-file tool step touched has a no-Bun fallback line; SKILL.md parse prose still matches `parseContextRequest` — checked execute/update/handoff/create/review
- [x] `ROADMAP.md` gets a row for the release — 2.31–2.33 table on PR A (fd9f81c)
- [x] Smoke (A): in a CRM worktree, `/spec execute` with no name, with `phase N` and with `phaseN` loads the pack for a root spec and a `landing/` spec — throwaway sparse CRM clone: root `abandoned-booking-release` and landing `cache-components-migration` inferred; `phase 1`/`phase1`/`phase2` picked
- [x] Smoke (C): `publish-docs` in a throwaway clone of CRM — docs land on main, branch merges the snapshot, a following `git merge origin/main` is clean — throwaway bare origin: 2 files published, concurrent INDEX rows unioned, no code leaked, merge-back empty, `git merge origin/main` clean
