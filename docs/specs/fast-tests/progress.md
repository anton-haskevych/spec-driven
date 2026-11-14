# Fast Tests — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md` (flat)
> or `phases/phase-<N>-<slug>/plan.md` (folder). Forward-propagating learnings live
> in `ledger/`. Ephemeral state lives in `in-flight/phase-<N>.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification
> steps here.

## Success metrics

- Full suite (`bun test`) well under its 443 s baseline, measured by junit in phase 9
- Per-commit gate (`bun run test:fast`) runs no real git and finishes in seconds
- `REAL_GIT_CAP` falls from 74 to the adapter files only; no repo built in `beforeEach`
- Zero bun timeout failures in a full run

## Phases

- [x] Phase 1 — Guard and two speeds → `phases/phase-1-guard-and-two-speeds.md`
- [x] Phase 2 — Contract suite → `phases/phase-2-contract-suite.md`
- [x] Phase 3 — Command tests can take the fakes → `phases/phase-3-command-seam.md`
- [ ] Phase 3a — Board, land and remote seams → `phases/phase-3a-board-land-and-remote-seams.md`
- [ ] Phase 4 — Claims and board tests on fakes → `phases/phase-4-claims-tests.md`
- [ ] Phase 5 — Record-writing command tests on fakes → `phases/phase-5-record-write-tests.md`
- [ ] Phase 6 — Record ticks, exports and readers on fakes → `phases/phase-6-record-read-tests.md`
- [ ] Phase 7 — Land-on-main and join tests on fakes → `phases/phase-7-land-and-join-tests.md`
- [ ] Phase 8 — Tests that only needed git's common dir → `phases/phase-8-state-dir-tests.md`
- [ ] Phase 9 — Real-git files build once per file → `phases/phase-9-surviving-real-git.md`
