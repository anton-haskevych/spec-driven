---
wave: 0
lens: inherited
from: crm:manager-role (phase 2a research, Fable reviewer "spec workflow catches house rules", 2026-11-15)
---

# Wave 0 — why a project's house rule never reached the plan

Paths are relative to `skills/` in this repo; line numbers checked against 2.60.0 on 2026-11-15 (render.ts and
packs.ts constants spot-checked by the spawning session).

## The clip chain
- `spec/tools/playbook/render.ts:4,7` — `PLAYBOOK_LIMIT = 4000`, each playbook body `clip`ped.
- `spec/tools/context/packs.ts:38` `PLAYBOOKS_LIMIT = 3000`; `:108-110` `playbooksBlock` clips the rendered block again.
- `spec/tools/context/text.ts:6-9` — `clip` is a blind `text.slice(0, limit)`: it cuts mid-row.
- CRM `engineering.md` body 8811 chars / 55 lines: the pack cut lands inside line 33 (Dispatch row), two rows above
  Errors (line 35); the Frontend section (incl. line 56) is gone. `spec.ts playbooks` (`commands/playbooks.ts:10`)
  cuts at line 37, so prep, create and collegium review (`review.md:32`) miss the Frontend rows too.
- Doctor checks lines (`doctor/playbooks.ts:11,35-37`, limit 60): an 8.8 KB playbook passes.
- `packs.ts:126` `withInBudget` already budgets the ledger block by whole lines (`LEDGER_LIMIT = 6000`): the shape to reuse.

## Preflight never reads the playbook
- `phase-preflight/SKILL.md:55-59` Stage 1 lists closest CLAUDE.md, `.claude/rules/*`, principles.md only.
- `spec/execute.md:98-102` hands preflight the phase entry, recon note and principles.md.
- CRM `engineering.md:9-10` claims "Phase preflight and collegium review check the plan against this page": untrue today.

## Lesson recall reach
- `spec/tools/lessons/recall.ts:12-17` — globs each lesson's `paths:` with `Bun.Glob`, skips `enforced-by`, sorts by
  `seen-in` count; pack prints titles only (`:24-27`).
- Pack feeds recall only path-like spans from the phase entry (`packs.ts:39,150`); the edit hook
  (`hooks/lesson-recall.ts:15,28-30`) matches the one file written, 3 max, once per session, under /spec only.
- Nothing runs recall on the recon seam: the window between pack and first edit is where design happens.
- A fresh principle (seen-in 1) ranks 12th of 32 on CRM's `UserDetailedView.java`: ranking by seen-in buries new rules.

## Measured
- A complete row index of CRM `engineering.md` (33 rows, first cell ~110 chars + doc cell) is ~4.8 KB, ~450 tokens
  more per execute pack than today.
