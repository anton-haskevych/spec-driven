# Qualified claim storage recon

One phase-exec wave, two read-only explorers: storage/codec and command/inference. No native or remote calls. Existing phase-1 Bun 1.4.4 characterization remains applicable; installed Bun is 1.4.4. JSON and filesystem operations reuse existing native Node/Bun facilities, with no dependency or toolchain change.

## Seam and reuse

- `skills/spec/tools/claims/store.ts:105-112` reconstructs a legacy claim and discards extra identity/version fields. Keep qualified records away from it; its mutation contract remains disabled for mixed runtimes.
- `claims/atomic-file.ts:48-55` already distinguishes a disappearing file from other filesystem failures. Reuse it for a read-only directory adapter; `claims/store.ts:32-35` resolves the shared common-dir location.
- `commands/runtime-context.ts:18-29` already resolves identity, reads claims and builds a snapshot once, returning claim errors before session reads. Its independently injected `readClaimsHere` at lines 10/27 is an inference bypass: `context/claims-here.ts:15-22` reads the legacy store again.
- `commands/context.ts:60-63` consumes only spec/phase for inference. A stored claim supplies workspace; `workspaces/list.ts:17-25` and `workspaces/owner.ts:4-6` already resolve canonical workspace ownership.
- `spec.ts:33-35,62-65` supplies the command dispatch seam. No configured native bootstrap exists. Opt-in injected command composition can be useful without changing default CLI activation or inventing source discovery.

## Testing estimate

All touched units are below the caps (store 113, bridge 30, context 117, dispatch 80). No extract-first refactor is needed. `tests/tree.ts`, `context-fixture.ts`, `git-repo.ts`, `stub-runner.ts` provide disposable fixtures. Missing contracts: explicit legacy source binding, version/runtime/takeover refusals, unknown-field retention, filesystem errors, and disk-backed no-name inference. Existing normalized context tests cannot see codec loss. TDD can remain entirely local; no live daemon, installation, credentials, ownership writes or remote mirroring is needed.
