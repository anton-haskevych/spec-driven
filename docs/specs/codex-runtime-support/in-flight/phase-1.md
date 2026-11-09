# Phase 1 — in-flight state and next-session boot

**Session ended:** 2026-11-08T20:53:28-08:00
**Active phase:** 1 — Runtime contracts and Claude compatibility baseline
**Stop reason:** Concrete historical-path execution failure is preserved in a green local commit; the retention feasibility choice below is pending. Phase 1 remains 5/7, and Phase 2 is not ready.

## Assignment and approval

Reuse `/Users/antonhaskevych/claude-worktrees/spec-driven/codex-runtime-support-pr-a`, branch `feat/codex-runtime-support-pr-a`. This branch's committed code/spec is operational truth; main's planning copy may be older. No second tree is needed.

Anton approved Phase 1 controlled proof work and the original design Gate. His update decision is settled: running sessions retain their loaded version and fresh sessions use the newer installed release; do not ask that product question again or restore the rejected blanket wait-for-all policy. Read `ledger/decision-plugin-updates-preserve-session-versions.md` first.

Local tested work/commits and controlled isolated Phase 1 proofs remain authorized. No Phase 2, live installation/profile change, credential copying, trust bypass, push, PR publication, merge or release is authorized. Do not run broad tree pruning. A proposed resource bundle is not approved by this handoff.

## Where things stand

- New proof commit: `151a2c0` — six actual native `thread/shellCommand` executions across a version-only isolated selected install.
- Historical version checker and `spec.ts settings` exited 0 before the update. Their identical paths then failed in the same owned thread: Python exit 2/missing file and Bun exit 1/missing module. Fresh candidate paths exited 0.
- Native source is userShell with null pluginId/scriptPath; the controller supplied the pinned paths. This is deferred-resource execution evidence, not model-selected or native loaded-release attestation.
- Isolated `account/read` without refresh returned no account and authentication required. No model turn was started. The exact missing capability for active-model proof is supported sign-in within the isolated native profile; no auth may be copied from live sessions.
- Candidate `2.51.0-phase1.2` changed only three version declarations in a disposable actual historical package. Authored/live versions remain 2.51.0; production runtime remains Claude-only and all managed Codex features remain unverified.
- Both owned threads were archived after six completed shell turns and empty native terminal lists. Both owned HTTP/native servers were independently verified absent; controller sessions exited. No experiment server or background shell remains.
- Earlier completed Claude, read-only, historical-reader and owned-lifecycle proofs remain unchanged. Both remaining Phase 1 deliverables stay unchecked; positive hook trust/re-review, CLI/desktop old-writer reentry, compatible rollback and active-model loaded-release access remain unproved.

## Exact next step

Read `research/phase-1/2026-11-08-resource-execution-observations.md`, especially its concrete retention fork. Recommended proof: evaluate an immutable owner-tracked execution bundle for the release actually selected natively, created at explicit entry before eviction. It is a proposal, not an accepted mechanism. Native plugin data is only a candidate location; its retention/binding is not proved. Old bundled hook commands still point to evicted PLUGIN_ROOT, so script copies alone are insufficient. Preserve native version selection, trust review and the chosen coexistence behavior; do not add a competing activation pointer, patch caches or personal global hooks.

Resolve the new question under `## Needs you` before implementing that mechanism. The alternative is to require a supported native retention capability/fix and leave activation disabled. A general sign-in request or a metadata-only test does not resolve this resource-design fork.

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
