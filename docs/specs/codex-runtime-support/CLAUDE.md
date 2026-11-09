---
created: 2026-11-08T19:10:00-08:00
updated: 2026-11-08T20:22:34-08:00
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

One spec workflow, two properly integrated execution runtimes. Claude Code remains the compatibility baseline. Codex becomes a supported runtime for the complete prep → review → execute → handoff loop, including the session ownership, hooks and crew machinery that makes the loop reliable.

**Incremental adapter development authorized.** Anton approved Phase 1 proof work, then accepted the value-first council re-plan to build a usable Codex workflow next. Phase 1's completed foundations are closed; native cutover and hook proofs remain gates on their feature activation in Phases 2 and 4. Mixed-runtime enablement, live installation and public release remain separately gated.

| File | Purpose |
|---|---|
| `product-brief.md` | Intent, constraints and non-goals |
| `design.md` | Behavior, decisions, runtime-neutral flows and failure states |
| `technical.md` | Ports, adapters, wire/storage compatibility, bootstrap and update contracts |
| `progress.md` | Thin phase index |
| `pr-opening.md` | PR groups, acceptance matrix and release gates |
| `code-map.md` | Verified existing integration seams |
| `phases/` | Approved sequence, deliverables and dependency edges |
| `ledger/INDEX.md` | Decisions and implementation constraints |
| `research/` | Dated source and current Codex capability evidence |
| `reviews/` | Independent architecture review and synthesis |

## Relationship to code

This is a design, not a live architecture mirror. Existing behavior is in `skills/spec/`, especially `tools/sessions`, `tools/claims`, `tools/launch`, `tools/crew`, `tools/board` and `tools/trees`. Read the authoring repository's parent `CLAUDE.md` for conventions; on this machine it is `~/IdeaProjects/claude-plugins/CLAUDE.md`. An external worktree has a different parent hierarchy. Phase 1 has local session values, Claude characterization, read-only Codex observations and actual historical-reader fixtures. Production runtime composition remains Claude-only; installed plugins and settings are unchanged.

## Review state

Five independent reviews are synthesized in [dual-runtime boundaries](reviews/2026-11-08-dual-runtime-boundaries.md), with amendments applied. The [architecture constraints](reviews/2026-11-08-architecture-principles.md) and [targeted recheck](reviews/2026-11-08-proof-gates-recheck.md) make the draft ready for Anton to approve phase 1 proof work. No implementation capability is represented as proven.

## Current handoff

Phase 5 is withdrawn (`ledger/decision-native-host-updates-only.md`). Phase 4 includes required native manifest/assets, installation checks live in pr-opening.md, and Phase 6 depends on Phase 4. Implement no updater, freshness helper or release-state coordinator.

Phase 1 is complete under the approved incremental scope. Phase 2 supplies opt-in qualified identity/readers and a read-only shared context entry with exact-source held-phase policy. Context input loading/rendering and placement policy/system I/O are separated. Read `in-flight/phase-2.md` for pending storage and command integration; production ownership composition remains Claude-only. Ownership cutover and positive native hook execution remain unproved activation gates, not completed tests. Custom retention and further isolated-login experiments are deferred. No live installation changed. Use this branch's reviewed plan and preserve historical evidence.
