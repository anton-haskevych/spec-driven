---
needs: []
same-files-as: [1]
pr: A
---

# Phase 2 — Plain reports, fewer questions

**Goal:** Every mode report opens with Impact / On merge / Left in plain words, and good defaults are applied and listed under `Say if wrong:` instead of asked.

**Outcome:** You stop asking "what's the impact?" and stop answering "yes" to obvious questions · small, prose only · risk: the header turns into filler — the rule demands a number when there is one and "nothing you'd notice yet" when that's true.

**Files to touch:**
- `skills/spec/SKILL.md` (new *Reports* and *Say if wrong* sections)
- `skills/spec/execute.md` (:146), `handoff.md` (:156-172), `update.md` (:145-168, :22), `review.md` (:339-350), `resume.md` (Stage A summary), `create.md` (:374-375)
- `skills/spec/tools/tests/skill-wiring.test.ts`

## Implementation guidance

Two SKILL.md sections, written once, with design.md's examples as the copy. Each mode's report gets one line — "opens with SKILL.md → *Reports*" — not a copy of the rule; their own blocks stay (craft → Don't extract: per-mode report bodies). Status is excluded: its table is tool-rendered and nothing may follow it (status.md:86).

*Say if wrong* lists the real forks explicitly (design.md → Defaults vs forks) so "apply the default" never swallows a decision that is Anton's. Prior art: review.md:214 ("resolved by me") and review.md:347 (`Forks:` line) — point review at the new section instead of keeping its own wording.

## Deliverables

- [ ] SKILL.md *Reports*: header, gloss rule, examples; wiring pins the three labels
- [ ] execute, handoff, update, review, resume point at *Reports*
- [ ] SKILL.md *Say if wrong*: rule + real-forks list; update.md:22 and create.md:374-375 apply defaults; review.md points at it; wiring pin

## Phase-local notes

spec-loop-automation phase 9 decided "no doctor check — keep it a nudge"; same here: pins prove the rule exists, not that a report follows it.
