---
needs: [2]
pr: B
---

# Phase 3 — Phase add and split

**Goal:** `spec.ts phase add|split` creates and splits phases with correct files, frontmatter and progress lines, never renumbering; the doctor warns about indented phase lines the tools can't see.

**Outcome:** Re-planning mid-spec stops costing a session of python and git mv, and sub-phases can no longer vanish from the tools silently. Low risk: no renumbering, so no cross-spec references break.

**Files to touch:**
- `skills/spec/tools/phases/add.ts`, `phases/split.ts` (new)
- `skills/spec/tools/commands/phase.ts` (new; `phaseCommand` + `USAGE`); `spec.ts`
- `skills/spec/tools/core/progress.ts` or `doctor/phases.ts` (indented-line warning)
- `skills/spec/execute.md` (:150), `update.md` (:171-185 cross-reference), `SKILL.md` (*Per-phase entry rules*, *Tools*)

## Implementation guidance

See `technical.md` → *Commands*. `add` without `--after` takes the next integer; with `--after 7` it takes `7a`, then `7b`… (first free letter). The progress line is inserted directly after the `--after` phase's line (or at the end). The phase file uses the create.md flat template with the given edges; `needs: []` when none.

`split <id>` creates `<id>a`, `<id>b`… files, moves the listed unticked items (`--items a:1,2 b:3`; default: all open items to the first part), keeps ticked items and prose in the first part, rewrites sibling `needs`/`same-files-as` entries pointing at `<id>` to the last part, and prints (does not edit) other specs' `spec#<id>` references found via the graph. The original id's file is renamed to the first part with `git mv`-free file ops (plain rename; git sees it on commit).

Promotion flat → folder (`update.md` §10) stays manual — rare and needs user confirmation.

Doctor: when `progress.md` has an indented `- [ ] Phase …` line that `parsePhaseLines` drops (depth > 0), warn `indented phase line is invisible to the tools: <text>`.

## Deliverables

- [ ] `phase add` next-integer path with file + progress line; round-trip via `loadSpecState`
- [ ] `phase add --after` letter suffix and ordered insertion
- [ ] `phase split` files + item moves + sibling edge rewrite
- [ ] `phase split` reports external `spec#<id>` refs
- [ ] Doctor warning for indented phase lines
- [ ] Mode-file prose points at `phase add|split`; SKILL.md *Tools* + README
