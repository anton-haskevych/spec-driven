---
date: 2026-11-09
spec-phase-at-review: 2 Codex identity and shared session visibility
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: adoption-before-automation
---

# Review — adoption before automation

Source of record — immutable. Five read-only reviewers examined the current spec and implementation at 6eeb4e1. The parent verified the load-bearing findings before applying this re-plan. This is planning evidence, not native acceptance.

## Summary

Fix then proceed. Shared policy with native adapters remains the right direction. The previous value-first amendment allowed adapter development sooner but retained infrastructure-first dependencies and global acceptance gates. The next delivery must complete a useful local action; all existing Claude features still have to work on Codex before this spec is done.

## User decisions

Anton approved reorganizing the remaining work for early adoption, then clarified: “I want this full claude code workflow with the spec to be fully ported onto codex too” and “claude code experience should stay the same (or improve if you see clear improvements) but not cut any corners or features or regress”. These settle scope: change delivery order, preserve full final parity and existing Claude behavior. No new product fork remains.

## Resolved by the synthesizer

- Preserve completed Phase 1 and all six completed Phase 2 items. Reuse the tested composition instead of replacing it.
- First use is an explicitly restricted, exclusive local pilot in a separate clone/common Git directory. It is not managed-workflow parity. A same-common-directory pilot must wait for shared ownership protections.
- Pilot restrictions belong once in the shared capability/workflow contract and are enforced before command dispatch. Native bindings translate mechanics; they do not copy policy.
- Keep historical phase IDs; add 2b for shared coordination and 3b for workers. Bring minimum entry into 2; put full interactive integration in 4 before normal launches in 3, then workers in 3b.
- Every enabled capability carries its own acceptance and Claude regression evidence. Phase 6 closes the complete parity inventory and consolidates CI; it does not defer basic testing.
- Use ordinary Git isolation and existing validation/release mechanisms. No clone manager, second runtime framework, updater or retention subsystem.

## Findings

### R1 — Interactive entry waits for unrelated worker machinery
High; consensus; verified. Principal, integration and adversarial reviewers. `phases/phase-4-native-workflow.md:2` needs Phase 3, whose deliverables include durable worker recovery, reservations and acknowledged shutdown. Move minimum entry to 2; complete interactive integration before background automation; split normal launch from workers.

### R2 — Full parity is not enumerated
High; consensus; verified. Principal and integration reviewers. `skills/spec/SKILL.md:38` has 12 public modes; `tools/spec.ts:35–59` has 21 command families. The old PR matrix mostly names the four-command loop. Add one required parity inventory covering all modes, tools and cross-mode behavior, with phase owners and evidence. Reuse runtime-neutral tools rather than rewrite them.

### R3 — An assigned worktree is not a safe ownership-free pilot
High; consensus; verified. Principal, adversarial and integration reviewers. `tools/trees/prune.ts:47–50,64–70,78–87` reads Claude sessions and removes eligible linked trees; `claims/held.ts:17–23` omits unreadable claims. Readable closed pending claims can protect a tree, so removal is conditional, not universal. Require separate-clone/common-directory isolation and verify the old clone cannot enumerate the pilot. Disable remote claim mirroring too; origin is otherwise shared.

### R4 — Correct context can fall through to Claude command defaults
High; consensus; verified. Integration, quality and adversarial reviewers. `tools/spec.ts:31–32,66–70` overrides only context; the registry still dispatches claims, trees, launches and crew to legacy factories. `execute.md:40–59` and `handoff.md:138–149` invoke placement, claims, push and cleanup. Add bounded capability checks before dispatch, including automatic actions in shared mode instructions; no successful-ownership or full-handoff claims for skipped pilot operations.

### R5 — Explicit validation is needed before native hooks arrive
Medium; consensus; verified. Adversarial and prior-art reviewers. Existing `commands/lessons.ts` exposes recall; `hooks/spec-file-check.ts:34–40,51–73` exports validators; doctor is registered already. Use them explicitly in the pilot and exercise invalid-edit feedback/correction. Positive native hook execution remains required in 4.

### R6 — The plan can send developers back through completed extractions
Medium; consensus; verified. Quality and prior-art reviewers. `commands/stored-runtime-context.ts:16–41` and `commands/runtime-context.ts:24–35` already compose qualified disk/context reads. `runtime/read-sessions.ts:5–18` has source-bound readers; `trees/place.ts:60` has request/dependencies. Reuse these contracts and mark the context/placement extractions as completed; only remaining consumers propagate async when integrated.

### R7 — Global PR gates undo incremental delivery
Medium; consensus; verified. Principal, integration and adversarial reviewers. The previous `pr-opening.md:47–52` required all native surfaces without delivery ownership. Scope acceptance to enabled capabilities; retain all final requirements in the parity inventory. Claude characterization and regressions apply from the first PR. Worker reservation, race, exact-turn and stop-acknowledgement protections move with worker activation, not out of scope.

### R8 — Active guidance contradicts current decisions and implementation
Medium; unique insight plus parent verification; verified. Prior-art and quality reviewers. `ledger/decision-source-based-immutable-releases.md:9–13` still asks for retention/staging/freshness proof; `pr-opening.md:5` says all implementation is unchecked; Phase 1 mixes historical open-state prose with completed status. Reconcile active references while preserving immutable research/reviews. Existing `runtime/capabilities.ts` update/retention labels are a narrow future cleanup, not permission to build an updater.

### R9 — Branch-only regrouping and cached skills can invalidate self-use evidence
High; unique insight; verified against existing project lessons and current wiring. Prior-art reviewer. `docs/specs/_ledger/gotcha-trees-place-reads-pr-group-from-base.md` records base-derived placement; `gotcha-session-runs-the-cached-plugin-not-the-branch.md` records cache/branch divergence. Keep the current implementation tree explicit. Candidate acceptance must identify executed candidate assets/revision, not just a manifest/catalog. Do not auto-launch into a newly regrouped phase from old base metadata.

## Rejected or unverified

No substantive finding was rejected. Reviewers proposed either minimal managed ownership first or an isolated pilot; the isolated pilot was selected as the explicit early-adoption boundary, with managed coordination retained next. It requires executable acceptance before use. No live install, native hook, cutover, worker guarantee, current host/version support or pilot isolation has been newly proved by this review. Existing dated native observations remain bounded historical evidence.
