# Owner Split — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md` (flat)
> or `phases/phase-<N>-<slug>/plan.md` (folder). Forward-propagating learnings live
> in `ledger/`. Ephemeral state lives in `in-flight/phase-<N>.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification
> steps here.

## Success metrics

- A crew run in CRM by Anton launches zero workers on `owner: taras` specs, with no skip rows in run.md.
- `board --who taras` lists all 6 of Taras's specs, not only the 4 in focus. Both machines on the release that ships this.
- "Assign X to Taras" is one `spec.ts owner` call, seen on both machines after a fetch.

## Phases

- [x] Phase 1 — Owners, assigned and read everywhere → `phases/phase-1-owners-everywhere.md`
- [x] Phase 2 — The crew works only its runner's specs → `phases/phase-2-crew-follows-owner.md`
- [x] Phase 3 — Suggestions follow the owner → `phases/phase-3-suggestions-follow-owner.md`
- [x] Phase 4 — What is X working on → `phases/phase-4-who-is-on-what.md`
