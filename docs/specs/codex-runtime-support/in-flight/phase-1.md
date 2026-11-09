# Phase 1 — session boot

## Assignment

Execute `codex-runtime-support`, Phase 1 only, in this checkout on `feat/codex-runtime-support-pr-a`. Anton approved the reviewed spec and asked for a separate implementation session in its proper worktree. The phase's design Gate is ticked with that evidence. Do not ask for that approval again.

## Required startup

1. Confirm cwd, branch and git status. This is the spec-driven plugin repository, not CRM. Read the authoring guide at `/Users/antonhaskevych/IdeaProjects/claude-plugins/CLAUDE.md`; the external worktree has a different parent hierarchy.
2. Read this worktree's `skills/spec/SKILL.md` and `execute.md` with arguments `execute codex-runtime-support phase 1`; use the branch's canonical workflow files rather than treating the installed cache as the branch's truth. Also read `skills/spec/principles.md`.
3. Load `docs/specs/codex-runtime-support/CLAUDE.md`, product-brief, design, technical, progress, phase-1 plan, code-map and ledger/INDEX, then the applicable ledger entries, dated research and all three reviews. Source evidence contains explicit unproven capabilities; do not promote them to facts.
4. Run spec doctor/context commands from this worktree. Do phase-seam recon, phase-preflight, then bounded TDD units as execute requires. This new session is the one requested by Anton, not a subagent of the earlier planning conversation.

## Scope and stopping rule

Phase 1 ships the runtime contracts, Claude behavior baseline and controlled Codex capability evidence. Stop and hand off at a clean chunk boundary; do not roll into Phase 2, enable mixed-runtime writers/background crews/automatic updates, change live installations, or publish/merge a release. A failed critical capability probe must park the unresolved design fork, not trigger an improvised fallback. Preserve Claude's working behavior.

## Current integration limitations

- Plugin 2.51.0 only reads CLAUDE_CODE_SESSION_ID. Codex exports CODEX_THREAD_ID. A `claim: no session id; not claimed` result is NOT success: record it and use this explicitly assigned isolated worktree; never invent a Claude ID or write a fake native session. Do not alter existing shared claim records as a boot workaround.
- The new spec is not on origin/main yet. Its reviewed snapshot was explicitly transferred to this PR A branch. Do not create a second worktree merely because old mainline metadata does not know this spec.
- Use this worktree for implementation. Do not edit the main source checkout, old plugin caches, personal bridges, global hooks/settings, or unrelated CRM changes.
- The parent has not authorized pushing, opening/publishing a PR, merge or release as part of session launch. Local tested commits are appropriate; retain outward gates for explicit approval even if an older generic workflow says to auto-push.

## Readiness

The planning session verified the phase graph, spec doctor and Markdown links. No implementation exists yet. Run fresh targeted checks appropriate to your changes. The ledger's Codex launch entry records the native launch method and eventual session metadata. Update this in-flight file at handoff.
