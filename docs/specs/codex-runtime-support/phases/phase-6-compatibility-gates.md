---
needs: [5]
pr: C
---

# Phase 6 — Dual-runtime compatibility harness and CI gates

## Outcome

The repository ships a repeatable compatibility harness and release gates that keep both runtimes working as the plugin evolves.

## Files to touch

`tools/tests` compatibility harness/fixtures; `.github/workflows/plugin-metadata.yml`; package/build verification commands and supported-runtime documentation.

## Deliverables

- [ ] Add the shared behavior-contract harness against both adapters and simulated mixed-runtime sources, including state codec/backward-reader floor and failure coverage.
- [ ] Add controlled native host harnesses for clean installation, the full four-command loop, scoped hooks and owned worker lifecycle, with isolated state and guaranteed fixture cleanup.
- [ ] Wire deterministic contracts, packaging/version drift checks and import-boundary guards into CI; make missing native integration credentials/runtime explicit rather than a passing parity test.
- [ ] Add release-candidate integration gates and an evidence manifest recording plugin revision, CLI/API versions, capabilities, scenario results and supported environments.
- [ ] Document the agent-operated update/recovery procedure and ship a freshness/compatibility diagnostic that reports unsupported or stale installations without changing user work.

- [ ] Add concurrent/interleaving contracts: actual legacy readers, supported old-resume fencing, equal native IDs across sources, target/slot races, resume-before-prune, failed close-out acknowledgement and user continuation of an owned thread.

## Implementation guidance

This phase ships test/CI and diagnostic code; it is not a standalone manual-QA phase. Running verification, opening PRs and obtaining rollout approval stay in pr-opening.md. Headless native harnesses cannot count terminal/UI scenarios they did not exercise. No compatibility assertion rests only on mocks.
