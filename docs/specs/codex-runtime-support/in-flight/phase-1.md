# Phase 1 — in-flight state and next-session boot

**Session ended:** 2026-11-08
**Active phase:** 1 — Runtime contracts and Claude compatibility baseline
**Stop reason:** Three completed chunks; execute.md §8 requires a fresh session. Phase 1 is not complete and Phase 2 is not ready.

## Assignment and approval

Continue `codex-runtime-support`, Phase 1 only, in `/Users/antonhaskevych/claude-worktrees/spec-driven/codex-runtime-support-pr-a` on `feat/codex-runtime-support-pr-a`. Anton approved the reviewed spec and this isolated implementation session; the design Gate is ticked. Do not ask for that approval again. All work stays in this assigned worktree.

## Where things stand

- Three green local implementation commits: `3f831db` (Claude baseline/session values), `1a9cbab` (bounded read-only Codex proof), `b33e296` (actual 2.51.0 reader hazards). Handoff metadata follows in its own local commit.
- Production claims/board/tree/crew/launch wiring remains Claude-only. The existing Claude reader only re-exports shared status/name types; no native writer, worker or update feature is enabled.
- The explicit read-only probe uses native Bun Unix WebSocket, allowlists only thread loaded-list/read, validates exact CLI/app-server 0.167.0, bounds time/pages/IDs, preserves partial rows with unavailable coverage and correlates the current ID/cwd. Other environment modes refuse. Current configured-source access is observed, not general support.
- Actual 22e7ec7 claim/held/occupancy/prune modules are frozen with reversible import relocation and original SHA-256 hashes. Hazard tests prove unsafe old takeover/release and pruning when no recognized claim exists; readable closed claims still protect pending trees. Native cutover is not proved.
- Validation: full suite **1399 pass, 0 fail across 180 files** on Bun 1.4.4; canonical `bun run typecheck`, local `bun check`, version consistency (2.51.0), spec doctor and diff whitespace checks passed. Live probe observed 3 loaded sessions on the configured source and matched this implementation thread/cwd. No unrelated conversation text retained.
- No critical native capability failure was established, so no design fork is parked merely for unfinished proof. Three Phase 1 deliverables remain unchecked: owned scratch lifecycle; complete managed old-version cutover; native activation/retention/loaded-version/hook trust.

## Required startup and context

1. Confirm cwd/branch/status. This is the plugin repo, not CRM. Read `~/.claude/CLAUDE.md`, `/Users/antonhaskevych/IdeaProjects/claude-plugins/CLAUDE.md` and applicable repository/subsystem guidance. The external worktree has a different parent hierarchy.
2. Read this branch's `skills/spec/SKILL.md`, `execute.md`, `principles.md` for `execute codex-runtime-support phase 1`; installed caches are not the branch's truth. Run doctor/context from this worktree, then scoped recon/preflight before the next TDD units.
3. Load spec CLAUDE/product-brief/design/technical/progress/phase-1/code-map/ledger INDEX, applicable ledger entries and all three reviews. Read dated source/capability research, then `research/phase-1/2026-11-08-{contracts-recon,contracts-preflight,bun-1.4.4-toolchain,read-only-probe,old-reader-recon-preflight,old-reader-observations}.md`. Observations are version/environment-specific; unproved capabilities remain unproved.

## Implicit context and limits

- Plugin 2.51.0 reads only CLAUDE_CODE_SESSION_ID. Both placement and claim were attempted honestly: placement returned this existing tree; claim returned `claim: no session id; not claimed`. The native thread is `01a1be43-b195-7342-ae88-f22eb84ae7a5`. Do not invent a Claude ID, fake a session, edit shared claim records or start Phase 2 to bypass this boot limitation.
- The spec snapshot is already committed on this branch and is not on origin/main. Do not create a second worktree because old mainline metadata does not know the spec.
- Anton specifically required current Bun 1.4.4 research. Official-current docs include APIs absent here (`expect.poll`, `vi.waitFor`); native Unix WebSocket, fake timers and timeout/cleanup built-ins were locally probed. CI now uses 1.4.4. Explicit ESNext library scope exposes Bun typings without casts; @types/bun 1.4.2 already declares the used APIs. Do not claim older runtime parity.
- Native launcher survival after client disconnect was reported by its observer and ID/cwd were independently verified here. This is one observation, not complete owned worker lifecycle evidence. The implementation session did not capture an owned turn ID.
- Do not edit main source, plugin caches, personal bridges, global hooks/settings or CRM. No live installation changes, push, PR opening/publication, merge or release are authorized. Local tested commits are appropriate. Handoff did not invoke the broad tree-prune operation because this assignment permits work only in its assigned tree.

## Pick up from here

Start the remaining owned scratch-worker proof: establish a probe-owned native thread/turn and cleanup record before any write; test disconnect/reconnect, real attention, interruption acknowledgment and descendant cleanup. Synthetic decoder fixtures and direct-child Bun timeout probes do not satisfy it. Stop/park a demonstrated critical design failure rather than improvise a fallback worker runner.

Then test supported native CLI/desktop resume/installation cutover against the historical readers, and native activation/retention/loaded-version/trust in an authorized isolated probe environment. Preserve live installs. Compare the existing plugin-publish scoped marketplace upgrade → selected-plugin add → native verification; never its blanket sync. Do not select an update coordinator before this evidence.

Retain Phase 1/outward gates: no Phase 2 work, mixed writers, background crews, automatic updates or release. Update checkboxes only as actual proof completes.

## Needs you
- Parked 2026-11-08T19:58:38-08:00: Native 0.167.0 selected-plugin install evicted the previous cache with a started thread still held. Approve changing updates to stage while managed spec sessions use the old release, then activate only after a verified quiescent native cutover, with CLI/desktop reentry and trust proofs still required? · recommend: Yes: stage while old managed spec sessions remain; activate only after verified quiescence. Preserve native installation authority; do not patch caches or enable automatic activation before the remaining proofs.
