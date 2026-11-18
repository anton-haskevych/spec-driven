# In-flight state

**Session ended:** 2026-11-17
**Active phase:** 3 — The spec branch and merge-back

## Where things stand

- Done and ticked: the addTree refactor; merge-back and --push (real-git tests in `publish-merge-back.git.test.ts`, cap 75); pr open / push / publish-docs lane refusals + `pushBranch` bases + writer invariants; the board's unopened-PR row skips lanes.
- Built but not ticked: deliverable 2's mode start. `startSpecBranch(projectDir, deps, spec, shipAlone)` (`commands/crew/spec-branch.ts`) does the record write + cut and returns `{ ok, lines }`; nothing calls it yet, because `crew start --spec` is Phase 1's flag and Phase 1 is not built. Placement already cuts lanes from `feat/<spec>`; the `phase set` ship-alone freeze is `shipAloneMoves` in `planChangePlan`.
- Not started: deliverable 5 (`groupKey`, cross-lane hold, the `specBranch` skip in `crew/scope.ts`). `scope.ts`, `TickWorld.layouts` and `tick-ports.ts` are Phase 1's new files.

## Implicit context

- Phase 3 now `needs: [1, 2]` (set this session): its last two deliverables sit on Phase 1's files.
- `crew start --spec` wiring when Phase 1 lands: call `startSpecBranch` before writing `run-<spec>.md`; on `ok: false` print its line and write nothing; print its `Spec branch:` line before `Crew:`. Ship-alone groups need a flag on `crew start` (e.g. `--ship-alone D,E`); not decided by design.md, pick it then.
- `record-tick.ts` and `claim-push.ts` still pass only `defaultBranch` to `pushBranch`: in a lane their commit counts read against main. Cosmetic; merge-back passes the base.

## Pick up from here

- Once Phase 1 is merged into this branch (merge main): wire `startSpecBranch` into `crew start --spec`, then deliverable 5 (`groupKey` in `crew/pick.ts` + the tick's `busy`, the cross-lane hold, `specBranch` in the whole-board skip).
