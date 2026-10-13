---
needs: [1, self-driving-loop#1]
same-files-as: [2]
pr: C
---

# Phase 3 — Gates and parking

**Goal:** A phase can declare a human gate (`gate: design | outward`), gate items can't be ticked without evidence, a worker parks at a gate or a real fork instead of waiting, and parked phases leave the ready lane and show their question under needs you.

**Outcome:** Phases that need you say so up front; the crew works around them until you answer, and an "approved by Anton" box can't be ticked by accident · medium · risk: parked work must stay visible, so it always shows under needs you.

**Files to touch:**
- `skills/spec/tools/core/spec-state.ts`, `skills/spec/tools/doctor/phase-gates.ts` (new), `skills/spec/tools/hooks/spec-file-check.ts`
- `skills/spec/tools/phases/tick.ts`, `skills/spec/tools/phases/park.ts` (new, writes the in-flight *Needs you* entry), `skills/spec/tools/commands/phase.ts`
- `skills/spec/tools/board/lanes.ts`, `board/attention.ts`, `board/model.ts`, `board/render.ts`
- `skills/spec/execute.md` (§3 preflight, §8), `skills/spec/SKILL.md` (*Phase edges*), `skills/spec/create.md` (*Plan*)
- `skills/spec/oversee-crew.md`
- tests: `hook.test.ts`, `task-phases.test.ts` pattern for gates, `tick.test.ts`, board tests

## Implementation guidance

technical.md → *Phase 3*. `gate:` is phase metadata like `code` and `playbook`, read in
`loadPhase`. It must not join `EDGE_KEYS`: that set decides whether a spec uses declared
edges, and a gate is not an edge.

Gate items are deliverable lines that start `Gate:`, for example
`- [ ] Gate: design agreed with Anton`. `phase tick` refuses them without `--evidence`
("who approved, when"), next to the task-phase evidence check. On Oct 11 a worker ticked
the approval box by a text-prefix match; this makes that impossible.

Parking needs self-driving-loop phase 1's preflight split: *Defaults applied* (apply, list
under "Say if wrong") versus *Forks for you* (park). A worker parks at a fork, or at a gate
whose kind isn't self-approvable (phase 5 adds that list; until then every gate parks):
`spec.ts phase park <spec> <phase> "<question>" --recommend "<answer>"`, then hands off.
Parking uses the one home phase 1 already set: a *Needs you* entry in the phase's in-flight
file, which is committed and pushed. Use self-driving-loop's `in-flight/phase-<id>.md` once it
lands, or `in-flight.md` before that. There is no local park store, so other machines see the
parked phase too. The board's worktree overlay reads the entry, drops the phase from the ready
lane and lists it as a `question` row. `phase unpark` records the answer, and the next execute
of that phase reads it.

Parking at a fork applies only when a crew launch brief is present. An interactive session
still asks Anton, who is right there.

## Deliverables

- [x] 3.1 `gate: design | outward` on `PhaseState`; `doctor/phase-gates.ts` validator wired into the doctor and the spec-file check; SKILL.md *Phase edges* and create.md *Plan* document it; tests
- [x] 3.2 `phase tick` refuses `Gate:` items without `--evidence`; tests
- [ ] 3.3 `phase park` / `phase unpark` and the park record; parked phases leave the ready lane; `question` needs-you kind and line; tests
- [ ] 3.4 execute.md: park and hand off at a fork or a non-self-approvable gate instead of waiting; resume and execute show a parked phase's question and answer
- [ ] 3.5 `oversee-crew.md`: questions come from park entries (`phase park` output) instead of reading in-flight prose; answering unparks and relaunches

## Phase-local notes

- Review 2026-10-12 retired the local `crew/parked/` store and `crew/questions.ts`: questions have one home, the committed in-flight file.
- Version picked at merge, ROADMAP row.
