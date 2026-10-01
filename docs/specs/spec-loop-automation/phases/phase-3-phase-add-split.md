---
needs: [2]
pr: B
---

# Phase 3 — Phase add and split

**Goal:** `spec.ts phase add|split` creates and splits phases with correct files, frontmatter and progress lines, never renumbering and never retiring an id; the doctor warns about indented phase lines the tools can't see.

**Outcome:** Re-planning mid-spec stops costing a session of python and git mv, and sub-phases can no longer vanish from the tools silently. Low risk: existing ids never change, so no references, ledger scopes or research folders break.

**Files to touch:**
- `skills/spec/tools/phases/add.ts`, `phases/split.ts` (new)
- `skills/spec/tools/commands/phase.ts` (`add|split` actions)
- `skills/spec/tools/core/progress.ts` or `doctor/phases.ts` (indented-line warning)
- `skills/spec/execute.md` (:150), `update.md` (:171-185 cross-reference), `SKILL.md` (*Per-phase entry rules*, *Tools*)

## Implementation guidance

See `technical.md` → *Commands*. Both commands return an `EditPlan` (phase 2) validated with `checkPhases` before applying.

**`add`.** Without `--after`: next integer. With `--after 7`: `7` + first free letter (`samePhase` for collisions, case-insensitive); the progress line goes after the **last** existing `7*` line, so 7, 7a, 7b stay in order. The phase file uses the flat template with the given edges (`needs: []` when none) **including the `**Outcome:**` line** — the TS template carries it regardless of when phase 9 lands in `create.md`.

**`split <id>`.** The original phase **keeps its id, file, ticked items and prose**; each new title becomes the next free letter (`7` → `7a`, `7b`). `--items b:1,2 c:3` moves listed open items to the new parts (default: none move — the user names what leaves). Because `<id>` still exists, `spec#<id>` refs, `[phase <id>]` ledger scopes and `research/phase-<id>/` stay valid; sibling `needs` on `<id>` are left alone and printed for review (a sibling may now want `7b` instead). Refuse folder-shape phases (promotion/split stays manual) and done phases.

Chunk-reference regex (phase 1) accepts multi-letter suffixes, so `/spec execute 7ab` never reads as a spec name.

Promotion flat → folder (`update.md` §10) stays manual — rare and needs user confirmation.

Doctor: when `progress.md` has an indented `- [ ] Phase …` line that `parsePhaseLines` drops (depth > 0), warn `indented phase line is invisible to the tools: <text>`.

## Deliverables

- [x] `phase add` next-integer path with file (incl. Outcome) + progress line; round-trip via `loadSpecState`
- [x] `phase add --after` letter suffix, collision check, insertion after the last `<id>*`
- [x] `phase split` keeps the original id; new lettered parts; `--items` moves; refuses folder-shape and done phases
- [x] `phase split` prints sibling `needs` and external `spec#<id>` refs for review
- [ ] Doctor warning for indented phase lines
- [ ] Mode-file prose points at `phase add|split`; SKILL.md *Tools* + README
