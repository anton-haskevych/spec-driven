---
kind: decision
applies-to: [phase 3+]
created: 2026-11-11T19:41:31-08:00
---

# One `PhaseWriter` port; the tool picks the home, never the mode file

`phaseWriterFor(projectDir, spec, view)` returns `fileWriter` (today's `plan*` + `applyEdits`) or
`recordWriter` (pure plans in `plan/ops/`). It is chosen once per command; outcomes are rendered in one
place; `commands/phase.ts` is a dispatcher over `commands/phase/<action>.ts`.

The phase commands, `phase set`, `phase move` and `spec-status` work on **both** homes, so a mode file
says "run the command" once and never asks whether the spec has joined. `create.md` is the one exception
(`plan apply` with the board on, file scaffolding otherwise).

**Rejected:** a joined-or-not `if` in each of eight actions and side-by-side texts in ten mode files (drift no
test catches); one planner family over a document model with files as an adapter (rewrites file planners that
245 tests pin, for specs this work leaves alone).

**Open:** whether the file path gets an end date (board on by default) is looked at after phase 5's one-week
check, not before. Source: review 2026-11-11, R16.
