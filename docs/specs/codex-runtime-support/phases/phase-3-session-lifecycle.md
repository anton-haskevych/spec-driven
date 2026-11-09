---
needs: [2]
pr: B
---

# Phase 3 — Native launches and background worker lifecycle

## Outcome

Normal Codex sessions and dedicated owned background workers use proven native lifecycle adapters while the existing crew policy stays shared.

## Files to touch

`runtime/claude` and `runtime/codex` launch/control/evidence; `launch/command-line`, `background`, `commands/launch`; `sessions/agents`, `transcript`; crew launch/check/wait/tick and ownership journal.

## Deliverables

- [ ] Add runtime-specific normal launch plans with safe argument handling and canonical native skill invocation; retain shared terminal selection and Claude command goldens.
- [ ] Implement proven Codex worker launch and durable owned handles; capability checks precede tree placement and brief creation, and permissions/models follow the selected host configuration.
- [ ] Implement runtime-routed roster, wait, attention, bounded final-turn evidence, interrupt and archive for exact owned handles; never infer success from missing threads.
- [ ] Add local atomic launch records and recovery for starting/outcome-unknown/running states. Repeated ticks, timeouts and overseer restarts cannot launch duplicates or free an unknown slot.
- [ ] Integrate both worker backends into existing close-out and slot policy; verify disconnect survival, failed/interrupted workers, mixed-runtime takeover, approval/input waits and complete child-process cleanup in controlled fixtures.

- [ ] Preserve NormalLaunchPlan/terminal acknowledgement; only WorkerLauncher returns WorkerHandle. Extract launchCommand dependencies before provider injection.
- [ ] Reserve a stable run/target and numbered slot atomically before side effects; use generation/CAS merges and invocation-unique lock ownership. Test overlapping controllers, not only repeated ticks.
- [ ] Persist launched turn/generation; fence completion/control to it. Keep stopping/archive-pending/control-outcome-unknown entries and their capacity until acknowledged; test later user continuation and lost stop/archive responses.

## Implementation guidance

Phase 1 proof is a hard precondition. No cache patch, Claude fallback, shell PID pretending to be a native session, or improvised detached runner. A transport failure during launch is ambiguous until reconciled. Stop/archive must preserve history, user-created sessions and worktrees.
