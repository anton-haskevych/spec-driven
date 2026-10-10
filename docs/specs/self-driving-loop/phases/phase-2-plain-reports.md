---
needs: []
same-files-as: [1]
pr: A
---

# Phase 2 — Plain reports, fewer questions

**Goal:** Every report of work done opens with Impact / On merge / Left in plain words, Impact built from the phases' Outcome lines, and good defaults are applied and listed under `Say if wrong:` by one criteria-based rule.

**Outcome:** You stop asking "what's the impact?" and stop answering "yes" to obvious questions · small, prose only · risk: the header turns into filler — Impact starts from the phase's reviewed Outcome line and says "nothing you'd notice yet" when that's true.

**Files to touch:**
- `skills/spec/SKILL.md` (new *Reports* and *Say if wrong* sections)
- `skills/spec/execute.md` (:146), `handoff.md` (:156-172), `update.md` (:145-168, :22), `review.md` (§3 :212-224, :339-350)
- `skills/phase-preflight/SKILL.md` (points at *Say if wrong*)
- `skills/spec/tools/tests/skill-wiring.test.ts`

## Implementation guidance

technical.md → Phase 2. Two short SKILL.md sections: one 3-line example plus four rules for *Reports*; review.md §3's criteria plus the examples list for *Say if wrong*. Each mode's report gets one line — "opens with SKILL.md → *Reports*" — not a copy (craft → Don't extract: per-mode report bodies). A handoff prints the header once; the update it runs skips its own. Resume and status don't get it; babysit's final report keeps its shape.

*Say if wrong* moves review.md §3's "resolve yourself vs put to the user" criteria into SKILL.md; review.md and preflight then point at it, so there is one rule, not three. The draft-PR / merge-method example from the first draft is wrong: those are forks (pr-babysit's question, `pr.merge` refusal).

## Deliverables

- [ ] SKILL.md *Reports*: header from Outcome lines, gloss rule, scope (work reports only, handoff once); wiring pins the three labels and a loop pin over execute, handoff, update, review
- [ ] execute, handoff, update, review point at *Reports*
- [ ] SKILL.md *Say if wrong*: criteria from review.md §3 + examples; review.md §3 and phase-preflight point at it; update.md:22 applies the claim's phase; wiring pin

## Phase-local notes

spec-loop-automation phase 9 decided "no doctor check — keep it a nudge"; same here: pins prove the rule exists, not that a report follows it.
