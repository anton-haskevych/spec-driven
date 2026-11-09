# Phase 1 — in-flight state and next-session boot

**Session ended:** 2026-11-08 (controller handoff after implementation session 2)
**Active phase:** 1 — Runtime contracts and Claude compatibility baseline
**Stop reason:** Anton requested a clean controller handoff after clarifying update behavior. The earlier parked product question is answered. Phase 1 remains incomplete; Phase 2 is not ready.

## Assignment and approval

Reuse `/Users/antonhaskevych/claude-worktrees/spec-driven/codex-runtime-support-pr-a`, branch `feat/codex-runtime-support-pr-a`. This branch's committed spec/code is the operational truth; the planning copy in the main source checkout may be older. No second worktree is needed.

Anton approved the reviewed Phase 1 proof work and its original design Gate is ticked. He has now also confirmed the update experience below. Do not ask those approvals again. This handoff does not authorize Phase 2, live installation/profile changes, pushing, PR publication, merge or release. Local tested work/commits and controlled Phase 1 proofs remain the scope.

## Decision resolved in the controller conversation

**Read `ledger/decision-plugin-updates-preserve-session-versions.md` first.**

- Running sessions retain the plugin version they loaded. After a newer compatible release is installed, new sessions use that installed release while older sessions remain open.
- Spawning a new session is distinct from checking/fetching/installing the latest published release.
- Anton did not adopt the earlier blanket wait-for-all-old-sessions / quiescent-update recommendation. The parked product question was answered with `phase unpark`; preserve its historical question/answer below.
- Claude's documented version-selection behavior supports this target. It does not prove Codex's old-session script/resource availability after cache eviction.
- Do not conflate compatible plugin release coexistence with the separate initial incompatible writer-contract transition: 2.51.0 readers cannot see Codex claims. That rollout fence still needs proof.

The controller changed documentation and phase-answer metadata only. No runtime code, native installs, model/approval settings or feature gates were changed. Existing conservative implementation checks/fixtures are not automatically green just because the desired behavior is now settled.

## Implementation already completed — do not repeat

- Session 1: `3f831db` Claude baseline/session values, `1a9cbab` bounded read-only Codex proof, `b33e296` actual 2.51.0 reader hazards; handoff `90e01c8`.
- Session 2: `6af0e17` shared bounded RPC/events with read-only facade, `9f71f28` owned native lifecycle proof/fixtures, `d6ca4ed` isolated native cache eviction/trust observations; handoff `7edf200`.
- Production claims/board/tree/crew/launch composition stays Claude-only. No managed Codex writer, crew or update feature has been enabled.
- Bun 1.4.4 native Unix WebSocket read probe allowlists read methods, validates exact CLI/app-server 0.167.0, bounds time/pages/IDs, preserves partial observations with unavailable coverage and correlates own ID/cwd. Other environments refuse explicitly.
- Actual historical 22e7ec7 claim/held/occupancy/prune modules/provenance are frozen in fixtures. They show old-reader takeover/release hazards and pruning with no recognized claim; readable closed claims still protect pending trees. This does not prove supported native old-version reentry fencing.
- Bounded owned lifecycle proof passed disconnect/reconnect and real blocking input attention (including request ID zero). Foreground interrupt removed marked descendants. Yielded exec retained them until exact native terminal termination, which removed the controlled parent/child/grandchild. Nine finite fixture PIDs were absent before verified archive. No fallback PID kill or detached worker runner was added.
- Isolated install used the actual historical package, loopback Git marketplace and disposable CODEX_HOME. Scoped marketplace refresh/selected install and fresh catalog/materialized version worked without copied auth. A started old thread retained old hook metadata; fresh candidate thread saw enabled but untrusted new hooks. Native install removed the old version cache.

## Evidence limits and validation

The isolated install ran **no active model turn across the update**. Its cache eviction is not proof that running old-session execution broke or survived. Empty-thread `thread/read(includeTurns)` returned -32601; successful old/new loaded-hook observations and archive acknowledgements are the actual evidence. Native CLI/desktop resume fencing, actual per-turn loaded-release/resource access, positive hook trust/re-review and safe rollback are unproved.

Session 1 validation: 1,399 full-suite tests passed across 180 files. Session 2 validation: 35 affected runtime tests passed across 8 files, canonical tsc, Bun check (452 files), version consistency (2.51.0), spec doctor and diff checks. Do not report either as a full-suite run from this documentation-only controller handoff. Controller validation is recorded in the handoff commit: spec doctor, graph/readiness, Markdown/whitespace and documentation-only diff checks.

## Exact next step

Continue the two unchecked Phase 1 obligations, starting with a bounded isolated proof of **old loaded-session execution/resource access during native plugin update while a fresh session selects the new install**.

1. Read the decision ledger and isolated-install notes. Define what the old session actually needs on disk, how its loaded release is attested, and how to distinguish harmless old-path eviction from actual execution breakage. Verify real old-session script/tool execution, not only a catalog listing, manifest string or loaded hook metadata.
2. Use supported native flows in an authorized isolated environment; preserve live installs and credentials. If authenticated execution, desktop isolation or native trust cannot be obtained safely, report the exact missing capability rather than copying auth, bypassing trust or pretending an empty thread is a running-model proof.
3. Separately finish the initial writer-contract/old-session native reentry proof, positive hook trust/re-review and compatible rollback evidence. Reuse scoped plugin-publish/native install verification; never blanket marketplace sync.
4. If actual proof demonstrates a necessary-resource failure, present that concrete design fork and the smallest supported solution. Do not silently restore the blanket wait-for-all-old-sessions rule or patch caches/create a second activation authority.
5. Do scoped recon/preflight/TDD before code, preserve the existing successful proofs, and tick only proof actually achieved. Do not enter Phase 2 until Phase 1 is genuinely complete. Handoff at the workflow stop boundary.

## Startup read set

Read `~/.claude/CLAUDE.md` and `/Users/antonhaskevych/IdeaProjects/claude-plugins/CLAUDE.md`; this external worktree has no root CLAUDE.md or .claude/rules. Use the branch's `skills/spec/SKILL.md`, `execute.md`, `principles.md` for `execute codex-runtime-support phase 1`. Installed caches are not the branch's workflow truth.

Load spec CLAUDE/product-brief/design/technical/progress/phase-1/code-map/ledger INDEX and the three review snapshots. Key evidence is under `research/phase-1/`: contracts recon/preflight, Bun 1.4.4 toolchain, read-only probe, old-reader observations, owned-lifecycle recon/preflight/observations, isolated-install recon/preflight/observations. Keep dated observation limits intact. New decision supersedes the prior recommendation in dated research; do not rewrite immutable research/reviews to hide that history.

## Native identity, ownership and environment

- Session 1 thread: `01a1be43-b195-7342-ae88-f22eb84ae7a5`.
- Session 2 thread: `01a1be5d-e805-7d12-b1b6-1a533f5c8fdf`; turn `01a1be5d-e903-7232-8cca-5650a4bb62f7`. Both handed off; no active implementation session is assigned by this controller handoff.
- This controller is already in the correct worktree. Native `create_thread` inherits it and can be used when Anton explicitly requests the next fresh session. In another cwd, an explicit-cwd route is needed. Use the existing launch ledger and this current boot file; no new worktree/spec snapshot is needed.
- Placement previously returned this tree. 2.51.0 claim take returned `claim: no session id; not claimed`. Never invent CLAUDE_CODE_SESSION_ID, fake sessions or change shared claims to bypass the boot limitation. Preserve the explicit isolated assignment.
- All owned scratch lifecycle/metadata threads were archived; their IDs and exact server cleanup evidence are in the observation notes. No server/watch/background shell was left by those experiments. Scratch artifacts without copied credentials remain under `/tmp/codex-runtime-phase1-session2/` and the isolated-install temporary root named in research; they are not production registries.
- Approval-enabled native behavior, daemon restart, detached/self-daemonizing child cleanup and broader host modes remain unverified. This controller handoff started no scratch process or native session.
- No live cache/install, personal bridge/global hooks/settings, main checkout or CRM edits. No push/PR/publication. Skip broad tree pruning: this assignment is confined to this worktree and the old reader does not establish mixed-source safety.

## Needs you
- Parked 2026-11-08T19:58:38-08:00: Native 0.167.0 selected-plugin install evicted the previous cache with a started thread still held. Approve changing updates to stage while managed spec sessions use the old release, then activate only after a verified quiescent native cutover, with CLI/desktop reentry and trust proofs still required? · recommend: Yes: stage while old managed spec sessions remain; activate only after verified quiescence. Preserve native installation authority; do not patch caches or enable automatic activation before the remaining proofs.
  - Answered 2026-11-08T20:18:42-08:00: Anton confirmed the Claude-style version-selection requirement on 2026-11-08: running sessions keep their loaded plugin version; new sessions use the latest installed version. Do not adopt a blanket wait-for-all-old-sessions/quiescent-update policy. Continue proving old-session script/resource access across native updates; this is a proof gap, not another request to approve that product behavior. Mixed incompatible writer-contract cutover and live installation/publication remain separately gated.
