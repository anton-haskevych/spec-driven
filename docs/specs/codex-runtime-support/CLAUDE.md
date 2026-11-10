---
created: 2026-11-08T19:10:00-08:00
updated: 2026-11-09T16:38:52-08:00
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

Phases 1 and 2 are complete. The isolated native Codex pilot has source-qualified readers, preserved raw claims, configured context, source-packaged candidate/ID/cwd bootstrap, canonical competitor paths and verified native recon descendants. One combined installed candidate passed real execute/update/handoff and independent fresh resume without a serial workaround. Shared writer activation and trusted native hooks remain pending; default managed ownership stays Claude-only. Reuse existing composition.

## Current plan and handoff

The assigned source remains ~/claude-worktrees/spec-driven/codex-runtime-support-pr-a on feat/codex-runtime-support-pr-a. Final acceptance is `research/phase-2/2026-11-09-final-combined-acceptance.md`; PR A's local review draft is `pr-a-review.md`, with pending review state in `in-flight/pr-a.md`. No remote PR, push, merge or release has occurred.

Integration commit 90bd6cf combines the retained pilot cwd/symlink fix with fc10395 qualified native parentage. The final candidate revision was `sha256:cfe500538196bc655f614ebacd62e1b210364a10c50fa2fd41de044e8507c889` in both real sessions and the reconciled pilot source. Canonical parallel recon, explicit recall/invalid-file correction, local source/spec commits and confirmed Stage A/B fresh pickup passed. The temporary native installation was removed and all existing installed-plugin metadata restored. Historical failed/serial-only reports remain unchanged; the new acceptance supersedes their pending local-cycle disposition.

The pilot must still use a separate exclusive clone/common directory with no unready claim/publication/cleanup/launch fallthrough. Native source qualification recognizes delegated descendants; independent sessions still compete. Same-repository daily use belongs to Phase 2b, followed by full interactive/persona/hook binding in Phase 4. Full Claude parity and every existing feature remain required.

PR grouping changes are branch-local until published through the existing authorized process. Do not auto-launch a regrouped phase using old origin/default metadata. Native acceptance must identify the actual candidate assets/revision; the installed cached release is not this branch.

Phase 5 remains withdrawn. Native hosts own updates. No updater, freshness helper, release-state coordinator, clone/profile manager or retention subsystem. Live personal installation, publication and rollout retain their existing separate authorization.

## Review state

Current approved rationale: reviews/2026-11-09-adoption-before-automation.md. Earlier reviews/research remain immutable historical evidence; superseded first-phase obligations do not reopen completed work. Full completion requires workflow-parity.md, not just the pilot demonstration.
