# Phase 2 identity and read-only snapshot recon

Scope: the first adapter chunk of Phase 2. Two read-only explorer agents examined identity/reuse and session composition/testing. No native daemon or profile was accessed. Baseline `a4db045`, clean inherited tree `feat/codex-runtime-support-pr-a`.

## Seam and reuse

- `skills/spec/tools/runtime/sessions.ts:5–17` already defines SourceRef, SessionRef and coverage. Add the single identity equality/key implementation alongside these values; no new identity scheme.
- `skills/spec/tools/sessions/own.ts:3` is the explicit legacy Claude reader. `tests/runtime-claude.test.ts:17–20` requires it to ignore Codex evidence. Preserve it while adding a new injected resolver using `core/env.ts:1` and `core/result.ts`.
- `runtime/codex/scan.ts:11–40` already provides injected loaded-session pagination, deduplication, conservative decoding and partial-row retention. `runtime/codex/decode.ts:21` currently accepts any runtime label; narrow this Codex boundary.
- `runtime/claude/sessions.ts:7–25` already normalizes Claude rows and parked continuations without PID fabrication. Keep parsing/PID checks in the legacy edge.
- `runtime/codex/transport.ts:9–17` provides the read-only connector. A small Codex session reader can own connect/scan/close around this existing port; the caller binds the configured source and endpoint, without guessing defaults.
- No cross-source composer exists. Add an async injected reader boundary and compose each source once; accept only observations matching the reader's configured SourceRef. Keep pure identity policy synchronous.

## Production integration remains pending

The six legacy reads remain `board/load.ts:57`, `commands/claim.ts:71`, `claims/live.ts:26`, `trees/place.ts:121`, `trees/prune.ts:47` and `crew/deps.ts:28`. Board/claim/place currently repeat reads. Context and placement first require the narrow dependency extractions in the phase entry. Do not partially wire a qualified snapshot into naked-ID ownership decisions.

## Testing-issue estimate

- Existing `tests/runtime-codex-probe.test.ts:17–33` uses a typed fixture RPC/runner; `runtime-claude.test.ts:54–60` distinguishes failed and successful-empty reads. Use these patterns; no test reads host state.
- Missing cases: equal native IDs in different sources, dual environment conflicts, explicit unconfigured source binding, a source reader throwing, and a reader returning another source's coverage.
- Runtime files are 18–108 lines. No extract-first size obstacle. `commands/claim.ts` is 214 lines and remains outside this chunk.
- `scanLoaded` checks a deadline between requests, while the concrete RPC bounds each awaited request. This chunk reuses that transport contract; no general cancellation framework.
- Writer cutover remains unproved. Do not take a Codex claim through the legacy writer or run placement/pruning as workflow setup; reuse the explicitly delegated tree. No push/PR/install/cleanup of other trees.

## Local toolchain and official reference

Bun remains 1.4.4, matching Phase 1's installed API probes (`research/phase-1/2026-11-08-bun-1.4.4-toolchain.md`). This chunk uses ordinary Promise composition and injected existing RPC; no new runtime API or library.

Official [App Server documentation](https://learn.chatgpt.com/docs/app-server) was fetched on 2026-11-09. Wire behavior remains limited to the existing versioned 0.167.0 fixtures; current documentation is not new native acceptance evidence.
