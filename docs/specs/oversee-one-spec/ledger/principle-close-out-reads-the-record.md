---
kind: principle
applies-to: [phase 4, phase 5]
created: 2026-11-17T15:20:57-08:00
---

# Close-out and How to review read the record's commit evidence, not commit subjects

Every code tick on the record stores `<sha> on origin/<lane>` (`plan/record-tick.ts`). In spec-branch mode a
phase is merged back when its last task's evidence sha is in `origin/feat/<spec>`, and *How to review* lists a
phase's commits from its tasks' evidence. The `[handoff]` commit only carries the Crew line.

Why: a subject like `[handoff] <spec> phase <id>` is prose an agent must remember to type; a wrong or missing one
false-alarms close-out and empties the review section, the same class of failure as the CRM run's.

Source: review 2026-11-17 final-pr-and-mode-ends (PA F3, AT F14).
