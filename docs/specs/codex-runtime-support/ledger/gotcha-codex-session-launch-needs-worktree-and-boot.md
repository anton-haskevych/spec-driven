---
kind: gotcha
applies-to: [general]
created: 2026-11-08T20:00:00-08:00
---

# A fresh Codex session needs an explicit worktree cwd and boot context

## Proven preparation

From the authored plugin repo, `bun skills/spec/tools/spec.ts trees place codex-runtime-support 1` created the normal PR-group worktree:

- Branch: `feat/codex-runtime-support-pr-a`
- Path: `/Users/antonhaskevych/claude-worktrees/spec-driven/codex-runtime-support-pr-a`
- Base: origin/main at `22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc`

The approved spec was still untracked in the planning checkout. Worktree creation does not transfer uncommitted/untracked files. Copy its reviewed snapshot explicitly into the new branch, validate it, and commit that local handoff baseline before starting work. Never assume a clean new worktree contains a spec that was only written in another checkout.

## Native launch boundary

The available `codex_tui.create_thread` tool inherits the planning session's cwd and has no cwd argument. In a CRM-originating conversation it would start in CRM, which is wrong for this plugin task. Use a native launch surface with explicit cwd. The documented app-server sequence is initialize → initialized → thread/start `{cwd: <worktree>}` → thread/name/set → turn/start `{threadId, input: [text boot prompt]}`. Omit model/permission overrides unless the user requested them; let configured defaults apply.

For the running local daemon, a direct Unix WebSocket connection with HTTP Upgrade and the maintained `websockets` library was read-verified on Codex 0.167.0. Use the configured control socket, do not copy credentials. Plain JSONL through `codex app-server proxy` did not answer initialize in the earlier probe, so it is not the proven transport. Treat these as version/environment-specific observations, not a portable plugin implementation. Official protocol: https://learn.chatgpt.com/docs/app-server.

A boot prompt names the exact spec, phase, assigned cwd/branch, approved gate, canonical worktree skill files, review/research/ledger paths and stop rule. A short native user prompt may point to a self-contained versioned boot file; this phase's file is `in-flight/phase-1.md`.

## Verify rather than infer

Persist the new native thread ID and check thread/read's cwd, the submitted first user prompt and turn status/first progress after creation. A returned thread ID alone is not proof that the session began work. Do not accidentally create duplicates when a response times out; reconcile the recorded ID first. Disconnect survival is still a phase-1 capability proof until observed for the newly launched session.

The current 2.51.0 claim command is Claude-only. Record a missing Codex claim honestly; never fabricate CLAUDE_CODE_SESSION_ID. An explicitly assigned isolated worktree is the boot boundary for this first proof session, not a claim that mixed-runtime ownership is solved.

## This launch

Native implementation thread: `01a1be43-b195-7342-ae88-f22eb84ae7a5`. Its shell exports that value in CODEX_THREAD_ID; read-only thread/read independently matched it and the assigned worktree cwd on CLI/app-server 0.167.0. The launcher's observer reported that the session remained active after launcher disconnect and verified worktree-local commands. This is one launch observation, not full worker lifecycle proof. The owned turn ID was not captured by this implementation session.

This session's `trees place` returned the assigned existing worktree. `claim take` returned `claim: no session id; not claimed`; no shared claim was changed. Three local chunks then reached the execute stop rule. Future agents should reuse the same branch/worktree and its current in-flight boot; do not create a second tree from old mainline spec metadata.

The Phase 1 probe additionally verified native Bun 1.4.4 Unix WebSocket at the configured endpoint, so future implementation probes do not need the launcher's Python library. Keep the historical launcher observation distinct from a production adapter. The proxy timeout remains a failed proxy attempt, not proof against direct app-server stdio.
