---
needs: [2b]
pr: B
---

# Phase 4 — Complete interactive workflow, reviewers and native hooks

## Outcome

Codex supports the complete interactive spec workflow with canonical personas, project overrides and actual native hook feedback in the supported normal repository. Claude's existing behavior and ordinary-session overhead remain unchanged. This phase precedes normal/background launch automation.

## Files to touch

Canonical skills/spec/SKILL.md and all public mode bindings; native entry/manifest assets introduced in Phase 2; tools/hooks; canonical agents and override resolution; installed-candidate and mode fixtures.

## Deliverables

- [ ] Extend the existing entry to all interactive modes: prep, create, resume, execute, review, update, handoff, status, list and idea; preserve aliases/argument inference, taxonomy, playbooks, phase selection, stop rules and existing approval/ship policy.
- [ ] Apply workflow-parity.md's Session continuity contract to shared mode entry/context: read current handoffs before recommendations or work, include outstanding phase/PR notes and legacy notes, refresh after checkout changes, and require source reads for clipped/omitted content. Canonical review entry after prep/create requires a fresh session; host launch integration remains Phase 3.
- [ ] Exercise runtime-neutral doctor/lessons/graph/ready/gates/playbooks/phase/settings/focus/ship/owner/pr/push/publish-docs through native invocation without rebuilding their implementations. Restore the full managed local handoff/claim-release/cleanup/publication path after Phase 2b acceptance.
- [ ] Bind all seven canonical agents, including the five review personas, debugger and deep-research-analyst; preserve recon/preflight invocation and project overrides. Load canonical instructions explicitly when native roles are unavailable; never overwrite user roles or pass Claude model names to Codex.
- [ ] Translate all native patch paths and reuse existing recall/file-validation for add/update/delete/move/multi-file edits; retain Claude payload/output behavior.
- [ ] Register plugin-owned native hooks once, gated by real spec-session registration, with bounded/deduplicated recall and correct handoff/Stop/parent/subagent identity behavior. Ordinary sessions load no spec context or expensive guard children.
- [ ] Complete source manifest/hook/assets and installed-candidate tests for discovery, native trust/re-review, actual Pre/PostToolUse feedback and invalid-edit correction. Explicit pilot checks remain a fallback, never evidence that automatic hooks work.
- [ ] Add shared interactive mode/override/hook regressions and real-loop acceptance drivers. Keep outstanding launch, babysit and overseer paths explicitly owned by Phases 3 and 3b in ../workflow-parity.md.

## Implementation guidance

Extend Phase 2's bootstrap instead of creating another one. No personal bridge, home path or development checkout is a package dependency. A pinned release means identified candidate/installed assets, not custom retention or another activation selector.

Native hook registration must not duplicate Claude discovery. Missing trust or invocation is an honest pending capability, not a passing hook result. Keep all workflow policy shared. No native hook guarantee is waived to reach parity.

Installed smoke and actual review/loop runs live in ../pr-opening.md. No background-worker capability is a prerequisite for this phase.
