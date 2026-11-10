# Product brief

## User intent

Anton uses the full spec-driven plugin in Claude Code every day and needs the same workflow in Codex. His original request was to add Codex properly, with shared clean code and durable source-based behavior.

Latest direction: “I want this full claude code workflow with the spec to be fully ported onto codex too” and “claude code experience should stay the same (or improve if you see clear improvements) but not cut any corners or features or regress”.

Prioritize immediate value and incremental improvements: deliver one useful native local cycle early, use it to finish the port, and retain the complete final scope. Change delivery order, not the definition of success.

## Outcome

The same plugin source/release supports Claude Code and Codex for every existing public mode and surrounding daily workflow. See workflow-parity.md for the complete inventory and phase ownership. Existing specs, decisions, claims, review personas, overrides and handoffs remain usable in place.

## Compatibility baseline

Published 2.51.0 at 22e7ec7 was the verified 2026-11-08 starting point. Claude's existing command, launch, crew, claim, hook and approval behavior is the regression baseline. Reuse it; clear shared improvements require focused evidence and may not remove features.

Two earlier Codex cache edits are migration artifacts, not the implementation. The port belongs in this plugin's authored source, not CRM or a personal bridge. Existing Phase 1 and Phase 2 foundations are retained.

## Delivery

1. Phase 2: source-packaged native entry and a real local execute → handoff → fresh pickup in an exclusive isolated clone. Explicit temporary restrictions prevent legacy automation/shared-state hazards.
2. Phases 2b and 4: shared claims/board/worktrees, full interactive modes, canonical reviewers and actual native hooks.
3. Phase 3: normal launches, next sessions, spin-offs and interactive PR babysitting.
4. Phase 3b: owned background workers, unattended babysitting and overseer.
5. Phase 6: close the complete parity inventory and consolidate release/CI enforcement.

Every delivery includes tests and native evidence for what it enables plus Claude regressions. A pilot cannot close the full port.

## In scope

All 12 public modes, all 21 agent-operated command families and cross-mode behavior in workflow-parity.md; source-qualified ownership and liveness; normal/background sessions; canonical agents and project overrides; scoped native hooks; native packaging; existing install/update/release flow; compatible state transition; behavior/native acceptance and CI.

## Out of scope

Unrelated harness cleanup; competing workflow copies; changing owner/ship/approval policy; removing Claude features; replacing the crew scheduler; a generic agent framework; native database/transcript spelunking; copied credentials; clone/profile managers; custom installers/updaters/freshness coordination; uninterrupted old-session resource retention. Native updates use fresh-session recovery.

## Supported environments and safety

Start with one proved installed local Codex configuration, preserve every existing Claude-supported host, and qualify claims/control by execution source. Expand CLI/desktop coverage with evidence as the port proceeds. Additional homes, daemons, no-daemon, remote/cloud configurations must be explicitly supported or reported as outside tested coverage, never silently empty. They do not justify dropping a required workflow feature in the supported configuration.

Before shared writes, preserve the actual old-reader compatibility gate. Before native hooks or workers activate, prove their native trust/lifecycle contracts. An exclusive separate-clone pilot avoids those shared mutation paths while they are built; a sibling worktree alone does not.

## Success

Every workflow-parity.md row passes on the supported Codex environment and existing Claude behavior remains intact. The first useful cycle arrives before background automation. All runtime behavior survives native reinstall because it ships in source. Live/unknown work cannot be stolen, pruned or controlled, and unsupported capabilities are reported honestly.
