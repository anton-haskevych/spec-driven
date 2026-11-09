# In-flight state

**Session ended:** 2026-11-09
**Active phase:** 2 — Codex identity and shared session visibility

## Where things stand

- Two tested implementation commits on the inherited `feat/codex-runtime-support-pr-a` tree, baseline `a4db045`: `ab5cbf8` qualified identity resolution; `333ffba` source-bound reader composition. This handoff adds only spec bookkeeping.
- `runtime/identity.ts` is the single source/session key/equality implementation. `resolve-identity.ts` accepts injected environment/configured sources/optional explicit host binding. Dual-runtime evidence, mismatched IDs, missing/unconfigured/ambiguous sources refuse; no `CODEX_SESSION_ID` fallback. Legacy `sessions/own.ts` remains Claude-only.
- `readSessionSnapshot` composes each injected reader once per call with a shared observation time. Exact source coverage binding, duplicate source/row handling, failure isolation and partial rows are fixture-tested. Source keys remain opaque configuration, not endpoint inference.
- `claudeSessionReader` wraps the existing mapper with injected file/PID loading. `codexSessionReader` wraps the existing paginated scanner with injected connect/close ownership. The native boundary takes a narrowed CodexSource. No native write API or source registry added.
- Red-first runs failed on the expected missing modules; green: 60 tests across 10 focused files, `bun run typecheck`, `git diff --check`. Includes actual disposable Unix WebSocket transport tests; no live Codex daemon or model session calls. Full suite/PR gates have not run because the PR group is unfinished.
- Phase 2 is partially complete. Compound checkboxes were split to distinguish finished adapters from pending command integration. Qualified storage, takeover/release, remote codecs, six read consumers, activation/rollback, mutation revalidation and cross-process race coverage remain open.

## Implicit context

- Delegated scope: reuse this worktree and local commits; no profile/install changes, copied auth, push, PR, merge or release. No retention/disposable-login research. No long-running process or server was started; fixture sockets were stopped by their tests.
- No Codex workflow claim was taken: the available production writer is still the unfenced Claude-only contract. Do not alias CODEX_THREAD_ID into CLAUDE_CODE_SESSION_ID. Likewise no workflow tree placement/pruning or remote claim mirroring ran. The delegated tree was already selected explicitly. No claim needs releasing.
- Mixed writes/crew remain disabled; the existing capability guard stays unverified. Adapter tests are not cutover, native-hook, installed-host or execute→handoff acceptance evidence. Existing identity/cwd observation in the Phase 1 probe is not automatically supplied by the new resolver.
- No new durable ledger entry was needed: implementation follows the existing runtime-boundary, unknown-coverage and value-first decisions. No unanswered user decision for the next adapter chunk.

## Pick up from here

- Continue Phase 2 with execute recon/preflight of narrow contextPack/placeTree dependencies and separation of async input loading from pure rendering. Then propagate one configured snapshot through the six consumers, together with qualified identities; do not flatten normalized sessions into naked-ID ownership policy as a shortcut.
- Reuse the new identity helpers/readers rather than adding independent keys or scans. Keep endpoint/home binding and supported-source/current-ID observation explicit at the future composition boundary. Preserve unknown coverage until source configuration and evidence suffice.
- Existing adapter checks can be rerun with:

```sh
bun test skills/spec/tools/tests/runtime-identity.test.ts skills/spec/tools/tests/runtime-read-sessions.test.ts skills/spec/tools/tests/runtime-session-readers.test.ts skills/spec/tools/tests/runtime-codex-decode.test.ts skills/spec/tools/tests/runtime-codex-probe.test.ts skills/spec/tools/tests/runtime-codex-transport.test.ts skills/spec/tools/tests/runtime-codex-rpc.test.ts skills/spec/tools/tests/runtime-claude.test.ts skills/spec/tools/tests/sessions-live.test.ts skills/spec/tools/tests/sessions-own.test.ts
bun run typecheck
```
