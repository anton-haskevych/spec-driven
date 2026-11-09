---
needs: [3]
pr: B
---

# Phase 4 — Skill bootstrap, reviewer binding and scoped hooks

## Outcome

Codex's four-command loop loads the same workflows and personas and receives real native hook feedback without relying on Claude interpolation.

## Files to touch

Canonical `skills/spec/SKILL.md`, mode bindings, plugin-owned host entrypoints, `tools/hooks/`, native plugin hook manifest; clean-session skill/reviewer/hook fixtures.

## Deliverables

- [ ] Add explicit Codex bootstrap that pins the loaded release, registers spec-session identity and invokes existing taxonomy/playbook/context commands with the actual user request.
- [ ] Bind all five canonical review personas on Codex and preserve project overrides. Use explicit persona loading where native custom-role discovery is unavailable; never overwrite user roles.
- [ ] Add plugin-owned Codex patch path translation and reuse recall/file-validation logic across add/update/delete/move/multi-file edits; preserve Claude hook behavior.
- [ ] Add scoped native hook wiring with per-session lifecycle and bounded/deduplicated recall; outside spec sessions it emits no spec context or expensive child guards.
- [ ] Prove fresh-session bootstrap, reviewer loading and actual native Pre/PostToolUse invocation, including invalid spec feedback after an edit. Function-only tests do not satisfy this deliverable.

## Implementation guidance

Native manifests must not cause duplicate Claude hook registration. Resolve plugin assets through native root variables. Handoff/Stop semantics and parent/subagent session IDs are explicit. Keep policy shared; host wrappers contain only binding/bootstrap. Hook activation/trust failures produce honest capability status.
