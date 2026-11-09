# Product brief

## User intent

Anton: “Spec driven plugin is the biggest core daily workflow and this has to always be up to date and work perfectly.” He then required: “Before you do that fix, please spec it out correctly … Claude code is working fine, we need to add codex … properly integrated in a clean code manner, aligned with the best practices and no tech debt.”

## Outcome

The same current plugin release supports Claude Code and Codex without disposable cache patches, competing copies of workflow policy, manual maintenance commands, or weakened ownership and worktree protections. Existing specs, decisions, claims, review personas and handoffs remain usable.

## Compatibility baseline

- Published `main`, authored source and pre-existing installations are 2.51.0 at `22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc`, checked against remote HEAD on 2026-11-08.
- Claude Code's normal session launch, background crew, claims, lesson recall, spec validation and four-command loop already work. Preserve their observable contracts.
- Two earlier Codex cache edits only changed normal launch and late background refusal. They are migration artifacts, not an acceptable long-term implementation.
- The new implementation belongs in `~/IdeaProjects/claude-plugins/spec-driven`, not the CRM application or a personal Python bridge.

## In scope

Delivery priority: one usable Codex execute → handoff flow, developed incrementally. Phase-specific safety acceptance gates feature activation rather than all adapter development (`ledger/decision-deliver-value-incrementally.md`).

Explicit runtime composition; namespaced session identity; mixed-runtime liveness and claims; normal and background sessions; scoped hooks; canonical reviewer personas; clean-install packaging; freshness checks, staged activation and rollback; behavioral compatibility tests and CI release gates.

## Out of scope

Other harness cleanup, deduplicating unrelated skills, rewriting the spec workflow, changing ownership/ship/approval policy, changing Claude's defaults, replacing the crew scheduler, creating a generic third-party agent framework, reading/writing native databases or undocumented Codex transcripts, copying credentials, automatically publishing this change, or custom resource retention to keep old sessions uninterrupted across native updates. Use fresh-session recovery for that update edge case (`ledger/decision-use-native-updates.md`).

## Supported environments

Target the installed Codex local CLI and desktop execution environments after capability probes establish their session coverage and transport. Preserve the plugin's current Claude-supported hosts. Remote/cloud, alternate Codex homes, multiple daemons and no-daemon CLI sessions must be detected and either supported with evidence or reported explicitly as unsupported; they may never masquerade as an empty live-session list. Record the supported CLI/API range in the release. Do not silently promise every Codex surface.

## Success

Both runtimes pass the same workflow-policy contract suite. Mixed Claude/Codex use cannot steal a live or unknown claim or prune occupied work. Native Codex bootstrap, hooks, review and worker lifecycle have executable acceptance evidence. The native install/update flow selects a validated release for fresh sessions, reports failures honestly and provides fresh-session recovery when an older session's helper paths become unavailable. Seamless old-session continuity is not a release gate.
