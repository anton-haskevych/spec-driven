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

**Phase 1 authorized.** After the written spec and independent reviews, Anton approved a new Codex session to execute Phase 1 on 2026-11-08. Its design Gate is recorded in the phase plan. Later phases, mixed-runtime enablement and public release remain gated.

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

Phase 1 remains open. Anton confirmed Claude-style release coexistence: running sessions retain their loaded version; new sessions use the newer installed version. The former blanket quiescent-update question is answered, not an implementation blocker. Read `ledger/decision-plugin-updates-preserve-session-versions.md`, then `in-flight/phase-1.md` for the remaining old-session execution/resource-access and writer-contract/native trust proofs.

Session 3 now proves historical pinned script paths fail under direct native user-shell execution after selected installation, while candidate paths work in a fresh thread. Active-model release attestation remains unproved because the isolated profile has no account/authentication. The concrete retention fork and proposed bounded bundle feasibility proof are in `research/phase-1/2026-11-08-resource-execution-observations.md`; this proposal is not approved or enabled.
