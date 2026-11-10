---
kind: decision
applies-to: [general]
created: 2026-11-08T19:10:00-08:00
---

# One workflow, adapters at runtime boundaries

The current Claude behavior is the compatibility baseline. Keep shared ownership, board, placement, handoff and crew policy; inject narrow identity/session/normal-plan/managed-worker/control/evidence ports from existing system factories. Rejected: copied workflows or host branches in core policy. Rationale: two real runtime variants need a boundary, not a general framework.

Review refinement: source-qualified identity includes an opaque execution-source binding; ordinary terminal acknowledgement is not worker ownership. All adapters keep endpoint/auth and wire objects at the edge.

Connected-entry implementation: `tools/runtime/workflow-capabilities.ts` owns the temporary pilot allowlist before dispatcher overrides/default factories; canonical `skills/spec/capabilities.md` governs automatic mode actions and tool-generated follow-up advice. A context override alone never enables managed commands, and a missing pilot context binding refuses. Raw Codex invocation of the legacy executable refuses rather than aliasing identity or silently using Claude defaults. Existing Claude registry behavior remains the compatibility path.

Explicit context phase hints intentionally rely on a later managed claim check (`context-command.test.ts` preserves that Claude behavior). The pilot skips that ownership step, so it must refuse existing stored claims before context or local mutation. `StoredRuntimeContextDeps.checkClaims` checks the same normalized disk rows before source composition; no second scan/decoder or cleanup. Every native command performs that context check, including phase updates. This is a restricted-pilot refusal, not a shared ownership implementation.

Generated feedback must follow the declared profile too: context lesson advice uses explicit recall through the verified entry while hooks are pending; parked pilot phases request a local commit. Default Claude hook/push advice remains unchanged. `doctor <spec> --file <spec-relative-path>` exposes the existing `issuesForWrittenFile` checker and refuses absent/outside files before claiming clean. Source socket cycles prove this composition; installed model work and fresh native pickup remain separately required by the packaged installed-local-cycle driver.

Native recon parentage is an adapter value, not a second ownership system. Codex supplies authoritative parentThreadId separately from copied-history forks; retain it as a source-qualified parent reference. The pilot occupation guard exempts only observed descendants reaching its initiating session. An independent root or unverified ancestry still competes. Commit fc10395 and the 2026-11-09 subagent-parentage native report prove concurrent real recon recall/doctor, independent-root refusal and recovery; serial recon is not required by the corrected entry. Claude producers and shared claim behavior stay unchanged.


Final Phase 2 acceptance composes canonical competitor paths and qualified descendants in 90bd6cf. A real installed execute/update/local handoff and an independent confirmed resume used the same cfe50053 asset revision; source and installed assets matched. See `research/phase-2/2026-11-09-final-combined-acceptance.md`. This accepts the isolated profile only; shared writers, native hook trust and the rest of full parity retain their existing gates.
