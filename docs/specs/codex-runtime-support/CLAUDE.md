---
created: 2026-11-08T19:10:00-08:00
updated: 2026-11-08T19:10:00-08:00
status: draft
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

**Planning only.** Anton approved the six-phase sequence on 2026-11-08, then explicitly required a written and reviewed spec before any implementation. Sequence approval is not design approval or permission to publish a release.

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

This is a design, not a live architecture mirror. Existing behavior is in `skills/spec/`, especially `tools/sessions`, `tools/claims`, `tools/launch`, `tools/crew`, `tools/board` and `tools/trees`. Read the [parent plugin guide](../../../../CLAUDE.md) for repository conventions. No source code, installed plugin or settings are changed by this spec.

## Review state

Five independent reviews are synthesized in [dual-runtime boundaries](reviews/2026-11-08-dual-runtime-boundaries.md), with amendments applied. The [architecture constraints](reviews/2026-11-08-architecture-principles.md) and [targeted recheck](reviews/2026-11-08-proof-gates-recheck.md) make the draft ready for Anton to approve phase 1 proof work. No implementation capability is represented as proven.
