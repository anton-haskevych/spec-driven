---
needs: [4]
pr: C
---

# Phase 5 — Versioned packaging and safe update coordination

## Outcome

A self-contained dual-runtime package and native freshness/install path support fresh-session activation and documented recovery after updates.

## Files to touch

`.claude-plugin` and `.codex-plugin` manifests, marketplace metadata, `scripts/version.py`, versioned distribution/update coordinator and install artifacts, release fixtures.

## Deliverables

- [ ] Build self-contained host artifacts and verify all manifests/assets agree with one release version/revision. Eliminate dependence on development checkout paths, another runtime cache or personal bridges.
- [ ] Implement the phase-1-proven native refresh/install/verification flow and only the bounded freshness helper it demonstrably lacks, using existing atomic/timeout mechanisms.
- [ ] Implement bounded/coalesced entry freshness checks and desired/candidate/observed-native release records; include capability, source/content and writer-contract verification before fresh-session activation.
- [ ] Handle offline checks, invalid candidates, required hook trust and unsafe downgrade with truthful status and supported native recovery. Explain when an update requires a fresh session; do not build custom old-session retention or bypass trust.
- [ ] Add reinstall, interrupted-update, concurrent-check, corrupt-package, offline, trust-required and rollback fixtures; remove the earlier two cache-only launcher adaptations only after native source-based parity is proven.

- [ ] Reuse existing scoped native plugin-publish/install verification and the phase-1 activation proof. Keep any freshness journal observational; do not build a second activation selector.

## Implementation guidance

No invented native autoUpdate setting or unrelated harness cleanup. Use native install/update behavior and fresh-session recovery. Seamless old-session continuity and custom resource bundles are deferred; do not spend more probe work on that guarantee or assume transactional rollback. Public publishing and changes to personal update scheduling remain separately approved rollout operations in pr-opening.md.

Decision to carry into implementation: `ledger/decision-use-native-updates.md`. Native installed/loaded state and hook trust remain authoritative. Incompatible writer-contract safety is separate from the deferred continuity edge case.
