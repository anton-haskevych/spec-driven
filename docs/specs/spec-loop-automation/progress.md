# Spec Loop Automation — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md` (flat)
> or `phases/phase-<N>-<slug>/plan.md` (folder). Forward-propagating learnings live
> in `ledger/`. Ephemeral state lives in `in-flight.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification
> steps here.

## Success metrics

- `/spec execute` with no name, a chunk hint, or trailing punctuation loads the pack whenever one spec is in play
- Zero python/sed edits to `progress.md`, phase files or ledger INDEX files in CRM sessions after adoption
- Zero hand-resolved INDEX.md merge conflicts after adoption
- No session ends with unpushed spec work; no "is it on the remote?" questions
- PR status answered by one command instead of polling loops

## Phases

- [x] Phase 1 — Context pack always loads → `phases/phase-1-context-pack-loads.md`
- [x] Phase 2 — Tick and deployed → `phases/phase-2-tick-and-deployed.md`
- [x] Phase 3 — Phase add and split → `phases/phase-3-phase-add-split.md`
- [x] Phase 4 — Lessons add → `phases/phase-4-lessons-add.md`
- [x] Phase 5 — Project settings → `phases/phase-5-project-settings.md`
- [x] Phase 6 — PR status → `phases/phase-6-pr-status.md`
- [x] Phase 7 — Publish and push → `phases/phase-7-publish-and-push.md`
- [x] Phase 9 — Plain-words outcome → `phases/phase-9-plain-words-outcome.md`
- [ ] Phase 10 — CRM adoption → `phases/phase-10-crm-adoption.md`
- [x] Phase 11 — Derived project ledger index → `phases/phase-11-derived-project-ledger-index.md`
