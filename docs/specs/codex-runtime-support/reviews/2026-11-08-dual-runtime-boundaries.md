---
date: 2026-11-08
spec-phase-at-review: 1 Runtime contracts and Claude compatibility baseline
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: dual-runtime-boundaries
---

# Review — dual runtime boundaries

Source of record; immutable. Five independent reviewers examined the initial draft and existing source. Reviewed in two batches because only three child-agent slots are available. The parent verified the load-bearing source claims and synthesized this report before changing the spec.

## Summary

Fix-then-proceed: one workflow with narrow host adapters is the right direction. The initial draft left source identity, old-reader enforcement and concurrent lifecycle changes too implicit, and proposed update ownership before native behavior was proven. Eleven deduplicated amendments below address sixteen reviewer findings. No reviewer recommended abandoning the approach; no contradictory product decisions arose.

## Forks put to the user

None beyond the already approved six-phase sequence. Mechanism corrections are resolved below; deployment, supported-host proof and final design approval remain explicit gates. Arbitrary manual execution of historical cached code cannot be fenced by new metadata and is outside the guarantee. If supported native old-session reentry cannot be prevented, mixed-runtime activation remains blocked pending a new design decision.

## Resolved by the synthesizer

- Keep native installed/loaded plugin state authoritative; local freshness records are observations, never a second selector.
- Use qualified execution-source identity, not runtime alone; source endpoints/auth stay outside policy values.
- Preserve existing normal launch plans; only dedicated background creation returns worker ownership.
- Separate read-only planning snapshots from coordinated, freshly revalidated mutation authorization.
- Carry turn/generation ownership and acknowledged shutdown through shared crew policy. This explicitly strengthens old failure handling while preserving successful Claude behavior.
- Use a managed cutover with a tested entry/installation fence, not a fictional marker that old readers would obey. Unsupported historical manual paths are documented; native resume paths must be tested.

## Findings

### R1 — Old readers do not obey a new writer floor
- Severity: high. Signal: consensus. Personas: principal F1, integration F2.
- Verified: `claims/rules.ts:35–42` sees Claude-only liveness; `claims/store.ts:41–64,105–112` compares bare IDs/ignores added fields; `claims/held.ts:17–23` drops unreadable claims. A schema marker or restart observation alone does not enforce a floor.
- Scenario: after Codex activation, an old Claude cache resumes and takes/prunes work whose Codex occupant it cannot see.
- Applied amendment: explicit supported-route cutover fence and active-version proof, legacy-reader execution tests covering claims and prune, no arbitrary-old-code coexistence promise. Failure to establish the fence blocks mixed-runtime release.
- Confidence: read-in-code. No claim of a live customer incident.

### R2 — Coverage needs an execution-source key
- Severity: high. Signal: consensus. Personas: principal F2, integration F1.
- Verified: initial `SessionRef`/`SourceCoverage` used runtime alone, while source research confirms one probed control socket and the design discusses distinct homes/daemons.
- Scenario: one Codex source is healthy and another unavailable; a runtime-only key cannot judge or control the right session.
- Applied amendment: opaque source binding on refs/handles/coverage, stable local configuration mapping; endpoint/auth never enter workflow policy. Multi-source support requires capability evidence.
- Confidence: read-in-code for the contract mismatch; multi-daemon operational behavior remains a probe.

### R3 — Native activation must stay authoritative
- Severity: medium. Signal: consensus. Personas: principal F3, prior-art F1.
- Verified prior art: `scripts/version.py:25–51` centralizes versions; `../plugin-publish/SKILL.md:90–99` already refreshes/reinstalls/verifies a selected native plugin; native install metadata records revision. The initial draft prematurely required its own active/candidate/previous authority.
- Scenario: native installation changes the selected release while a custom selector claims the previous one is active.
- Applied amendment: phase-1 install/retention/trust probe; reuse the scoped native publish/install flow, add only proven freshness gaps, and record desired/observed state rather than claiming activation control.
- Confidence: existing mechanisms read-in-code; native race/retention outcome unproven and explicitly gated.

### R4 — Mutation needs fresh coordinated evidence
- Severity: high. Signal: consensus. Personas: adversarial F1, integration F3.
- Verified: `trees/prune.ts:46–50` observes before awaited work; `:64–70` removes later. `claims/atomic-file.ts:26–34` protects content, not current session liveness.
- Scenario: a session enters a clean tree after preview and before remove.
- Applied amendment: one planning snapshot, then workspace coordination and fresh claim/occupation revalidation at mutation time; explicit managed-client coverage limit; interleaving tests.
- Confidence: read-in-code.

### R5 — Concurrent ticks need a stable reservation
- Severity: high. Signal: unique insight. Persona: adversarial F2.
- Verified: `commands/crew/tick.ts:52–76` computes slots before launch; `crew/launch-session.ts:35–63` records after external creation; `crew/deps.ts:46–49` writes whole state.
- Scenario: overlapping ticks start two workers for one phase/slot and overwrite state.
- Applied amendment: atomic run/target/slot reservation before placement, generation/CAS merge semantics, owner-fenced reconciliation, and simultaneous-tick tests. No time-only expiry of uncertain active work.
- Confidence: read-in-code.

### R6 — Shutdown results must retain ownership until acknowledged
- Severity: high. Signal: unique insight. Persona: adversarial F3.
- Verified: `commands/crew/tick.ts:29–37` stop returns void; `:86–105` removes immediately after stop.
- Scenario: interrupt/archive fails but the slot is freed while work remains.
- Applied amendment: stopping/archive-pending/control-outcome-unknown states; release capacity only after verified required control/cleanup, preserving retryable records and error reporting on both adapters.
- Confidence: read-in-code.

### R7 — Bind evidence/control to the launched generation
- Severity: medium. Signal: unique insight. Persona: adversarial F4.
- Verified design gap: initial handle made turn ID optional without ownership fencing; current crew records only launched session IDs.
- Scenario: user continues a worker thread; controller uses unrelated completion text or archives that continuation.
- Applied amendment: expected turn/generation on owned handles, completion reads constrained to it, fresh control fence; a newer unowned turn prevents automatic control/archive.
- Confidence: inferred failure from verified missing contract.

### R8 — Every identity join must use the qualified ref
- Severity: medium. Signal: unique insight. Persona: integration F4.
- Verified: `trees/find.ts:84–95`, `claims/held.ts:31–41`, board joins/attribution, remote-take and overseer comparisons use naked IDs.
- Scenario: equal IDs in different sources are treated as self or mirrored holders.
- Applied amendment: add all consumers to code-map/phase 2 and one shared ref equality/key operation; equal-ID tests cover board, tree, remote and crew paths, not just claimStatus.
- Confidence: read-in-code.

### R9 — Normal launch is not managed worker ownership
- Severity: medium. Signal: consensus. Personas: quality F1, prior-art F2.
- Verified prior art: `launch/command-line.ts:8–31` builds a plan; `commands/launch.ts:60–72` returns terminal acknowledgement; `launch/background.ts:6–19` obtains an actual worker ID.
- Scenario: a universal Launcher returning WorkerHandle fabricates ownership or adds unnecessary correlation/polling.
- Applied amendment: retain pure normal launch plan plus terminal execution, separate WorkerLauncher for managed lifecycle. No normal launch record claims a worker was created.
- Confidence: read-in-code.

### R10 — Context needs an explicit async input seam
- Severity: medium. Signal: unique insight. Persona: quality F2.
- Verified: `commands/context.ts:33–45,64–86` combines sync HeldReader with context rendering; claims/live reads synchronously.
- Scenario: promises leak into rendering or repeated transport calls become necessary to test context text.
- Applied amendment: async input loader derives plain HeldPhases/pack input once; pure render/selection consumes values; named call-chain/fixture updates in phase 2.
- Confidence: read-in-code.

### R11 — Extract the three over-limit signatures first
- Severity: low. Signal: unique insight. Persona: quality F3.
- Verified: `commands/context.ts:39–44`, `commands/launch.ts:25`, `trees/place.ts:63` each have five positional parameters before adding a provider.
- Scenario: provider injection becomes a sixth parameter and late structural exceptions.
- Applied amendment: phase-local behavior-preserving narrow dependency-object extraction with existing Claude fixtures green before native additions.
- Confidence: read-in-code.

## Rejected or unverified

No substantive reviewer finding was rejected. Actual native worker persistence, interruption/process cleanup, catalog/retention/trust behavior and legacy-entry fencing remain unproven; the spec makes them phase-1 capability evidence gates, not completed facts. Source line numbers above refer to the reviewed initial source revision 22e7ec7. No production code or native state was changed to verify these claims.
