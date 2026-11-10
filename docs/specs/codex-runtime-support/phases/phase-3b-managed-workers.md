---
needs: [3]
pr: D
---

# Phase 3b — Managed workers, PR babysitting and overseer parity

## Outcome

Codex runs the full unattended workflow: owned background workers and babysitters, overseer scheduling, attention, restart/reconciliation and safe close-out. Claude retains its successful crew behavior; deliberate safety improvements have focused regression evidence.

## Files to touch

runtime worker/control/evidence adapters; launch/background; sessions/agents/transcript; crew deps/run-state/overseer/launch/check/wait/tick and associated command bindings.

## Deliverables

- [ ] Implement native Codex worker creation and durable source-qualified owned handles with exact launched turn/generation, run/target/slot and candidate release; preserve Claude launch contracts and configured native permissions/models.
- [ ] Migrate overseer, run-file and launched-entry identity/control routing to qualified references, preserving legacy Claude records and unknown sections; never infer a worker backend from the controller environment.
- [ ] Route roster/wait/attention and bounded paginated owned-turn completion evidence through adapters; retain git/push/handoff/released-claim checks and never infer success from absent threads or disconnect.
- [ ] Reserve stable run/target and numbered capacity atomically before placement/external launch using existing state primitives, invocation-unique locks and generation/CAS merges. Repeated or concurrent ticks cannot duplicate targets or exceed caps.
- [ ] Reconcile starting/outcome-unknown/running workers across lost responses, disconnect and controller restart; unknown starts retain their reservation instead of being blindly retried.
- [ ] Implement exact-owned-turn interrupt, yielded descendant cleanup and archive with acknowledged stopping/archive-pending/unknown states. Failed control retains ownership/slots; later unowned user continuation prevents automatic control.
- [ ] Bind babysit and oversee-crew fully, including execute/babysit worker roles, auto/hold modes, parking, capacity/owner filters, stop/wait/check, continuation and authorized launch of next work.
- [ ] Extend workflow-parity.md's Session continuity contract to unattended launches/relaunches: the overseer reads current handoffs before selecting follow-up work and each receiving execute/babysit worker reads destination handoffs before acting. Launch briefs supplement persisted notes; preserve crew-specific completion output and parking/approval rules.
- [ ] Add shared Claude/Codex lifecycle, attention, race, restart, failed control and user-continuation fixtures plus controlled native acceptance drivers with guaranteed cleanup.

## Implementation guidance

All original worker protections remain required before enabling managed workers. They gate this capability, not interactive work or normal terminal launches. Capability checks precede placement/brief/launch side effects. No improvised detached runner, fabricated native IDs/PIDs, Claude fallback or global session control.

Reuse the existing crew scheduler and close-out policy. Type stop/archive outcomes explicitly; stronger failure handling is an intentional shared safety correction and requires Claude tests. Preserve all existing successful operations and approval/ship behavior.

Native acceptance remains bounded to proved hosts/versions; no missing credential/runtime is counted as a pass. Running lifecycle/crew/babysit acceptance belongs in ../pr-opening.md.
