# Spec Spin-off — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md`. Forward-propagating
> learnings live in `ledger/`. Ephemeral state lives in `in-flight.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification steps here.

## Success metrics

- A phase can declare `needs: [<spec>]` on a spec that has no phases; the doctor is clean and the phase waits until that spec is finished
- From a busy session, a new spec gets a seed and its own iTerm tab running prep, in one step the agent runs
- The fresh prep session writes the brief from the seed without re-asking what the parent already decided

## Phases

- [x] Phase 1 — Whole-spec needs → `phases/phase-1-whole-spec-needs.md`
- [x] Phase 2 — Launch command → `phases/phase-2-launch-command.md`
- [ ] Phase 3 — Spin-off flow in the modes → `phases/phase-3-spin-off-flow.md`
