---
needs: [4]
pr: H
---

# Phase 12 — record export keeps labels in place

**Goal:** `record export` gives back a joined spec's `progress.md` with free-text lines (like CRM's `v1:` / `v2:` labels) where they stood in the phase list.

**Outcome:** the way back off the board loses nothing a person wrote between phase lines · an hour · low risk: export only, joined specs untouched.

**Files to touch:**
- `skills/spec/tools/plan/export.ts`
- `skills/spec/tools/tests/plan-export.test.ts`

## Implementation guidance

Moved here from phase 6, which shipped (PR C, #39) without it. Found in the 2026-11-12 smoke test on `explicit-charge-handling`: export put the labels below the list. Keep each free-text line's position relative to the phase lines (join must carry it onto the record, or export must read it from the default branch's frozen `progress.md`); test on that fixture.

## Deliverables

- [ ] `record export` keeps free-text lines inside the phase list where they were (CRM's `v1:` / `v2:` labels came back below the list on 2026-11-12) (unit test on that fixture)
