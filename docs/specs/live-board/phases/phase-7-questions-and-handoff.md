---
needs: [4]
same-files-as: [6]
pr: D
---

# Phase 7 — Questions and hand-off notes

**Goal:** a decision that waits on a person is one record with the question, a recommendation and, later, the
answer; and a phase's hand-off note is on the record, where the next session finds it whatever tree it starts in.

**Outcome:** one list of what waits on you, across every spec and both machines, and answers that are kept
instead of asked again. An agent that needs you leaves its question and moves on · medium · low risk.

**Files to touch:**
- `skills/spec/tools/questions/` (new, with `question-doc.ts`), `record/layout.ts`, `plan/kinds.ts` (upgrade step), `commands/question.ts` (new), `spec.ts`
- `skills/spec/tools/phases/park.ts`, `core/park.ts`, `board/parked.ts`, `board/attention.ts`, `context/packs.ts`
- `skills/spec/tools/crew/run-state.ts`, `crew/pick.ts`, `commands/crew/tick.ts`
- `skills/spec/tools/core/in-flight.ts`, `phases/tick.ts` (gate evidence)
- As built also: `commands/phase/note.ts` + `phases/note.ts` (`phase note`), `record/layout.ts` (per-step layouts),
  `plan/upgrade-notes.ts`, `mainline/base-cache.ts` (in-flight notes in the cache), `commands/crew/tick.ts`
- `skills/spec/handoff.md`, `execute.md` (*Crew worker*), `oversee-crew.md`, `crew-brief.md`, `babysit.md`,
  `SKILL.md`

## Implementation guidance

Three shapes hold the same thing today (craft snapshot → *Extraction opportunities*): park lines under
`## Needs you` in an in-flight file (`core/park.ts:4-66`), the crew's `## Questions` in `run.md`
(`crew/run-state.ts:23,96`, one machine only), and `Gate:` tasks (`core/gate.ts`, no asker, time or text).
`oversee-crew.md:180-187` copies park entries into `run.md`, so one question can sit in two places.

For a joined spec there is one `QuestionDoc`. `phase park` and `unpark` keep their names and write it. A
`Gate:` task's approval is an answered question of `kind: "gate"` whose `about` names the task; `phase tick`
still demands evidence for a gate task and takes it from that answer. The crew reads open questions from the
record and stops copying them; `run.md` keeps only what is about the run itself.

The board's `question` attention row (`board/model.ts:108`, `board/attention.ts:23`) is built from question
documents, which for the first time includes questions asked on the other machine.

The hand-off note moves into `PhaseDoc.handoff`. For a joined spec, handoff writes it with `writeRecord` and no
longer writes `in-flight/phase-<id>.md`; packs show it whole (the rule from 2.52.1: never clipped).

**This release moves data joined specs already hold in files.** Raise `RECORD_LAYOUT` to 3. The upgrade step
copies a spec's in-flight notes and open park entries into the record on its next touch, and join does the
same for a spec joining now. Until a spec is upgraded its packs read the in-flight files. Without this, the
person who updates second writes a hand-off note to a file the other's pack no longer reads.

Answers are quotes: store the person's words, who and when, as `phase tick --evidence` does today.

## Deliverables

- [x] `question-doc` reader; `spec.ts question ask | answer | list`, with `list` across every joined spec
- [x] `phase park` and `unpark` write a question document for a joined spec; packs and the board's `question` rows read them
- [x] `Gate:` approval recorded as an answered `gate` question about its task; the tick takes its evidence from it — built in 0478848 (skills/spec/tools/questions/gate.ts)
- [x] The crew reads open questions from the record (answers change a value someone read: `question answer` carries `ifVersion`); the copy step in `oversee-crew.md` is removed for joined specs; `crew tick` lists them
- [x] Hand-off note on the phase document: handoff writes it, packs show it whole, join carries an existing in-flight note over
- [x] Layout 3: a spec joined earlier gets its in-flight notes and park entries copied on its next touch; until then packs read the files; an older plugin refuses to write
- [x] `handoff.md`, `execute.md`, `oversee-crew.md`, `crew-brief.md`, `babysit.md`, `SKILL.md` updated; ROADMAP row and version bump for PR D

## Phase-local notes

- Crew run identity belongs to `codex-runtime-support` phase 3b: read questions from the record, leave the run
  file's own identity fields alone.
