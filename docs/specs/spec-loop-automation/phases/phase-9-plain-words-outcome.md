---
needs: []
pr: A
---

# Phase 9 — Plain-words outcome

**Goal:** Every phase carries a one-line plain-words **Outcome** (effect, cost, risk) that the status view and PR bodies show, so the user never has to ask what a phase does for them.

**Outcome:** Anton reads what each phase and PR changes for him without asking "what does this actually do?". No cost; no risk (prose + rendering).

**Files to touch:**
- `skills/spec/create.md` (flat/folder phase templates)
- `skills/spec/tools/core/phase-entry.ts` (read `**Outcome:**` line)
- `skills/spec/tools/context/packs.ts` or the status renderer (show it next to the phase)
- `skills/spec/execute.md` (§10 PR body leads with the Outcome lines of the phases it ships)
- `skills/spec/status.md` (column/line description)

## Implementation guidance

Template line right under **Goal:** — `**Outcome:** <plain words: what changes for the user · cost · risk>`. No engineering vocabulary (same rule as the product brief). `summarizePhaseEntry` extracts it; the status table/pack shows it for open phases (truncate ~100 chars). Missing line → nothing rendered (existing specs are not backfilled). Doctor: no check — keep it a nudge, not a gate.

## Deliverables

- [ ] create.md templates gain the `**Outcome:**` line
- [ ] `phase-entry.ts` extracts Outcome; test with and without the line
- [ ] Status/pack renders Outcome for open phases
- [ ] execute §10: PR body starts with the shipped phases' Outcomes
