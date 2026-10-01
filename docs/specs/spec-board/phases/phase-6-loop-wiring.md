---
needs: [5]
pr: B
---

# Phase 6 — Loop wiring

**Goal:** Handoff ends with the board's top 3 ready phases and needs-you items, resume warns when an in-flight neighbor shares files, execute with no spec named and none inferred offers the top ready row, and `launch execute <spec> <phase>` opens a session on a chosen board row.

**Outcome:** "What next" arrives at the end of every session and "start 1 and 2" is one step, so Anton never rebuilds the picture by hand · small doc and launch changes · low risk.

**Files to touch:**
- `skills/spec/tools/launch/command-line.ts` (phase hint), `tests/launch.test.ts`
- `skills/spec/handoff.md` (final block), `skills/spec/resume.md` (A.4), `skills/spec/execute.md` (§0 pick with nothing named)
- `skills/spec/SKILL.md` (*Tools* → Launch), `README.md`, `ROADMAP.md`

## Implementation guidance

`technical.md` → *Integration points*. All three flows read `spec.ts list --json` → `board`; none
re-derive lanes. Handoff's block replaces the hand-built "Unblocked" synthesis with the board's rows
(keep `Unblocked:` from `spec.ts graph`, add `Ready next:` and `Needs you:`). Resume's neighbor line
appears only when an in-flight spec overlaps this spec's code-map. `launch` validates the phase id with
the same rule as chunk hints.

## Deliverables

- [ ] `launch execute <spec> <phase>` builds `/spec-driven:spec execute <spec> <phase>`; bad phase id refused
- [ ] `handoff.md` final block: release claim, `Ready next:` top 3 and `Needs you:` from the board
- [ ] `resume.md` A.4 neighbor bullet; `execute.md` §0: nothing named and nothing inferred → offer the top ready row
- [ ] SKILL.md *Tools* → Launch, README *Session lifecycle and tools*, ROADMAP row
