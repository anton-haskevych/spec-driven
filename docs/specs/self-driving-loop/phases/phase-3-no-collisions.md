---
needs: []
same-files-as: [1, 2]
pr: A
---

# Phase 3 — Parallel sessions stop colliding

**Goal:** Two sessions on different phases of one spec can both hand off and publish without touching the same lines: no per-session `updated:` bump, in-flight notes in one file per phase, and Spec state keeps only the one-time PR line.

**Outcome:** No more "publish refused — merge main first" or hand-merged spec notes when two tabs work one spec · small, prose plus reader changes · risk: `/spec list` orders an executing spec by its last review or status change — it was a sort key, not a gate.

**Files to touch:**
- `skills/spec/SKILL.md` (Timestamps :506, file tree and artifact table :213, *in-flight.md semantics* :424-429, *pr-opening.md semantics* :431-438)
- `skills/spec/handoff.md` (:19-20, :54-58, :87-105), `update.md` (§7 :128-138, :175), `execute.md` (:28, :117, :156), `resume.md` (:25), `list.md` (:21)
- `skills/spec/tools/core/spec-state.ts`, `context/packs.ts` (`inFlightBlock`), `doctor/run.ts`, `doctor/phases.ts` (`checkInFlight`), `graph/suggest.ts`
- `tools/tests/doctor.test.ts`, `context.test.ts`

## Implementation guidance

technical.md → Phase 3. Each fix removes a shared write rather than adding a merge rule (`spec-loop-automation/ledger/gotcha-github-ignores-merge-union.md`).

- `updated:` keeps its field and format (doctor and the spec-file hook require it); only the per-session callers go.
- In-flight: `in-flight/phase-<id>.md` (ledger `decision-in-flight-one-file-per-phase`). Sections in one file were the first draft; a git merge showed two sessions adding sections conflict. The pack reads only the picked phase's file; `checkInFlight` keeps today's rule (warn only when every phase is done), so a deploy note on a ticked phase isn't flagged. A legacy `in-flight.md` stays readable.
- Spec state: keep §10's one-time `PR #<n> · <branch>` line (ledger `decision-pr-link-stays-in-spec-state`); drop only phases done/left prose.

pr-babysit phase 7 rewrites execute §10 and handoff too. Whichever lands second merges main and keeps both.

## Deliverables

- [ ] Per-session `spec-bump.sh` calls gone (update §7, handoff via update); SKILL.md Timestamps rule; list.md column wording
- [ ] In-flight per-phase files: handoff writes and deletes its own; readers (spec-state, pack, doctor, graph) read the folder + legacy file; SKILL.md layout and semantics; tests
- [ ] Spec state: hand refresh gone from execute §6, update, handoff; §10 writes the one PR line; SKILL.md semantics

## Phase-local notes

pr-babysit's merge record appends to Spec state from its own phases; leave that path alone.
