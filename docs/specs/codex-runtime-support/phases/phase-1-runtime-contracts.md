---
needs: []
pr: A
gate: design
---

# Phase 1 — Runtime contracts and Claude compatibility baseline

## Outcome

The shared policy can accept a normalized runtime without changing Claude behavior, and executable capability probes establish what Codex can actually guarantee.

## Files to touch

`tools/runtime/` boundary values and probe fixtures; existing `core/run.ts`, `sessions/live.ts` type boundary; `tools/tests/runtime-*` and current Claude characterization tests.

## Deliverables

- [x] Gate: Anton approves the reviewed design before implementation begins. — Anton approved the reviewed design and explicitly requested a new implementation session for Phase 1 in this conversation on 2026-11-08.
- [x] Add characterization fixtures for Claude normal/background launch, identity, parked sessions, claims, hook output and current CLI results; extract only the normalized value boundary needed by two adapters.
- [x] Build a read-only, dependency-reviewed Codex capability probe with transport fixtures: supported endpoint discovery/auth, pagination, identity correlation and complete environment coverage. Record supported versions and explicit unsupported hosts. — read-only-probe.md: default configured Unix source on CLI/app-server 0.167.0 and Bun 1.4.4; other host modes explicitly unsupported
- [x] Add controlled scratch-worker probe coverage for client disconnect, reconnect, native attention states and subprocess-tree interruption; convert observations into executable lifecycle contract fixtures. If guarantees fail, park the design decision before enabling background work. — owned-lifecycle-observations.md and runtime-codex-lifecycle fixtures: actual configured 0.167.0 disconnect/reconnect, blocking user input, foreground/yielded descendant cleanup and verified archive; approval-enabled environments remain unverified
- [x] Add typed capability outcomes and refusal-before-side-effects contract tests; no host feature is enabled by a mere method-name check. — runtime-codex probe/transport/decode tests; all managed features remain unverified and production wiring stays Claude-only

## Acceptance carried to implementation phases

Anton approved incremental delivery (`ledger/decision-deliver-value-incrementally.md`). These previously open proofs move to their implementation phases; they are not passed results:

- Phase 2: prove old-writer/managed-entry compatibility before enabling mixed mutations. Preserve the actual historical-reader hazard fixtures.
- Phase 4: prove native installed-plugin loading, hook trust and execution when native hook wiring exists. Current metadata observations remain partial evidence.

## Implementation guidance

Use the existing Bun runtime and Result/Runner idioms. The WebSocket choice is provisional until the actual configured endpoints work with maintained facilities. This phase must not broaden global hooks, install a daemon or rewrite Claude session reading. Source code stays provider-neutral; runtime libraries remain outer details.

## Phase-local notes

Three execution chunks completed on 2026-11-08; Phase 1 remains open. Baseline: `3f831db`; bounded read-only proof: `1a9cbab`; historical reader proof: `b33e296`. See [probe observations](../research/phase-1/2026-11-08-read-only-probe.md), [Bun 1.4.4 research](../research/phase-1/2026-11-08-bun-1.4.4-toolchain.md) and [old-reader observations](../research/phase-1/2026-11-08-old-reader-observations.md).

The old-version item is partial: actual 2.51.0 modules/provenance/hazard fixtures exist; supported native resume and installation fencing are not proved. Session 2 completed controlled lifecycle evidence on configured CLI/app-server 0.167.0 and Bun 1.4.4: exact owned disconnect/reconnect, real blocking user-input attention, foreground/yielded descendant cleanup and verified archive. See [owned lifecycle observations](../research/phase-1/2026-11-08-owned-lifecycle-observations.md). Approval-enabled environments and broader hosts remain unverified. Native activation/old-session resource access/loaded version/hook trust remain pending. The later cache-eviction finding prompted a product question, now answered in the version-coexistence ledger; incomplete proof alone is not a new user blocker.

Native Bun Unix WebSocket worked against the actual configured endpoint on 1.4.4. Source discovery covers only that configured default Unix daemon on CLI/app-server 0.167.0; other environment modes refuse explicitly. This does not enable managed Codex use. CI now uses 1.4.4; explicit ESNext library scope exposes Bun's actual WebSocket typings without casts. Preserve the canonical tsc gate alongside locally verified bun check.

Session 2's isolated actual historical-package → fixture-candidate install proved scoped Git upgrade, native selected install, fresh catalog/materialized version and untrusted bundled-hook metadata. It also demonstrated previous-cache eviction with an already-started native thread. Anton answered the update behavior: old sessions keep their loaded version; fresh sessions use the newer installed release without waiting for all old sessions to close. The prior quiescent-update recommendation is superseded. Automatic activation stays disabled while actual execution/asset-access and trust/cutover proofs remain incomplete. Both remaining items stay unchecked: active model loaded-release identity, native CLI/desktop old reentry, positive hook trust/re-review and safe rollback are unproved. See [isolated installation observations](../research/phase-1/2026-11-08-isolated-install-observations.md). All owned scratch threads/servers were closed; no live installation changed.

Session 3 demonstrated direct native user-shell failure of the same historical script paths after selected install, and fresh candidate-path success. Active-model loaded-release behavior remains unverified; no model turn ran in the isolated profile. Both threads were archived and all owned servers stopped. See [resource execution observations](../research/phase-1/2026-11-08-resource-execution-observations.md).

**Current scope:** Phase 1's foundations are complete under the approved incremental plan. Prior paragraphs retain historical proof limits. Ownership compatibility and native hook execution remain unproved activation gates in Phases 2 and 4. Custom retention is deferred. Closing this phase enables adapter development, not production Codex capabilities.
