---
needs: []
pr: C
---

# Phase 9 — Plain-words outcome

**Goal:** Every phase carries a one-line plain-words **Outcome** (effect, cost, risk) that the status view and PR bodies show, so the user never has to ask what a phase does for them.

**Outcome:** Anton reads what each phase and PR changes for him without asking "what does this actually do?". No cost; no risk (prose + rendering).

**Files to touch:**
- `skills/spec/create.md` (the phase template, `:294`)
- `skills/spec/tools/core/phase-entry.ts` (read `**Outcome:**` line)
- `skills/spec/tools/context/status-table.ts` (Delivers cell)
- `skills/spec/tools/tests/skill-wiring.test.ts` (create.md and `phases/template.ts` carry the same Outcome line)
- `skills/spec/execute.md` (§10 PR body leads with the Outcome lines of the phases it ships)
- `skills/spec/status.md` (column/line description)

## Implementation guidance

Template line right under **Goal:** — `**Outcome:** <plain words: what changes for the user · cost · risk>`. No engineering vocabulary (same rule as the product brief). `summarizePhaseEntry` extracts it; the status table's **Delivers** cell shows its first sentence, falling back to the Goal, then the phase name (no new column — `status.md` fixes the header). Missing line → nothing rendered (existing specs are not backfilled). Doctor: no check — keep it a nudge, not a gate.

## Deliverables

- [x] create.md template gains the `**Outcome:**` line, pinned to `phases/template.ts` by the wiring test
- [x] `phase-entry.ts` extracts Outcome; test with and without the line
- [x] Status table Delivers = Outcome's first sentence, else Goal; status.md documents it
- [ ] execute §10: PR body starts with the shipped phases' Outcomes

## Phase-local notes

Built on `feat/project-settings` (PR C) after phase 5, so the shared `context/` and execute §10 edits don't need a rebase. `phase add` (phase 3) carries its own copy of the Outcome line in the TS template.
