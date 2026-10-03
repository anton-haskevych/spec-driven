---
date: 2026-10-02
phase: 8
chunk: claimed-tree-writes
---

# Phase 8 recon — writes in a claimed tree

*Source of record — do not edit.* One wave × 2 Explore agents (phase-exec lens). It changed the plan: see the
preflight decision `ledger/decision-controller-tab-checks-claims-no-hook.md`.

## What a guard would cost

- **Registration:** skill-frontmatter hooks only (`skills/spec/SKILL.md:6-18`): PreToolUse `lesson-recall.ts`,
  PostToolUse `spec-file-check.ts`, both `Write|Edit|MultiEdit`, both fail open (`|| true`, `try/catch`,
  exit 0). Neither denies; PreToolUse is advice only. No Bash matcher exists. `skill-wiring.test.ts:33-35`
  pins the hook count at 2.
- **Per call:** `claimsDir` = 1 `git rev-parse` (`claims/store.ts:33-36`, `core/git.ts:26-28`); `loadClaims`
  = file reads; liveness = 1 `ps` + reading `~/.claude/sessions` only when another session's claim names the
  tree (`sessions/live.ts:39-53`, `proc-starts.ts:7-12`). The tree of a path: `rev-parse --show-toplevel`
  (`board/load.ts:95-98`), realpath'd to match `claim.workspace`. Plus a bun start per call.
- **Bash:** no shell parser in the repo (zero dependencies). Anton's personal hooks have one (`shlex`) and a
  git-write detector (`~/.claude/hooks/pre-tool-use/workflow/workflow-guard.ts:96-112`) that misses `cd X &&`.
- **Closest helper:** `claims/live.ts:20-29` `heldByOthers`: no workspace filter, keyed by `spec#phase`.
  `trees/find.ts` `blockingClaim` is the exact predicate (private).

## Standing rule that applies

`docs/specs/spec-loop-automation/ledger/decision-no-bash-guard.md`: a tool earns its place only by removing a
repeated, observed failure. Prior guard design: `decision-bash-writes-denied-not-swept.md` (superseded).

## Testing-issue estimate (for the doc-only plan)

None: SKILL.md text; `skill-wiring.test.ts` doesn't assert *Session lifecycle*.
