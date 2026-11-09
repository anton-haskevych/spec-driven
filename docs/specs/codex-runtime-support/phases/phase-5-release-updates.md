---
needs: [4]
pr: C
---

# Phase 5 — Versioned packaging and safe update coordination

## Outcome

A self-contained dual-runtime package and agent-operated freshness/activation path survive reinstall and update without changing active release code.

## Files to touch

`.claude-plugin` and `.codex-plugin` manifests, marketplace metadata, `scripts/version.py`, versioned distribution/update coordinator and install artifacts, release fixtures.

## Deliverables

- [ ] Build self-contained host artifacts and verify all manifests/assets agree with one release version/revision. Eliminate dependence on development checkout paths, another runtime cache or personal bridges.
- [ ] Implement the phase-1-proven native refresh/install/verification flow and only the bounded freshness helper it demonstrably lacks, using existing atomic/timeout mechanisms.
- [ ] Implement bounded/coalesced entry freshness checks and desired/candidate/observed-native release records; include capability, source/content and writer-contract verification before fresh-session activation.
- [ ] Handle offline checks, invalid candidates, required hook trust, active sessions and unsafe downgrade with truthful status and preserved last-known-good artifacts. Never bypass trust or rewrite running paths.
- [ ] Add reinstall, interrupted-update, concurrent-check, corrupt-package, offline, trust-required and rollback fixtures; remove the earlier two cache-only launcher adaptations only after native source-based parity is proven.

- [ ] Reuse existing scoped native plugin-publish/install verification and the phase-1 activation proof. Keep any freshness journal observational; do not build a second activation selector.

## Implementation guidance

No invented native autoUpdate setting or unrelated harness cleanup. Validate native cache retention/install timing rather than assuming rollback is transactional. Support the approved coexistence experience: old sessions retain their loaded version and fresh sessions use the newer installed release. Do not impose a blanket wait-for-all-old-sessions rule. If actual resource-access or rollback proof fails, report the specific incompatibility before enabling updates; cache eviction alone does not settle that proof. Public publishing and changes to personal update scheduling remain separately approved rollout operations in pr-opening.md.

Decision to carry into implementation: `ledger/decision-plugin-updates-preserve-session-versions.md`. Existing sessions must remain usable across a compatible update; native installed/loaded state and trust remain authoritative.
