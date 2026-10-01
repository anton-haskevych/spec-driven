# Spec Board — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md`. Forward-propagating
> learnings live in `ledger/`. Ephemeral state lives in `in-flight.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification steps here.

## Success metrics

- `/spec list` in CRM prints the same board from the main checkout and from any worktree (only `◀ here` moves), in under 5 s including fetch and gh
- A phase ticked but uncommitted in worktree B shows in flight when the board runs in worktree A
- Two sessions running execute on the same phase, including a takeover of a closed claim: exactly one holds it, the other moves to the next ready phase
- Handoff ends with the next 3 ready phases and needs-you items, with no hand-built synthesis

## Phases

- [x] Phase 1 — Board from main → `phases/phase-1-board-from-main.md`
- [x] Phase 2 — Workspace scan → `phases/phase-2-workspace-scan.md`
- [x] Phase 3 — In-flight overlay → `phases/phase-3-in-flight-overlay.md`
- [x] Phase 4 — PRs and sessions → `phases/phase-4-prs-and-sessions.md`
- [ ] Phase 5 — Phase claims → `phases/phase-5-phase-claims.md`
- [ ] Phase 6 — Loop wiring → `phases/phase-6-loop-wiring.md`
