# Phase 1 — current scope and pending work

**Active phase:** 1 — Runtime contracts and Claude compatibility baseline, 5/7 complete.
**Latest steering:** Anton stopped the update-retention investigation: “This is an edge case. We should not spend too much time on it.”

## Scope now

- Read `ledger/decision-use-native-updates.md`. Use native scoped install/update behavior and fresh-session recovery. Seamless old-session continuity is deferred.
- Do not build per-session resource copies, a retention subsystem or an external retention bootstrap. Do not launch further agents/probes or request isolated sign-in for that edge case. The proposed two-agent follow-up never started before Anton stopped it.
- Keep the existing resource-failure evidence/tests; do not turn deferred or unverified proof into a pass. The old bundle feasibility question is superseded by this scope decision.
- Continue prioritizing the core workflow, session ownership and scoped hooks. Native incompatible-writer reentry safety and activation/version/trust evidence remain open. Phase 2 is not ready; no production capability is enabled.

## Current tree and authorization

Reuse `/Users/antonhaskevych/claude-worktrees/spec-driven/codex-runtime-support-pr-a`, branch `feat/codex-runtime-support-pr-a`. Existing code/proof commits remain intact, including `151a2c0` and `28dd984`. No live claim is held here; the 2.51.0 tool cannot identify the Codex session, and no synthetic Claude identity was created.

Local tested work/commits and controlled Phase 1 proofs remain the scope. No live installation/profile changes, copied auth, trust bypass, push, PR, merge or release. No broad tree pruning. All earlier owned scratch threads/servers were archived/stopped; no new server, login or probing agent was started for the withdrawn follow-up.

## Next work

Resume the remaining native writer-contract/ownership and core activation/trust obligations from Phase 1. Read the branch workflow and scoped proof notes. The resource-retention feasibility proposal in the immutable observations is historical and is not the next task.

Prior validation: 39 focused runtime tests, canonical tsc, Bun check, version consistency and spec doctor passed. This scope reduction changes documentation only; do not claim a new code test run.

## Needs you` before implementing that mechanism. The alternative is to require a supported native retention capability/fix and leave activation disabled. A general sign-in request or a metadata-only test does not resolve this resource-design fork.

After the choice: scoped recon/preflight/TDD for its actual seam, then positive authenticated old/new execution and supported trusted-hook entry, native resume/writer-contract fence and rollback proofs. Use existing scoped plugin-publish refresh/selected install prior art. Never tick proof not actually achieved or enter Phase 2 early.

## Startup read set and environment

Read `~/.claude/CLAUDE.md` and `/Users/antonhaskevych/IdeaProjects/claude-plugins/CLAUDE.md`; this external tree has no root CLAUDE.md/.claude/rules. Use branch `skills/spec/SKILL.md`, `execute.md`, `principles.md`, spec design/technical/Phase 1 and scoped ledger/code map. New immutable recon, preflight and observations use slug `resource-execution` under `research/phase-1/`. Earlier immutable evidence remains historical; never rewrite it to hide superseded recommendations.

The 2.51.0 placement returned this existing tree. Claim take again returned `claim: no session id; not claimed`; no synthetic Claude session ID or shared claim was created. Claim listing showed no live holder here. No claim is held by this session.

Session-3 owned proof IDs: old `01a1bea0-85c2-78f0-9a78-9060954dcd15`, fresh `01a1bea2-17d6-71e1-919d-c2f30eb88701`; both archived. Raw scratch root: `/var/folders/4m/6k_8m_6d6fl_3crcj4zl19pr0000gn/T/codex-phase1-execution-lp5dbgsz`; controller/location under `/tmp/codex-runtime-phase1-session3/`. Preserve historical single-writer journal; do not reuse its already-upgraded home as a pristine historical install. Committed sanitized controller/observations/source are under `tests/fixtures/codex-resource-execution/`.

## Validation

Current session: 39 runtime tests across 9 files pass, including four new observation tests; canonical tsc passes; Bun check passes 453 files; version consistency is 2.51.0; spec doctor and diff checks pass. No full suite run is claimed. The new tests ran red on missing evidence, then green on actual native observations. All new non-data files are below 250 lines; test callbacks/controller functions below 50. No live/native operation runs in default tests.

## Needs you
- Parked 2026-11-08T19:58:38-08:00: Native 0.167.0 selected-plugin install evicted the previous cache with a started thread still held. Approve changing updates to stage while managed spec sessions use the old release, then activate only after a verified quiescent native cutover, with CLI/desktop reentry and trust proofs still required? · recommend: Yes: stage while old managed spec sessions remain; activate only after verified quiescence. Preserve native installation authority; do not patch caches or enable automatic activation before the remaining proofs.
  - Answered 2026-11-08T20:18:42-08:00: Anton confirmed the Claude-style version-selection requirement on 2026-11-08: running sessions keep their loaded plugin version; new sessions use the latest installed version. Do not adopt a blanket wait-for-all-old-sessions/quiescent-update policy. Continue proving old-session script/resource access across native updates; this is a proof gap, not another request to approve that product behavior. Mixed incompatible writer-contract cutover and live installation/publication remain separately gated.
- Parked 2026-11-08T20:53:28-08:00: Approve the bounded immutable per-release resource-bundle feasibility proof in resource-execution-observations, preserving native version selection and requiring supported trusted-hook binding plus authenticated old/new execution before enablement? · recommend: Yes: prove this mechanism only in isolation; native installation remains the version selector. Do not implement or enable production retention until data lifetime, loaded-release binding and old hook entry/trust pass. If no supported hook route exists, report the host limitation rather than patch caches or restore a blanket wait policy.
  - Answered 2026-11-08T23:21:10-08:00: Anton stopped this edge-case investigation: "This is an edge case. We should not spend too much time on it." Defer seamless old-session updates and custom retention; use native updates with fresh-session recovery. Do not start the two proposed probes or isolated sign-in for that guarantee. Core ownership and native trust requirements remain.
