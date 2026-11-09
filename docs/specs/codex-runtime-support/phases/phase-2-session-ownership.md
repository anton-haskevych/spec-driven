---
needs: [1]
pr: A
---

# Phase 2 — Codex identity and shared session visibility

## Outcome

Both runtimes participate in the same ownership and worktree decisions with explicit source coverage and safe state compatibility.

## Files to touch

`runtime/identity`, session adapters/composition; six code-map read seams and system factories; `claims/store`, `rules`, remote/takeover codecs; `crew/run-state` identity codecs; related fixtures.

## Deliverables

- [ ] Add explicit initiating-runtime resolution and qualified identity, preserving legacy Claude decoding and refusing conflicting or unavailable identity evidence.
- [ ] Implement injected, paginated Codex loaded-session reading and per-source coverage composition; propagate async only through I/O orchestration and reuse one snapshot per command.
- [ ] Update take/release/takeover, remote claim serialization and overseer/worker records to qualified identities, preserving unknown fields and legacy Claude records.
- [ ] Add writer-contract compatibility and activation/rollback guards; prove supported managed entry/cutover before enabling mixed writes so old readers cannot steal Codex claims. If native reentry cannot be fenced, return the specific activation choice; a marker alone is insufficient. This gate does not block building/fixture-testing adapters.
- [ ] Wire board, context, claim, placement and pruning to the same composition. Add mixed-runtime equal-ID, unknown-source, busy-tree, legacy-record and cross-process race fixtures.

- [ ] Add SourceRef binding and a single source-qualified identity equality/key helper; update trees/find, claims/held, board/joins/attribution, remote-take, overseer and every codec/self/mirror/release path.
- [ ] Extract narrow dependency objects for contextPack and placeTree before adding native ports; separate async context input loading from pure pack/phase rendering.
- [ ] Add workspace-coordinated mutation-time liveness/claim revalidation and an interleaving test for resume-after-preview-before-prune; the planning snapshot alone never authorizes removal.

## Implementation guidance

Do not hide native state reads inside the existing Claude parser or make fixture tests read the host. Preserve healthy-source rows during another source's failure. A tree can be free only with sufficient coverage; an unavailable source never counts as empty. No remote ownership inference from local daemon data.

Prioritize a useful execute → handoff slice in one supported configuration. Build and fixture-test incrementally; keep mixed mutations disabled until acceptance passes (`ledger/decision-deliver-value-incrementally.md`).
