# In-flight state

**Session ended:** 2026-11-09
**Active phase:** 2 — Codex identity and shared session visibility

## Where things stand

- Continued the inherited clean `feat/codex-runtime-support-pr-a` from `0e359c4`. Implementation commits: `4b1c7ce` qualified claim document decoder; `69637b9` conservative disk reader; `e61b68a` configured storage-to-context command integration. Controller commit `f4296f2` independently withdrew the custom updater phase during this session; preserve it.
- `claims/document.ts` decodes `schemaVersion: 1` records with `ref: SessionRef` and optional qualified `takenFrom`. Unversioned legacy `sessionId`/string `takenFrom` require an explicit `ClaudeSource`. Unsupported versions, alternate identity/version markers, malformed refs/takeovers and contradictory sessionId refuse decoding. The result keeps the original parsed record separately from a normalized `StoredSessionClaim`; unknown nested fields survive in the record. No encoder or writer was added.
- `claims/read-documents.ts` uses the existing JSON parser and `readIfPresent`, reads sorted `.json` files only, tolerates genuinely absent storage/disappearing files, and refuses filesystem errors, unknown/malformed/unbound records and filename/target mismatches. It does not create storage, sweep leftovers or modify claim bytes.
- `RuntimeContextDeps.readClaims` now returns one `RuntimeContextClaims` value (`claims`, `here`), replacing its independent `readClaimsHere` dependency. This prevents configured inference from falling through to the legacy decoder. `createStoredRuntimeContextCommand` in `commands/stored-runtime-context.ts` resolves shared Git claims storage and registered canonical workspace ownership, then supplies both fields from the same disk rows.
- Configured callers can use `run(argv, projectDir, { context: createStoredRuntimeContextCommand(deps) })`. Dependencies explicitly supply env, optional host binding, source-bound readers, Runner, clock and optional legacy Claude source. Identity resolves before Git/claim/source reads; each source and the claims directory are read once. Default executable/registry context remains Claude-only. No source/home/endpoint discovery or installed-native bootstrap was added.
- Retained previous pure context rendering/phase selection, one planning snapshot, qualified held policy and narrow placement ports. Placement's world/policy and board/claims/prune/crew remain legacy Claude-only. Qualified claim documents are never fed through `claimFromRecord`.
- TDD: new decoder, filesystem and dispatcher fixture tests were each red on their missing API before implementation. Verification: 99 tests across 17 storage/context/identity/snapshot/reader/historical-compatibility files passed; final small dispatcher cleanup reran its 14 affected tests. `bun run typecheck`, `git diff --check` and doctor pass. Full suite/PR gates have not run; PR group A and Phase 2 remain incomplete.

## Implicit context

- No workflow claim was taken/released; production writers remain unfenced Claude-only. Never alias CODEX_THREAD_ID into CLAUDE_CODE_SESSION_ID. The tree was explicitly inherited, without live placement/prune or remote claim mirroring.
- No live install/profile change, credentials, native daemon/own-account query, login/retention research, updater, push, PR, merge or release. All source observations are injected fixtures. Disposable Git repositories and linked worktrees were cleaned up. No server/watcher/background process remains.
- Mixed writes/crew stay disabled. These tests prove configured read-only command composition, not installed execute→handoff, current native ID/cwd, managed old-writer cutover, native hooks or rollback acceptance. Capability guards and historical source fixtures remain unchanged.
- New ledger principle: retain the raw claim document separately; never serialize its policy projection as an unknown-field-preserving write. No pending user fork.

## Pick up from here

- Reuse the new document reader and configured context command; do not rebuild discovery or restart platform/login/retention research. The next useful Phase 2 slice is remaining qualified read consumers (claims/held, board joins/attribution, trees/find and placement's world policy) or the explicitly configured native context bootstrap when that acceptance is authorized. Preserve exact-source unavailable/missing coverage and healthy-source results.
- Qualified take/release/takeover, remote payloads/mirror joins, overseer/run/worker records and every raw-ID equality path are still pending. Preserve unknown fields through the raw document when building codecs. Keep write activation separately gated on enforceable old-writer cutover; a schema marker alone provides no fence.
- Planning snapshots never authorize removal: workspace-coordinated mutation-time revalidation and resume-after-preview-before-prune interleaving tests remain open. Do not flatten RuntimeSession rows into naked-ID LiveSession to fit legacy consumers.

Focused checks:

```sh
bun test skills/spec/tools/tests/claims-document.test.ts skills/spec/tools/tests/claims-read-documents.test.ts skills/spec/tools/tests/context-stored-runtime.test.ts skills/spec/tools/tests/context-runtime.test.ts skills/spec/tools/tests/claims-snapshot-held.test.ts skills/spec/tools/tests/runtime-legacy-readers.test.ts
bun run typecheck
bun skills/spec/tools/spec.ts doctor codex-runtime-support
```
