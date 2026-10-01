---
needs: []
pr: A
---

# Phase 1 — Whole-spec needs

**Goal:** `needs: [<spec>]` in a phase file resolves on a spec with no phases (or a finished status) and is met when that spec is finished, the same rule the spec-level graph uses.

**Outcome:** A phase that waits on a brand-new spec says so in frontmatter instead of "Blocked by spec" prose; the doctor stays clean and the ready set lists it as waiting until the new spec is done.

**Files to touch:**
- `skills/spec/tools/ready/refs.ts` (`resolvePhaseRef`)
- `skills/spec/tools/graph/nodes.ts` (`hasFinishedStatus` out of `isFinished`)
- `skills/spec/tools/tests/ready.test.ts`
- `skills/spec/SKILL.md` (*Phase edges*, *Relations*), `create.md:284`, `resume.md:71`

## Implementation guidance

`technical.md` → *Whole-spec needs*. Only the no-`#` branch changes; a spec with phases and an open status still expands to its phases so the waiting reason names them (`needs safety#2`).

## Deliverables

- [x] Red→green: phase `needs: [gift-cards]` on a phase-less prep spec → waits with `needs gift-cards`; no doctor issue
- [x] Red→green: same ref once that spec's status is `done` (or `abandoned`) → satisfied, even with unticked phases
- [x] Docs: SKILL.md phase edges + relations, create.md phase template, resume.md blocked-by bullet name the whole-spec form
