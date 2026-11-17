---
needs: []
pr: B
---

# Phase 2 — Build order

**Goal:** `ready <spec> --order` prints a spec's open phases in batches that can run together, its longest chain, its lanes and its same-file pairs.

**Outcome:** Before any worker starts, you see what runs side by side and what the slowest path is · small · risk: none, it only reads.

**Files to touch:**
- `skills/spec/tools/ready/build-order.ts` (new), `skills/spec/tools/ready/render.ts`
- `skills/spec/tools/pr/groups.ts` (`specLayout`, `shipAloneSuggestions`), `skills/spec/tools/core/spec-meta.ts` and the record's spec fields (read `spec-branch:`, `ship-alone:`)
- `skills/spec/tools/commands/ready.ts`, `skills/spec/tools/spec.ts` (usage)
- tests: `ready-build-order.test.ts` (new, pure)

## Implementation guidance

technical.md → *Phase 2*. Compose `phaseNeeds` + `resolvedPhaseKeys` the way `unblockCounts` does;
don't build on `needsCycle` (raw ids disagree with `readySet` on linear specs and ranges). Layer by
longest path over same-spec `needs` + `needs-deployed`; other specs' open phases block and are listed.
Detect a cycle before layering.

`specLayout` is the one pure answer to "which branch, which base, ships alone?" that Phases 3–5 read
(review 2026-11-17, `principle-one-spec-layout`). It lives here, beside `prGroups`, so Phase 3 builds on
it. This phase only reads `spec-branch:` and `ship-alone:`; Phase 3 writes them. `shipAloneSuggestions`
resolves `needs-deployed` through `resolvedPhaseKeys` like `T/board/deploy-waits.ts`; it only suggests.

No regroup or split suggestions: that is the overseer's judgement.

## Deliverables

- [ ] `buildOrder(state, nodes)`: batches, longest chain, waiting-on-other-specs and unknown refs, cycle line, the later of a same-files pair one batch later; pure tests (linear spec, declared edges, ranges, cross-spec, task phases, cycle)
- [ ] `ready <spec> --order` render (Order / Longest / Lanes / Same files / Waiting lines) and `READY_USAGE`
- [ ] `specLayout(state, meta)` and `shipAloneSuggestions(state)` in `T/pr/groups.ts` (pure), with `spec-branch:`/`ship-alone:` read from spec meta and the record; `ready --order`'s Lanes line marks `(ships alone)`, adds `Ships alone?` and `No lane:` lines; pure tests (mixed spec, no-group spec)

## Phase-local notes

- "Wave" already means a recon wave in this plugin; the flag and lines say order and batch.
