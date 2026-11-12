---
kind: decision
applies-to: [phase 3, 3a]
created: 2026-11-12T00:15:35-08:00
---

# A joined spec's plan is guarded until the writers reach the record

Phase 2a put two guards in place. Phases 3 and 3a lift them as each write gets a record path:

- **`commands/phase.ts` `PLAN_WRITERS`** (tick, deployed, add, split) refuse a joined spec with
  `phase <action>: <spec> is on the board; this version can't write it yet` (`a Codex pilot` for a pilot).
  The joined check reads the local copy only (`readLocalPlans`): a write never fetches just to refuse.
  Park and unpark stay open; they write `in-flight/` notes, which phase 7 moves.
- **The spec-file hook** (`hooks/frozen-plan-edits.ts`) compares a joined spec's `progress.md` and phase files
  with their `HEAD` copy and blocks a changed checkbox, edge or phase line. It compares with the commit, not
  the record, so a frozen file lagging the record is never flagged. Prose edits pass: prose stays a file.
  Its message names `phase tick` / `phase add` / `phase split`; drop "this version can't write a joined spec
  yet" once they can.
