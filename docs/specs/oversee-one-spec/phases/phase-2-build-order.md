---
needs: []
pr: B
---

# Phase 2 — Build order

**Goal:** `ready <spec> --order` prints a spec's open phases in batches that can run together, its longest chain, its lanes and its same-file pairs.

**Outcome:** Before any worker starts, you see what runs side by side and what the slowest path is · small · risk: none, it only reads.

**Files to touch:**
- `skills/spec/tools/ready/build-order.ts` (new), `skills/spec/tools/ready/render.ts`
- `skills/spec/tools/pr/groups.ts` (`specLayout`, `shipAloneSuggestions`), `plan/docs/spec-doc.ts` and `graph/spec-fields.ts` (read `specBranch: { cutFrom, shipAlone }` from the record only)
- `skills/spec/tools/commands/ready.ts`, `skills/spec/tools/spec.ts` (usage)
- tests: `ready-build-order.test.ts` (new, pure)

## Implementation guidance

technical.md → *Phase 2*. Compose `phaseNeeds` + `resolvedPhaseKeys` the way `unblockCounts` does;
don't feed `needsCycle` raw ids (they disagree with `readySet` on linear specs and ranges): give it a
`needsOf` over resolved keys. Unknown refs go through `resolvePhaseRef`; `resolvedPhaseKeys` drops them. Layer by
longest path over same-spec `needs` + `needs-deployed`; other specs' open phases block and are listed.
Detect a cycle before layering.

`specLayout` is the one pure answer to "which branch, which base, ships alone?" that Phases 3–5 read
(review 2026-11-17, `principle-one-spec-layout`). It lives here, beside `prGroups`, with `branchOf(layout, group)`, the one
group-to-branch lookup (`default` → `feat/<spec>` in the mode). This phase only reads `specBranch`;
Phase 3 writes it. `shipAloneSuggestions(state, nodes)` lives in `ready/build-order.ts`, not
`pr/groups.ts`, so the pure seam doesn't import the board layer; it only suggests.

No regroup or split suggestions: that is the overseer's judgement.

## Deliverables

- [ ] `buildOrder(state, nodes)`: batches, longest chain, waiting-on-other-specs and unknown refs (read through `resolvePhaseRef`; `resolvedPhaseKeys` drops them), cycle from `needsCycle` fed a `needsOf` over resolved keys (needs + needs-deployed), a `needs-deployed` need met only when deployed, the later of a same-files pair one batch later; pure tests (linear spec, declared edges, ranges, cross-spec, task phases, cycle)
- [ ] `ready <spec> --order` render (Order / Longest / Lanes / Same files / Waiting lines) and `READY_USAGE`
- [ ] `specLayout(state, specBranch?)` and `branchOf(layout, group)` in `T/pr/groups.ts` (pure; `default` → `feat/<spec>` in the mode), the record's `specBranch: { cutFrom, shipAlone }` read on `SpecDoc` and `graph/spec-fields.ts` (record only, never `CLAUDE.md`); `shipAloneSuggestions(state, nodes)` in `ready/build-order.ts`; `ready --order`'s Lanes line marks `(ships alone)`, adds `Ships alone?` and `No lane:` lines; pure tests (mixed spec, no-group spec)

## Phase-local notes

- "Wave" already means a recon wave in this plugin; the flag and lines say order and batch.
