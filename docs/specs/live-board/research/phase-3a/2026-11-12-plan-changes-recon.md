# Phase 3a recon — plan changes on the port (2026-11-12)

Single wave, read directly: phase 3 left the seam small and named it.

## Seam

- Port: `plan/phase-writer.ts:23-30` (`tick | park | unpark | deployed | add | split`, only `tick` may be async);
  `refusingWriter` `:47-50`; renderer `:52-64` already has the `queued` line ("kept on this machine … N changes").
- Record side: `plan/record-writer.ts:7-17` — `deployed|add|split` are `notYet`, `park|unpark` delegate to files.
- Record tick as the exemplar: `plan/record-tick.ts` (`TickWorld` `:17-49`, `send` `:80-86` = `sendIntent` with
  the plan passed in to watch what it saw, `outcomeOf` `:94-110` maps `RecordWrite` → `PhaseOutcome`),
  `plan/ops/tick.ts` (pure plan + intent reader), `plan/intents.ts` (`INTENT_PLANNERS` for the read overlay,
  `intentRunners(git)` for flushes).
- File side: `phases/{add,split,deployed,park}.ts` planners validated by `issuesIntroducedBy`
  (`phases/validate.ts:14-16`, doctor's `phaseEdgeIssues` incl. `cycles` `doctor/phase-edges.ts:25-43`).
  `phases/move-items.ts` `takeOpenItems` moves open items by position; `phases/locate.ts` `locateOpenItem`
  selects by `#N` or prefix. `core/frontmatter-patch.ts` `setFrontmatterLine | removeFrontmatterLine` edit a
  phase file's frontmatter in place.
- Commands: `commands/phase.ts` dispatcher, one file per action; `deployed --land` on a joined spec refuses
  (`commands/phase/deployed.ts:14`).
- Record documents: `plan/docs/phase-doc.ts` (no park field), `plan/docs/spec-doc.ts` (`planVersion`),
  `plan/docs/spec-plan.ts` `specPlanProblems` (list ↔ docs, local edges, repeated task ids; **no cycle check**).
- Store: `writeRecord` re-runs the plan per tip; `planWrites` validates per document; `update` patches are
  RFC 7386 (unknown fields survive, so an older plugin's rewrite keeps a newer field).
- Park readers: `board/parked.ts`, `core/park.ts` `lastPark | parkOf` all read in-flight note text from
  `SpecState.inFlight`; `plan/state-source.ts:46-49` builds that for a joined spec from files only.
- Hook text naming what can't write yet: `hooks/frozen-plan-edits.ts:22`.

## Reuse

- Cycle walk: lift `walk` from `doctor/phase-edges.ts` into a function over `id → needs` so the record check
  and the doctor share it.
- Ids: `phases/ids.ts` `nextIntegerId | nextLetterIds | familyOf` work on plain id lists: reuse on the record.
- Park text: render record park entries through `core/park.ts` `withPark | withAnswer` into the joined state's
  in-flight notes, so every park reader works unchanged.
- Prose file for a new phase: `phases/template.ts` `phaseFileText | phasePointer`.

## Testing issues

- Real-git two-clone harness exists (`tests/joined-repo.ts`, `record-tick.test.ts`); offline by
  `remote set-url` (`record-tick-offline.test.ts`). Pure plans test on `viewOf` (`tests/fake-record.ts`).
- `PhaseWriter` methods become async on the record side: callers must await (commands already accept
  `string | Promise<string>`).
- File sizes fine; `record-tick.ts` (133) should not grow: put the shared send/outcome in its own file.
- Gap: a record `phase add` makes a phase with no tasks and no command adds tasks to a joined phase.
