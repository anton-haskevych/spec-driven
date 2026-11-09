---
created: 2026-11-08T19:10:00-08:00
updated: 2026-11-09T02:17:51-08:00
status: active
area: [agent-tooling]
domain: [runtime-integration]
scope: [feature, refactor]
related:
  - spec-board: Claims, session visibility and worktree occupation must remain correct across runtimes.
  - spec-spin-off: Keep terminal launch behavior while adding Codex launch support.
  - oversee-crew-spec: Add Codex lifecycle support without rewriting the existing crew policy.
  - spec-loop-automation: Reuse existing gates, release and agent-operated workflow conventions.
---

# Claude Code and Codex Runtime Support

Port Anton's complete daily Claude workflow to Codex. Preserve every existing Claude feature and observable behavior; clear improvements require deliberate intent and regression coverage. Shared policy stays canonical. Deliver useful increments sooner without shrinking final parity.

**Re-plan approved.** Anton authorized adoption-first sequencing and explicitly retained the full port with no feature cuts or regressions. Phase 2 delivers an isolated local pilot; 2b supplies shared coordination; 4 completes interactive modes/reviewers/hooks; 3 adds normal launches; 3b adds managed workers/crew; 6 closes full parity. Existing checked implementation remains checked; unproved capabilities remain unproved.

| File | Purpose |
|---|---|
| product-brief.md | Intent, delivery priorities and scope |
| workflow-parity.md | Required complete feature inventory and phase/evidence ownership |
| design.md | User flows, delivery boundaries and invariants |
| technical.md | Existing foundations, remaining integration and activation contracts |
| progress.md | Phase index in delivery order |
| pr-opening.md | Per-increment PR/acceptance checks and final release gates |
| code-map.md | Existing source seams and implementation map |
| phases/ | Scoped implementation increments |
| ledger/INDEX.md | Decisions and implementation constraints |
| research/ and reviews/ | Immutable historical evidence and review rationale |

## Relationship to code

Read the authored repository's parent guide at ~/IdeaProjects/claude-plugins/CLAUDE.md; external worktree parents differ. Runtime policy is in skills/spec/, especially tools/{sessions,claims,launch,crew,board,trees}. The spec is a plan, not a claim that proposed interfaces exist.

Phase 1 is complete. Phase 2 has qualified identity/source readers, raw claim decoding, configured disk-backed read-only context and pure input/render/placement seams. Default executable/production ownership remains Claude-only. Native bootstrap, shared writer activation and native hook execution are not completed by those fixtures. Reuse the existing composition; do not rebuild it.

## Current plan and handoff

Read in-flight/phase-2.md for exact implementation state. The assigned source tree remains ~/claude-worktrees/spec-driven/codex-runtime-support-pr-a on feat/codex-runtime-support-pr-a. This replan does not move it, create the pilot clone or change a live installation.

The next chunk connects the native entry to the existing configured context command and enforces explicit pilot capabilities. A pilot using unready shared ownership must have a separate Git common directory and no remote claim/cleanup/launch fallthrough. Same-repository daily use remains required in Phase 2b.

PR grouping changes are branch-local until published through the existing authorized process. Do not auto-launch a regrouped phase using old origin/default metadata. Native acceptance must identify the actual candidate assets/revision; the installed cached release is not this branch.

Phase 5 remains withdrawn. Native hosts own updates. No updater, freshness helper, release-state coordinator, clone/profile manager or retention subsystem. Live personal installation, publication and rollout retain their existing separate authorization.

## Review state

Current approved rationale: reviews/2026-11-09-adoption-before-automation.md. Earlier reviews/research remain immutable historical evidence; superseded first-phase obligations do not reopen completed work. Full completion requires workflow-parity.md, not just the pilot demonstration.
