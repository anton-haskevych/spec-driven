---
kind: decision
applies-to: [phase 8+]
created: 2026-11-13T01:06:42-08:00
---

# Questions, gate approvals, hand-off notes and layout 3 as phase 7 built them

What later phases build on (paths under `skills/spec/tools/`):

- **Question documents** (`questions/question-doc.ts`): `specs/<spec>/questions/q<n>.json`, ids per spec,
  n past every id at the tip (`nextQuestionId`). `about` is `<spec>#<phase>`, `<spec>#<phase>:<task>` or
  `card:<id>` (phase 8's cards can ask with the last shape; nothing renders a card question yet).
  `JoinedPlan.questions` is optional: absent means none.
- **Plans** (`questions/plans.ts`): `askPlan` (one open question per phase; the next open task being a
  `Gate:` makes it `kind: gate` about that task), `answerPlan` (by id or by phase; carries `ifVersion`).
  `PLAN_INTENTS` rows `ask`, `answer`, `note`; `park`/`unpark` rows stay for parks queued by 2.54.
- **One funnel for readers.** `plan/phase-notes.ts` `joinedNotes` renders questions (and any leftover
  `PhaseDoc.parks`) into each phase's `## Needs you` note text, so board, packs and crew pick read them
  unchanged. A new reader of questions should read `questionRows` (`questions/list.ts`), not the note text.
- **Gate approvals** (`questions/gate.ts`): `TickIntent.approval` makes the tick also answer or create the
  task's gate question in the same write; a gate tick without `--evidence` takes `approvalEvidence`.
- **Hand-off note:** `PhaseDoc.handoff { at, by, note }`, written by `phase note` (both homes; the file
  home keeps `## Needs you`). `by` is the session id, else `tree <folder>`. `InFlightNote.where` points a
  pack at a note that isn't a spec-folder file.
- **Layout steps** (`record/layout.ts`): `FIELDS_LAYOUT = 2`, `NOTES_LAYOUT = 3`, `RECORD_LAYOUT = 3`.
  Readers compare with the step that moved their data, never `RECORD_LAYOUT`. PR E adds `CARDS_LAYOUT = 4`
  and one more `layout < X` block in `upgradePlan` (`plan/upgrade.ts`), which runs every step a spec is
  behind on in one batch. Copied parks have `askedBy`/`answer.by` `unknown`.
- **Base cache** holds `in-flight/*.md` (`BASE_LAYOUT = 3`): join and the upgrade copy notes from it, and a
  park landed on main now shows on the board for a spec in files.
- **Not built:** the frozen-file hook doesn't block a hand edit of an upgraded spec's in-flight file, and
  copied in-flight files stay on main (nothing removes them).
