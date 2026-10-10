---
needs: [3, 4, 5, 6]
pr: A
---

# Phase 7 — The question and the babysit procedure

**Goal:** At the PR gate execute §10 asks the one question and acts on it (handoff only when unanswered); on "babysit" the handoff runs in full and then launches `/spec babysit <spec> <group>` in the PR's tree, which runs the written procedure holding a PR claim; the board shows the PR as being babysat; release 2.42.0.

**Outcome:** You answer one question per PR; a babysit tab carries it to merged and tells you once — no more pasting failing checks or watching CI, and the board doesn't ask you to merge what's being babysat · medium · risk: prose drift between execute, handoff and babysit — one procedure file, linked from both.

**Files to touch:**
- `skills/spec/babysit.md` (new), `skills/spec-babysit/SKILL.md` (new router)
- `skills/spec/SKILL.md`, `skills/spec/execute.md` (§10), `skills/spec/handoff.md`
- `skills/spec/tools/context/request.ts`, `commands/context.ts` (`PACK_MODES`), `launch/command-line.ts`, `commands/launch.ts`
- `skills/spec/tools/claims/rules.ts` (`takeRefusal`)
- `skills/spec/tools/board/joins.ts`, `board/attention.ts` (babysitting cell)
- `README.md`, `ROADMAP.md`, `.claude-plugin/plugin.json` and the other version files (`scripts/version.py`)
- tests: `skill-wiring.test.ts`, `launch.test.ts`, `claims-*.test.ts`, `request.test.ts`, `context.test.ts`, `board-attention.test.ts`

## Implementation guidance

`babysit.md` is the single written procedure, written for the agent, with the invocation table from technical.md → *How Claude Code invokes them* at the top (which Bash mode and timeout each `pr` command takes, last line = result, never `sleep`/`/loop`/cron/Monitor to wait): claim (held → print the holder, end) → log `babysit-start` → `pr open <spec> <group>` (pin the printed number) → `pr wait <n>` in background Bash → on the notification, `pr status <n>` → act by the design.md flow → loop → `pr merge <n>` → `pr log <n>` → final report (design.md copy) → release the claim. Limits: 2 re-runs per run (tool-enforced via `attempt`), 3 fix pushes, 3 hours (from `babysit-start`). Rules it must state: never push docs while CI runs; fixes go through the per-commit gate; for a test failure run `gates.ci-triage` first; fails on main too → stop and ask; merging main runs `gates.after-merge-main`; a `pr log --add` note for each triage decision; a `timeout` line, a killed wait, or a resumed session (background shells aren't restored) → read `pr log`, start a new background `pr wait`; stop and ask when the cause isn't clear. Conflicts are the exception to asking: `conflicting` (or a 405 from `pr merge`, or a `none` that `git merge-tree` shows is a conflict) → merge main, resolve, gates, push, wait again, never counted as a fix push (`ledger/decision-agent-resolves-merge-conflicts.md`).

The question lives in execute §10 with the exact copy from design.md; handoff asks it only when the PR is ready and unasked. On "babysit": run the handoff in full (commit, push/publish-docs, claim release), then `spec.ts launch babysit <spec> <group>` as the last act — never launch first, or publish-docs pushes into the babysat CI run from the same tree. The question replaces the *Next sessions* block in that message. Both link `babysit.md` instead of repeating it. Remove "never merge on your own" and "never waits" from execute §10; SKILL.md Tools → Remote describes the `pr` group.

`babysit` joins `SUB_COMMANDS` and `PACK_MODES` (decide `INFERRING_MODES`); the wiring test pins the sub-command set, Dispatch row, argument-hint and the router. `sessionLaunch` accepts a group token for `babysit` only; launch resolves the group to one of its phase ids and calls `placeTree` unchanged; if placement would cut a new tree, refuse `launch: no tree for <branch>`.

PR claims: `takeRefusal` (`claims/rules.ts:50`) accepts `pr-<group>` when some phase of the spec has `pr: <group>`. No new status rule (liveness + release); `trees/find.ts` already blocks a tree with any live claim; claims mirror to origin as usual. Board: a live `pr-<group>` claim turns that group's PR cell into `babysitting` and drops its merge/fix needs-you rows.

## Deliverables

- [ ] `pr-<group>` claims: `takeRefusal` accepts existing groups, refuses unknown ones; a live PR claim blocks placement in its tree — tests
- [ ] Board: live `pr-<group>` claim → `babysitting` PR cell, no merge/fix needs-you row — tests
- [ ] `babysit` sub-command: `SUB_COMMANDS`, `PACK_MODES`, SKILL.md set/Dispatch/argument-hint, `skills/spec-babysit/SKILL.md` router; `skill-wiring.test.ts` and pack test green
- [ ] `launch babysit <spec> <group>` resolves the group to a phase, places via `placeTree`, refuses a new tree — tests; one read-only live launch check (ledger `spec-spin-off/domain-verifying-a-terminal-launch`)
- [ ] `skills/spec/babysit.md` procedure (flow, limits, rules, report copy)
- [ ] execute §10 asks the question, handoff only when unanswered; on babysit, handoff first and `launch babysit` last; SKILL.md Remote rewritten; old "never merge"/"never waits" lines gone
- [ ] README rows, ROADMAP section + 2.42.0 row, `python3 scripts/version.py --set 2.42.0`

## Phase-local notes

- The first real babysit is this PR itself (pr-opening.md pre-PR checks).
- self-driving-loop chains sessions around this moment; its open question "stop the chain at a PR boundary?" is answered by this phase: the question is the boundary.
