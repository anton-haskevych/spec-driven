---
needs: []
pr: A
gate: design
---

# Phase 1 — Runtime contracts and Claude compatibility baseline

## Outcome

The shared policy can accept normalized runtime values while Claude remains unchanged. Bounded executable observations establish what the configured Codex environment can actually guarantee.

## Files to touch

Completed foundations in tools/runtime, Claude characterization and historical/native observation fixtures; core runtime/type/CI boundaries.

## Deliverables

- [x] Gate: Anton approves the reviewed design before implementation begins. — Anton approved the reviewed design and explicitly requested a new implementation session for Phase 1 in this conversation on 2026-11-08.
- [x] Add characterization fixtures for Claude normal/background launch, identity, parked sessions, claims, hook output and current CLI results; extract only the normalized value boundary needed by two adapters.
- [x] Build a read-only, dependency-reviewed Codex capability probe with transport fixtures: supported endpoint discovery/auth, pagination, identity correlation and complete environment coverage. Record supported versions and explicit unsupported hosts. — read-only-probe.md: default configured Unix source on CLI/app-server 0.167.0 and Bun 1.4.4; other host modes explicitly unsupported
- [x] Add controlled scratch-worker probe coverage for client disconnect, reconnect, native attention states and subprocess-tree interruption; convert observations into executable lifecycle contract fixtures. If guarantees fail, park the design decision before enabling background work. — owned-lifecycle-observations.md and runtime-codex-lifecycle fixtures: actual configured 0.167.0 disconnect/reconnect, blocking user input, foreground/yielded descendant cleanup and verified archive; approval-enabled environments remain unverified
- [x] Add typed capability outcomes and refusal-before-side-effects contract tests; no host feature is enabled by a mere method-name check. — runtime-codex probe/transport/decode tests; all managed features remain unverified and production wiring stays Claude-only

## Acceptance carried to consuming increments

Phase 1 is complete under the approved incremental plan. Closing it is not proof that managed Codex capabilities are active.

- Phase 2: native candidate bootstrap/current identity/cwd and real restricted local-cycle acceptance.
- Phase 2b: supported old-writer managed-entry transition before shared Codex mutations, retaining actual historical-reader fixtures.
- Phase 4: installed native binding, positive hook trust/invocation and full interactive workflow.
- Phase 3b: operational worker adapters reproduce bounded lifecycle observations before activation.

## Implementation guidance

Reuse existing Bun/Result/Runner mechanisms and completed source-qualified foundations. Native Bun Unix WebSocket worked on installed 1.4.4 for the configured local source. Do not repeat library/platform/login/retention research without a concrete new blocker. Historical limitations are not passed capabilities.

## Historical evidence

The immutable research remains authoritative for exactly what was observed:

- ../research/phase-1/2026-11-08-read-only-probe.md and 2026-11-08-bun-1.4.4-toolchain.md: configured read-only transport, installed API limits and bounded cleanup.
- ../research/phase-1/2026-11-08-old-reader-observations.md: actual 2.51.0 hazards, not a managed-entry fence.
- ../research/phase-1/2026-11-08-owned-lifecycle-observations.md: configured disconnect/reconnect, blocking input and owned foreground/yielded descendant cleanup; broader environments/approval attention remain unproved.
- ../research/phase-1/2026-11-08-isolated-install-observations.md and 2026-11-08-resource-execution-observations.md: install/catalog/cache eviction and old-path shell failures, not active-model identity or trusted hook execution.

Custom retention and seamless old-session continuity remain deferred; native updates use fresh-session recovery. No new live installation or native acceptance is claimed by this summary. Earlier session narrative is preserved in git and immutable research/reviews.
