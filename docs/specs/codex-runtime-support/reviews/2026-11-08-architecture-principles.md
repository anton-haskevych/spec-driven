---
date: 2026-11-08
spec-phase-at-review: 1 Runtime contracts and Claude compatibility baseline
agents: [parent]
slug: architecture-principles
---

# Architecture principles applied to the amended design

This review concerns the plan, not implemented behavior. The five-persona findings and their verified source evidence are recorded in `2026-11-08-dual-runtime-boundaries.md`. The following constraints are carried into phase plans and PR gates.

| Principle | Concrete design consequence |
|---|---|
| Dependency inversion | Claims/board/tree/crew policy receives small ports and plain values; never imports native client SDK/transport. |
| Swappability | Claude/Codex adapt native mechanisms behind the same domain contract; replacing a transport changes an adapter and its contract tests. |
| Minimal API surface | Normal launch plan and managed WorkerLauncher are separate; no universal provider with unrelated lifecycle/update methods. |
| Law of Demeter | Shared policy receives normalized source/session/worker observations, not chained native response objects. |
| Unidirectional dependencies | Adapters depend on contracts; composition knows adapters; existing Claude parser never imports combined source composition. |
| Single responsibility | Identity, coverage composition, native transport, lifecycle evidence and distribution have separate owners. |
| Open/closed | Host variants are selected in composition; no distributed host switches across business decisions. |
| Layer boundaries | Source endpoint/auth, PID checks, filesystem/transcript and protocol objects remain in adapters. |
| Composition over inheritance | Two concrete adapters compose existing mechanisms; no class hierarchy or speculative runtime framework. |
| Small modules | Explicit ≤250-line files, ≤50-line functions, ≤4 parameters; existing over-limit signatures have extract-first phase items. |
| Pure functions first | State mapping, identity equality, phase selection, context rendering and close-out decisions remain pure; I/O loads inputs at the edge. |
| Testability | Inject source snapshots and clocks/runners; unit tests never depend on the developer's live daemons or home directories. |
| Interface first | Narrow semantic ports precede production wiring; phase-1 capability evidence constrains their operational guarantees. |
| Fail fast | Missing identity, insufficient coverage or unproved capability refuses before claim/placement/brief/launch side effects. |
| Idempotency | Stable target/slot reservations and generation/CAS records precede external creation; ambiguous results hold capacity rather than retry blindly. |
| Explicitness | Session source and owned turn/generation are persisted; unknown state is not inferred from missing rows or environment defaults. |
| Colocation | Runtime capability code/tests are grouped together; hook translation stays with hooks; release mechanisms follow distribution ownership. |
| Reversibility | Existing Claude implementations remain the baseline; native observed install state is authoritative; downgrade is constrained by live schema/worker state. |
| YAGNI | Reuse Runner/AsyncRunner, Result, atomic primitives, polling, section writers, version helper and native publishing/install flow. New helpers require a demonstrated gap. |

## Domain boundaries

The plugin's domain is work ownership, phase/PR progression and reliable crew coordination. Session/source references and owned worker generations are domain values, not native SDK entities. Runtime discovery/control is an anti-corruption boundary. No database/ORM, event bus or generalized DDD scaffolding is introduced merely to satisfy terminology.

## Remaining proof obligations

Supported-route fencing of old cached clients; complete source coverage; native transport/disconnect survival and process cleanup; native package retention/catalog/trust. These are explicit first-phase probes. No source change is justified by a statement that those proofs have already passed.
