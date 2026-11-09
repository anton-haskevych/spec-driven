# Phase 1 — in-flight state and next-session boot

**Session ended:** 2026-11-08 (session 2)
**Active phase:** 1 — Runtime contracts and Claude compatibility baseline
**Stop reason:** Three completed chunks and a demonstrated native cache-retention failure. Phase 1 is parked on the design question below; Phase 2 is not ready.

## Assignment and approval

Reuse `/Users/antonhaskevych/claude-worktrees/spec-driven/codex-runtime-support-pr-a`, branch `feat/codex-runtime-support-pr-a`. Anton approved the reviewed Phase 1 proof work; its original design Gate stays ticked. Do not re-ask that approval. The new retention/cutover design question is a separate unresolved fork; do not treat the original approval as its answer. No second worktree, live install changes, Phase 2, push, PR, merge or release.

## Where things stand

- Session 2 local commits: `6af0e17` shared bounded probe RPC/events with read-only facade preserved; `9f71f28` actual owned lifecycle proof/fixtures; `d6ca4ed` isolated native cache eviction/trust observations and parked activation. Handoff metadata follows separately. Session 1 completed baseline/read-only/historical-reader work; do not redo it.
- Lifecycle deliverable is checked for the bounded configured-source 0.167.0/Bun 1.4.4 proof. Real owned disconnect/reconnect and user-input attention passed. Foreground interrupt removed the controlled descendants; yielded exec retained them after interrupted status, then exact native terminal termination removed all three. Request ID zero and matching resolution were observed. All nine finite fixture PIDs were absent before verified archive. No fallback PID kill or detached worker runner was introduced.
- Isolated native installation used the complete actual historical 22e7ec7 package, a loopback Git marketplace and disposable CODEX_HOME. Scoped marketplace upgrade and selected-plugin add worked without copied auth. Materialized localVersion/catalog moved to a labelled fixture candidate. The old version cache was removed while its original client still held an already-started thread with the old hook list. The fresh thread loaded the candidate hook as enabled but untrusted.
- **Do not overstate that failure:** no active model turn ran in the isolated home. Running model release attestation and native CLI/desktop resume fencing are still unverified. Empty thread/read(includeTurns) returned -32601; successful loaded-hook observations and archive acknowledgements are the actual thread evidence. This falsifies assuming native retention for all started threads, not a claim of a live user incident.
- Two deliverables remain unchecked: complete managed old-version cutover, and complete native activation/retention/loaded-release/hook-trust proof. Automatic activation and all other managed features remain disabled. Production claims/board/tree/crew/launch composition remains Claude-only.

## Current validation

Bun 1.4.4: affected runtime slice **35 pass, 0 fail across 8 files**; canonical `bun run typecheck`, `bun check` (452 files), authored version consistency (2.51.0), spec doctor and diff whitespace checks passed. Do not relabel the prior session's 1399-test full-suite result as a session-2 run. New reusable transport/evidence tests were red before implementation/fixtures; native throwaway probes are separate operational observations. No default test accesses native home or starts a worker.

## Required startup and context

1. Confirm cwd/branch/status. Read `~/.claude/CLAUDE.md`, `/Users/antonhaskevych/IdeaProjects/claude-plugins/CLAUDE.md` and applicable repository/subsystem rules; this external worktree has no root CLAUDE.md or .claude/rules directory. This is the plugin repo, not CRM.
2. Use this branch's `skills/spec/SKILL.md`, `execute.md`, `principles.md`. Run doctor/context here. **Honor the parked question first.** Record Anton's actual answer with phase unpark before further implementation; absent an answer, hand off untouched. Installed caches are not this branch's workflow truth.
3. Load spec stable references, Phase 1 plan, code-map/ledger INDEX, applicable ledger entries and all three reviews. Read dated Phase 1 contracts/Bun/read-only/old-reader notes as needed; new primary notes are `2026-11-08-owned-lifecycle-{recon,preflight,observations}.md` and `2026-11-08-isolated-install-{recon,preflight,observations}.md` in `research/phase-1/`.
4. Read new ledgers `gotcha-native-interrupt-needs-terminal-cleanup.md` and `gotcha-native-install-evicts-previous-cache.md`. Recon/preflight/TDD still apply before the next bounded unit. No next-phase context is prepared by this handoff.

## Native identity and launch

Session 2 thread `01a1be5d-e805-7d12-b1b6-1a533f5c8fdf`, implementation turn `01a1be5d-e903-7232-8cca-5650a4bb62f7`: independently native-read with matching assigned cwd and inProgress turn. Source controller `01a1be10-2c87-7511-ac8e-3309a8dbe079` used create_thread from this worktree; inherited cwd was correct. The tool has no cwd override, so a controller in another checkout must use an explicit-cwd launch route instead. This correction and the IDs are in the existing launch ledger.

Placement returned this existing tree; claim take honestly returned `claim: no session id; not claimed`. The authored 2.51.0 claim command is Claude-only. Never fabricate CLAUDE_CODE_SESSION_ID, edit shared claims or start Phase 2 to bypass that limitation. The approved spec snapshot is already on this branch, not old origin/main metadata.

## Scratch cleanup and limits

Owned lifecycle thread `01a1be62-c39d-70f2-8613-35757e58e354` is verified archived with history retained; its four owned turns and cleanup observations are in executable fixtures. Approval-enabled environments, daemon restart, detached/self-daemonizing children and real crew close-out remain unverified. Native plan-mode input reused the observed configured model/effort and unchanged permissions.

Isolated empty metadata threads `01a1be6f-c592-7101-aa1a-cbb8fcf0755e` and `01a1be70-ca46-7b90-8eaf-407beea65960` were archived successfully. Exact owned standalone app-server/HTTP PIDs 26719/26553 are stopped; no server/watch/background shell remains. Scratch artifacts (no credentials) remain at `/tmp/codex-runtime-phase1-session2/` and `/var/folders/4m/6k_8m_6d6fl_3crcj4zl19pr0000gn/T/codex-phase1-install-gfuuxyva/`; they are experiments, not production registries. The second candidate preparation never succeeded; only fixture phase1.1 was installed. See the observation note for the overwritten temporary journal field and other intermediate errors.

No main checkout, live cache/install, personal bridge/global hooks/settings or CRM changed. No push/publication occurred. Handoff skips broad tree pruning because this assignment is confined to this worktree and the old reader does not establish mixed-source safety.

## Pick up after the answer

Apply the reviewed retention decision to the design/technical requirements before new implementation. Recommended direction is staged freshness while any managed session uses the old release, with native activation only after a verified quiescent cutover; preserve native authority rather than patching old cache paths. This is a recommendation, not a recorded decision.

Continue the two remaining Phase 1 proof obligations in an authorized isolated environment: native supported CLI/desktop old-session reentry fencing, active loaded-release identity, positive hook trust/re-review and safe rollback. Authentication/trust and desktop isolation need real supported native flows; do not copy auth, bypass trust or touch the live desktop to force a green result. Do not repeat the completed lifecycle variants or historical-reader hazards. Do not select/update a coordinator, enable mixed writers or enter Phase 2 before Phase 1 is actually complete and outward gates are honored.

## Needs you
- Parked 2026-11-08T19:58:38-08:00: Native 0.167.0 selected-plugin install evicted the previous cache with a started thread still held. Approve changing updates to stage while managed spec sessions use the old release, then activate only after a verified quiescent native cutover, with CLI/desktop reentry and trust proofs still required? · recommend: Yes: stage while old managed spec sessions remain; activate only after verified quiescence. Preserve native installation authority; do not patch caches or enable automatic activation before the remaining proofs.
