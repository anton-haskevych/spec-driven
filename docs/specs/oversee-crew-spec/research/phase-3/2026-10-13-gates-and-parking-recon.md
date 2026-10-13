# Phase 3 recon — gates and parking (2026-10-13)

Single wave, read by hand: the seam is small and every file is under 190 lines. Branch merged with
main after PR D (#27, crew tools) landed, so `oversee-crew.md`, `crew-brief.md` and `crew/*` are current.

## Seam

- `T/core/spec-state.ts:54-71` `loadPhase` reads `code` and `playbook` from phase frontmatter; `gate`
  goes beside them. `EDGE_KEYS` (`T/core/phase-edges.ts`) stays untouched.
- `T/core/in-flight.ts` already reads `in-flight/phase-<id>.md` (self-driving-loop landed the split);
  `SpecState.inFlight` holds every per-phase note for base and every worktree view
  (`T/workspaces/views.ts` → `loadSpecState`). The park entry parser reads these notes; no new IO.
- `T/phases/tick.ts:50-55` `checkEvidence` is where the `Gate:` refusal goes; `hasEvidence`
  (`T/core/checkbox.ts:19`) already accepts a date, link or path.
- Doctor wiring: `T/doctor/run.ts:37-46` (`tasks` array) and `T/hooks/spec-file-check.ts:63-73`
  (`phaseFileIssues`). Mirror `T/doctor/task-phases.ts` (raw frontmatter type check → error).
- Phase writers follow `plan → EditPlan → applyEdits` (`T/phases/deployed.ts`), and `commands/phase.ts`
  dispatches through `ACTIONS`.
- Board: `T/board/lanes.ts:94-104` `phaseLanes` filters ready rows (`landed`); a `parked` filter joins it.
  `T/board/attention.ts:16-20` `needsYou` concatenates kinds; `T/board/model.ts:108` `AttentionRow` union;
  `T/board/render.ts:96-125` exhaustive `attentionCells` switch (a new kind fails to compile until rendered).
- Pack: `T/context/packs.ts:76` already prints the picked phase's raw in-flight notes, so execute and
  resume see the park entry and its answer verbatim.
- Crew: `T/crew/pick.ts` skips rows with an unanswered run-file question; the board dropping parked
  rows makes that a second guard, not the only one. `T/crew/tick-step.ts:42` prints the `Crew:` line's
  needs-you count; `oversee-crew.md` §5 reads in-flight prose with `git show`.

## Reuse

- Timestamps: `isoTimestamp` (`T/core/schedule.ts:49`), the `spec-bump.sh --now` twin.
- Section rewrite: `T/crew/run-state.ts` has private `sectionRange`/`withSection`; the park writer needs
  the same for `## Needs you`. Second use → extract into `T/core/markdown-sections.ts` with a test.
- Tests: `tests/tree.ts` (`createTree().spec(...)`), `tests/factories.ts` (`phaseState`),
  `tests/board-factories.ts` for board inputs.

## Testing issues

- None blocking. `handoff.md` overwrites the in-flight file each handoff: a park entry would be lost
  unless handoff keeps `## Needs you`; a doc fix, not code.
- Board golden test: a new attention kind with no rows leaves output unchanged.
