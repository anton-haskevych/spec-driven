# Phase 7 preflight — questions and hand-off notes (2026-11-13)

Plan: `phases/phase-7-questions-and-handoff.md`. Recon: `2026-11-13-questions-and-handoff-recon.md`.
Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **Raising `RECORD_LAYOUT` to 3 silently sends layout-2 specs' fields and PRs back to files.**
   `plan/read-plans.ts:56,60` serve fields and PR documents only when `joined.layout >= RECORD_LAYOUT`.
   Every layout step needs its own threshold: `FIELDS_LAYOUT = 2`, `NOTES_LAYOUT = 3` in `record/layout.ts`,
   and readers compare against the step that moved their data.
2. **The upgrade is one jump, not steps.** `upgradePlan` (`plan/upgrade.ts:88-98`) stamps `RECORD_LAYOUT` after
   copying only fields and PRs. A layout-1 spec must get both steps, a layout-2 spec only step 3. One copier
   (`CopiedFromFiles`) grows `handoffs` and `questions`; the plan applies each step the spec is behind on.
   Join already calls the same copier (`commands/join.ts:93` → `planJoin` `input.copy`, `plan/join.ts:62`),
   so join carries notes over by extending `JoinPlan` with the question documents.
3. **No tool writes a hand-off note.** `handoff.md:56-60` has the session overwrite the file by hand, which
   would put a joined spec's note in a file its pack no longer reads. One phase action for both homes
   (`decision-one-phase-writer-port-for-both-homes.md`): `phase note <spec> <phase> --file <path> | --clear`.
   The file writer writes `in-flight/phase-<id>.md` keeping its `## Needs you`; the record writer patches
   `PhaseDoc.handoff`. It must join `LOCAL_PHASE_ACTIONS` (`runtime/workflow-capabilities.ts:12`), since
   handoff is a pilot mode.
4. **Every reader already funnels through `SpecState.inFlight`.** `withRecordParks` (`plan/state-source.ts:108`)
   is the single place to swap parks for question documents and the disk note for `PhaseDoc.handoff`; the
   board (`board/parked.ts:15`), packs (`context/packs.ts:92`) and crew pick (`board/lanes.ts:106`) stay
   unchanged. The phase file's "the board's `question` row is built from question documents" holds through
   this funnel; no edit to `board/model.ts` (227) or `board/lanes.ts` (204).
5. **A record note has no disk path.** `context/in-flight.ts:10` lists a too-large or other-phase note by
   `join(specDir, note.file)`. A note from the record needs its own pointer (`InFlightNote.where`).

Phase-file line refs: `board/model.ts:108` is `:110-111` now; the rest hold.

## Clean Code

| Rule | Verdict | Concrete consequence |
|---|---|---|
| One word per concept | Bites | "question" (document), "park" (the phase verb that asks one), "hand-off note" (`handoff`); `phase note` writes it |
| Small functions / files | Bites | note + question rendering leaves `plan/state-source.ts` (128) for `plan/phase-notes.ts` |
| No flag arguments | Bites | `ask` picks `kind` from the phase's first open task (gate or not), not from a flag |
| Errors as values | Bites | question writes reuse `PhaseOutcome` + `renderPhaseOutcome`; `question answer` reuses `storeRefusal` |
| Tests | Bites | `askPlan`/`answerPlan`/upgrade step 3/render are pure: table tests over `viewOf`; one real-git test per command |

## Clean Architecture

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `questions/` imports `record/` types and `plan/kinds`; `core/` learns nothing about questions |
| Humble object | Bites | `question list` = pure `openQuestions(plans)` + a thin command |
| Component cycles | Bites | `plan/kinds.ts` imports `questions/question-doc.ts`; `question-doc.ts` imports only `plan/docs/read` + `core/read-fields` |

## SOLID

| Rule | Verdict | Concrete consequence |
|---|---|---|
| SRP | Bites | the store, the question plans and the crew stay separate actors; crew only reads `openQuestions` |
| OCP | Bites | layout steps as a list keyed by the layout they lead to; PR E adds a row |
| LSP | Inert | |
| ISP | Bites | `JoinedPlan` gains `questions`; callers that build it by hand (tests, `join`) get `[]` |
| DIP | Bites | no new port: `sendRecordIntent` + `PLAN_INTENTS` rows (`ask`, `answer`, `note`) |

## DDD

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Invariant owner | Bites | "one open question per phase" is `askPlan`'s, planned at the tip; "an answer is a quote with who and when" is the reader's |
| Aggregate boundary | Bites | a question is its own document; a gated tick that creates its approval writes both in one batch |
| Anti-corruption | Inert | |

## Guard blindness

`hooks/frozen-plan-edits.ts` guards phase files and `progress.md` only: a hand edit of an upgraded spec's
`in-flight/phase-<id>.md` changes nothing and nobody is told. Out of scope here (the handoff text now names
`phase note`); ledger candidate, not a task.

## Amendments

1. `record/layout.ts`: `RECORD_LAYOUT = 3`, `FIELDS_LAYOUT = 2`, `NOTES_LAYOUT = 3`; `read-plans.ts` uses them.
2. `upgradePlan` applies step 2 when `layout < 2` and step 3 when `layout < 3`; step 3 creates question
   documents from file parks and `PhaseDoc.parks` (dropping `parks`), and sets `handoff` from each phase's
   in-flight file minus `## Needs you`.
3. Add `phase note` to the PhaseWriter and to `LOCAL_PHASE_ACTIONS`.
4. Rendering moves to `plan/phase-notes.ts`: layout < 3 reads disk notes + `parks` (as today); layout 3 reads
   `handoff` + question documents (with any leftover `parks`), notes carry `where` for the pack.
5. `question ask` = `phase park`'s plan; `question answer <spec> <q-id>` carries the `ifVersion` it read.

## Defaults applied

- Question ids are `q<n>` per spec (path `specs/<spec>/questions/q<n>.json`), n past every id in the folder.
- `askedBy` is the session id, else the tree; `answer.by` is the configured git name (`runnerName`), else
  the author name.
- `question list` lists record questions across joined specs; specs in files keep showing parks on the board.
- PR-group (`in-flight/pr-<group>.md`) and legacy notes stay in files: they belong to no phase document.
- Ticking a `Gate:` task with `--evidence` on the record also creates its answered `gate` question in the
  same batch; without `--evidence` the tick takes the answer of that task's gate question.

## Forks for you

None.
