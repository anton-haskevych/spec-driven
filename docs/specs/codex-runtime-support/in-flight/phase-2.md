# In-flight state

**Session ended:** 2026-11-09
**Active phase:** 2 — Codex identity and shared session visibility

## Where things stand

- Continued the inherited clean tree `feat/codex-runtime-support-pr-a` from `ab751c8`. Three implementation commits: `6b6d134` async context/pure rendering; `102e6fc` narrow placement ports; `d2332fc` source-qualified read-only context. This handoff is spec bookkeeping only.
- `contextPack(projectDir, request, ContextDeps)` is async. One awaited held map supplies selection and related-spec attribution. `selectExecutePhase` and `executePack` are pure; `loadPackReferences(diskReader(...))` supplies optional files before rendering. Command fixtures now inject empty ownership readers and the old oversized test file is split.
- `placeTree(PlaceRequest, PlacementDeps)` consumes loadWorld/addTree/dirty-check ports. `placeDepsFor(projectDir, PlaceDeps)` in `trees/place-system.ts` wraps the unchanged legacy system behavior. All four production callers migrated. The old `PlaceDeps` type retains its fields because prune and the hash-verified historical fixture import it. No historical runtime source changed.
- `runtimeContextPack` is opt-in, with injected env/readers/optional binding/source-qualified claim reader/clock. It reuses resolveIdentity and readSessionSnapshot, then projects through `heldPhasesFromSnapshot` into the shared context command. Configuration/claim-read errors return Result failures. Each source and claim reader runs once per invocation. Healthy rows remain useful; exact-source unavailable/missing/duplicate coverage keeps a claim held; equal IDs in different sources are not self.
- The new read-only context API accepts normalized in-memory claims only; it does not read legacy claim files, discover endpoints/homes, certify current ID/cwd or wire the CLI default. Those boundaries and all qualified storage/mutations remain pending. Default context/placement/board/claims/prune/crew still use Claude-only legacy composition.
- Verification: 78 tests across 13 context/identity/snapshot/reader files; 94 across 9 placement/launch/crew/prune/historical-reader files. All 172 passed, plus `bun run typecheck`, `git diff --check`, doctor clean. New tests were run red on missing APIs before implementation. Full suite/PR gates have not run; PR group A remains incomplete.

## Implicit context

- No workflow claim was taken or released: production ownership writers remain the unfenced Claude-only contract. Never alias CODEX_THREAD_ID into CLAUDE_CODE_SESSION_ID. This tree was explicitly inherited; no placement/prune command or remote claim mirroring ran against it.
- Delegated restrictions persist: no profile/install changes, copied auth, native retention/login research, push, PR, merge or release. No live Codex daemon, model session or own account was queried; adapters used injected fixtures only. No server/watcher/background process remains from this session; all disposable Git fixtures cleaned up.
- Mixed writes/crew stay disabled. The adapter tests do not establish installed-host execute→handoff, native hooks, cutover or rollback acceptance. The existing unverified capability guard remains unchanged.
- No new durable ledger decision; this work follows runtime-boundary, unknown-coverage and value-first decisions. The read-only bridge intentionally avoids the current decoder because it drops unknown identity fields. No pending user fork.

## Pick up from here

- Continue Phase 2 with a useful storage-to-context slice: recon/preflight versioned qualified claim decoding (including explicit legacy Claude source binding, unknown fields/versions, takeover references) so the injected readClaims port can be backed by real data safely. Keep write activation separate; never feed a qualified record through the lossy legacy decoder and guess its source afterward.
- Then reuse the existing identity/snapshot/policy in production command composition and the remaining board/claim/placement/prune consumers. `trees/find`, claims/held, board joins/attribution, remote-take and overseer self/mirror/release paths still need qualified migration. Placement's new ports are ready, but its world/tree policy is still LiveSession/naked-ID based; do not flatten RuntimeSession rows to fit it.
- Preserve unknown source coverage and require full participating-source evidence before placement/removal. The planning snapshot is read-only; mutation-time revalidation under workspace coordination and resume-before-prune interleaving coverage remain open.
- Use one explicitly bound supported configuration when native acceptance is authorized; reuse Phase 1's existing observations and adapters. Do not restart broad platform/retention/install research.

Focused new checks:

```sh
bun test skills/spec/tools/tests/context-runtime.test.ts skills/spec/tools/tests/claims-snapshot-held.test.ts skills/spec/tools/tests/context-async.test.ts skills/spec/tools/tests/context-rendering.test.ts skills/spec/tools/tests/trees-placement-ports.test.ts
bun run typecheck
bun skills/spec/tools/spec.ts doctor codex-runtime-support
```
