# Spec Board — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md`. Forward-propagating
> learnings live in `ledger/`. Ephemeral state lives in `in-flight.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification steps here.

## Success metrics

- `/spec list` in CRM prints the same board from the main checkout and from any worktree (only `◀ here` moves), in under 5 s including fetch and gh
- A phase ticked but uncommitted in worktree B shows in flight when the board runs in worktree A
- Two sessions running execute on the same phase: one claims it, the other moves to the next ready phase
- Handoff ends with the next 3 ready phases and needs-you items, with no hand-built synthesis

## Phases

- [ ] Phase 1 — Spec readers → `phases/phase-1-spec-readers.md`
- [ ] Phase 2 — Workspace scan → `phases/phase-2-workspace-scan.md`
- [ ] Phase 3 — Board in list → `phases/phase-3-board-in-list.md`
- [ ] Phase 4 — PRs and sessions → `phases/phase-4-prs-and-sessions.md`
- [ ] Phase 5 — Phase claims → `phases/phase-5-phase-claims.md`
- [ ] Phase 6 — Loop wiring → `phases/phase-6-loop-wiring.md`
