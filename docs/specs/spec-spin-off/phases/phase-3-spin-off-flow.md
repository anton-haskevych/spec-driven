---
needs: [1, 2]
pr: A
---

# Phase 3 — Spin-off flow in the modes

**Goal:** The mode files tell a session what to do when it needs a new spec: write a seed (and inherited wave 0), link the dependency, launch a fresh prep session; and prep picks a seeded folder up.

**Outcome:** The improvised step from the two CRM sessions becomes one routine: the busy session stays on its spec, and the new spec's prep starts with Anton's words and the recon already done.

**Files to touch:**
- `skills/spec/prep.md` (*Spin-off* section, *seeded* precondition branch, wave 0 in Stage 4)
- `skills/spec/SKILL.md` (*Session lifecycle*, prep-stage wording, layout tables: `seed.md`)
- `skills/spec/create.md` (missing dependency specs → spin off), `update.md` (new work that is its own spec)
- `skills/spec/taxonomy.md` (`prep`), `README.md`

## Implementation guidance

`technical.md` → *seed.md*, *Wave 0 research*, *Mode-file changes*; `design.md` → flow and edge cases. Keep prep.md's addition under ~60 lines; SKILL.md only gets pointers. Docs only: no TDD loop; `skill-wiring.test.ts` must stay green.

## Deliverables

- [ ] prep.md: *Spin-off* section (trigger, seed template, wave 0, link, commit, launch) and *seeded* precondition branch
- [ ] SKILL.md lifecycle rule + prep-stage wording + layout rows; taxonomy.md
- [ ] create.md and update.md route new specs to spin-off; README line
