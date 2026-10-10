---
needs: []
same-files-as: [2]
pr: A
---

# Phase 3 — Parallel sessions stop colliding

**Goal:** Two sessions on different phases of one spec can both hand off and publish without touching the same lines: no per-session `updated:` bump, in-flight notes in per-phase sections, no hand-written Spec-state summary.

**Outcome:** No more "publish refused — merge main first" or hand-merged spec notes when two tabs work one spec · small, prose plus one doctor check · risk: `/spec list` shows a less fresh "updated" day — it was only a sort tie-break.

**Files to touch:**
- `skills/spec/SKILL.md` (Timestamps :506, *in-flight.md semantics* :424-429, *pr-opening.md semantics* :431-438)
- `skills/spec/handoff.md` (:19-20, :54-58, :87-100), `update.md` (§7 :128-138, :175), `execute.md` (:117, :156), `review.md`/`prep.md` bump lines stay
- `skills/spec/tools/doctor/phases.ts` (`checkInFlight`), `tools/tests/doctor.test.ts`

## Implementation guidance

The three worst hand merges were single shared lines (`updated:`), a whole-file overwrite (`in-flight.md`) and a summary rewritten after every tick (Spec state) — wave 1 → Collisions. Each fix removes the shared write rather than adding a merge rule (`spec-loop-automation/ledger/gotcha-github-ignores-merge-union.md`).

`updated:` keeps its field and format (doctor and the spec-file hook still require it); only the per-session callers go. In-flight: `## Phase <id>` sections, handoff rewrites its own; `checkInFlight` (doctor/phases.ts:29-33) learns sections — a pending section for a ticked phase warns, as the whole file did. Packs keep reading the whole file (≤2,000 chars); scoping it to the picked phase is the later upgrade.

Release for PR A goes here (technical.md → Release).

## Deliverables

- [ ] Per-session `spec-bump.sh` calls gone (update §7, handoff via update, SKILL.md :506 says when it runs)
- [ ] In-flight `## Phase <id>` sections: handoff writes only its own, converts a legacy block; SKILL.md semantics updated
- [ ] `checkInFlight` reads sections: pending section for a ticked phase warns — tests
- [ ] Spec-state hand refresh gone from execute, update, handoff; SKILL.md semantics updated
- [ ] Release: version bump, ROADMAP row, README if a Tools bullet changed

## Phase-local notes

pr-babysit's merge record appends to Spec state from its own phases; leave that path alone.
