---
date: 2026-11-08
spec-phase-at-review: 1 Runtime contracts and Claude compatibility baseline
agents: [principal-engineer, adversarial-tester]
slug: proof-gates-recheck
---

# Recheck — proof gates

Immutable follow-up after the parent applied all eleven deduplicated review amendments.

## Principal engineer

No remaining high blockers for phase 1 proof/characterization. Revised contracts distinguish SourceRef from runtime; native installed/loaded release state is authoritative; the existing native publish/install flow is preferred; legacy writer compatibility requires actual old-reader tests and a proved supported-entry cutover. Arbitrary manual historical code is explicitly outside the guarantee. Unsupported native resume fencing blocks mixed-runtime activation.

Verdict: sound to seek approval for phase 1 proof work. This is not approval to enable mixed mutations, crews or automatic activation.

## Adversarial tester

No remaining high blockers for the four reviewed lifecycle risks. The spec now separates planning reads from mutation authorization, requires fresh evidence under workspace coordination, reserves stable targets and numbered slots, uses generation/CAS updates, retains unacknowledged stop/archive state and capacity, and fences evidence/control against later user turns.

Verdict: sound for spec approval with proof gates preserved. Actual transport lifetime, cancellation/process cleanup and old-entry fencing remain phase-1 evidence requirements.

## Parent disposition

All eleven amendments are represented in design/technical/phase/acceptance files. The review is complete as planning. Anton's final design approval remains unchecked in phase 1. No implementation, installation, configuration, release or publish action was taken.
