---
kind: decision
applies-to: [phase 1, phase 3]
created: 2026-11-17T14:54:00-08:00
---

# Parallel lanes and the feat/<spec> cut ship with Phase 3, not Phase 1

**Status: answered by Anton 2026-11-17: Phase 1 ships in PR C too.** Review fork 2 had split it into PR A;
Phase 3's execute session found its crew wiring sits on Phase 1's files (`crew start --spec`, `crew/scope.ts`,
the tick), so PR A and PR C would conflict or wait on each other. Phase 1 still keeps one worker per spec until
Phase 3's `groupKey` lands in the same PR.

- **What changed:** Phase 1 (PR A) gives per-spec overseers, several at once, the machine limit and the plan
  notice, and still runs one worker per spec. The `groupKey` that lets lanes run side by side, and the spec-branch
  cut, moved to Phase 3 (PR C), where merge-back makes them safe.
- **Why:** with PR A alone, parallel lanes cut from main each run `publish-docs` and hit the CRM
  `diverged on main` conflict (`pick.ts:22-23` names this as the reason for one worker per spec). An early
  `feat/<spec>` would also sit stale until PR C flipped the mode.
- **Was rejected, now chosen:** ship Phase 1 with Phase 3 in PR C. A larger release, and nothing lands until both
  are done; in exchange no merge-main hop between two PRs editing the same crew files.
